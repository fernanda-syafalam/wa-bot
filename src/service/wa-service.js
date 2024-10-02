const {
  useMultiFileAuthState,
  Browsers,
  default: makeWASocket,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const logger = require('../config/logger');
const { Boom } = require('@hapi/boom');
const QRCode = require('qrcode');
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');
const ResponseError = require('../error/response-error');
const { ResponseCode } = require('../constant/status-code');
const {
  RECONNECT_REASONS,
  RESTART_SESSION_REASONS,
  CONNECT_TIMEOUT,
  KEEP_ALIVE_INTERVAL,
  RETRY_REQUEST_DELAY,
  TIME_INITIALIZATION,
  TIME_TOGENERATE_QR,
  SECONDS
} = require('../constant/wa-const');
const { formatReceipt, prepareMediaMessage } = require('../utils/helper');

const msgRetryCounterCache = new NodeCache();
const groupsCache = new NodeCache({ stdTTL: 60 * 5 });

class WaService {
  constructor(session) {
    this.session = session;
    this.sock = null;
    this.initialized = false;
    this.connectionStatus = 'close';
    this.qr = undefined;
    this.needToScan = false;
    this.sessionPath = path.join(__dirname, '../../', 'sessions', this.session);
  }

  async init() {
    if (this.initialized) return;

    try {
      const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, '../../', 'sessions', this.session));
      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        logger,
        printQRInTerminal: false,
        browser: Browsers.macOS('Chrome', 'Safari'),
        connectTimeoutMs: CONNECT_TIMEOUT * SECONDS,
        keepAliveIntervalMs: KEEP_ALIVE_INTERVAL * SECONDS,
        retryRequestDelayMs: RETRY_REQUEST_DELAY * SECONDS,
        generateHighQualityLinkPreview: true,
        fireInitQueries: false,
        msgRetryCounterCache
      });

      this.sock.ev.on('connection.update', this.connectionUpdateHandler.bind(this));
      this.sock.ev.on('creds.update', saveCreds);

      this.initialized = true;
      logger.info(`WhatsApp socket initialized for ${this.session}`);
    } catch (error) {
      logger.error(`Failed to initialize WhatsApp socket for ${this.session}: ${error.message}`);
      // throw new ResponseError(ResponseCode.SocketRejected);
    }
  }

  cleanup() {
    try {
      if (this.sock) {
        this.sock.logout();
        this.sock = null;
      }

      const sessionPath = this.sessionPath;
      if (fs.existsSync(sessionPath)) {
        fs.rm(sessionPath, { recursive: true }, err => {
          if (err) {
            logger.error(`Error during cleanup for ${this.session}: ${err.message}`);
          }
        });

        logger.info(`Session for ${this.session} cleaned up successfully`);
      } else {
        logger.warn(`Session path ${sessionPath} does not exist, nothing to clean up.`);
      }

      this.initialized = false;
    } catch (error) {
      logger.error(`Error during cleanup for ${this.session}: ${error.message}`);
      throw new ResponseError(ResponseCode.CleanUpFailed, 'Cleanup error');
    }
  }

  connectionUpdateHandler(update) {
    try {
      const { connection, lastDisconnect, qr } = update;
      this.qr = qr;
      this.needToScan = !!qr;

      if (connection === 'close') {
        this.connectionStatus = 'close';
        const lastDisconnectCode = lastDisconnect?.error?.output?.statusCode;
        logger.info(`Connection status for ${this.session}: ${connection}, lastDisconnectCode: ${lastDisconnectCode}`);

        if (RECONNECT_REASONS.includes(lastDisconnectCode)) {
          logger.info(`Attempting to reconnect for ${this.token}...`);
          this.initialized = false;
          this.init();
        } else if (RESTART_SESSION_REASONS.includes(lastDisconnectCode)) {
          logger.info(`Restarting session for ${this.token} due to disconnect reason ${lastDisconnectCode}...`);
          this.cleanup();
          this.init();
        } else {
          logger.error(`Unhandled disconnect reason: ${lastDisconnectCode} for ${this.token}`);
        }
      } else if (connection === 'open') {
        this.connectionStatus = 'open';
        logger.info(`Connection established for ${this.token}`);
      } else if (connection === 'connecting') {
        this.connectionStatus = 'connecting';
      }
    } catch (error) {
      logger.error(`Error handling connection update for ${this.token}: ${error.message}`);
    }
  }

  async ensureConnection() {
    try {
      if (!fs.existsSync(this.sessionPath)) {
        console.log(`Session file not found for ${this.token}`);
        throw new ResponseError(ResponseCode.SessionsNotFound, 'Session not initialized');
      }

      if (!this.initialized) {
        console.log(`Socket not initialized or inactive for ${this.token}`);
        logger.warn(`Socket not initialized or inactive for ${this.token}, attempting to reconnect...`);
        await this.init();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!this.sock) {
        console.log(`Socket not found for ${this.token}`);
        throw new ResponseError(ResponseCode.SocketNotFound, 'Socket not initialized');
      }
    } catch (error) {
      logger.error(`Error ensuring connection for ${this.token}: ${error.message}`);
    }
  }

  async getAllGroups() {
    await this.ensureConnection();

    if (!this.sock) {
      throw new ResponseError(ResponseCode.SocketNotFound, 'Socket not found');
    }

    try {
      const cachedGroups = groupsCache.get(`groups_${this.token}`);
      if (cachedGroups) {
        return cachedGroups;
      }

      const groups = await this.sock.groupFetchAllParticipating();

      const groupsList = Object.entries(groups)
        .slice(0)
        .map(groupEntry => groupEntry[1]);

      groupsCache.set(`groups_${this.token}`, groupsList);

      return groupsList;
    } catch (error) {
      logger.error(`Failed to get all groups for ${this.token}: ${error.message}`);
      throw new ResponseError(ResponseCode.SocketRejected);
    }
  }

  async generateQr() {
    if (!this.initialized) {
      logger.warn(`Socket not initialized or inactive for ${this.token}, attempting to reconnect...`);
      await this.init();
      await new Promise(resolve => setTimeout(resolve, TIME_INITIALIZATION * SECONDS));
    }

    if (!this.sock) {
      throw new ResponseError(ResponseCode.SocketNotFound);
    }

    while (!this.qr) {
      logger.info(`Waiting to generate QR code for ${this.token}`);

      if (!this.needToScan) {
        if (this.connectionStatus === 'close') {
          this.cleanup();
          return { message: 'Try again!' };
        }
        logger.info(`QR code not needed for ${this.token}`);
        throw new ResponseError(ResponseCode.ConflictQR);
      }

      await new Promise(resolve => setTimeout(resolve, TIME_TOGENERATE_QR * SECONDS));
    }

    return QRCode.toBuffer(this.qr);
  }

  async getStatus() {
    const isOpen = this.connectionStatus === 'open';

    if (!fs.existsSync(this.sessionPath)) {
      throw new ResponseError(ResponseCode.SessionsNotFound);
    }

    if (!this.initialized) {
      logger.warn(`Socket not initialized or inactive for ${this.token}, attempting to reconnect...`);
      await this.init();
      await new Promise(resolve => setTimeout(resolve, TIME_INITIALIZATION * SECONDS));
    }

    if (!this.sock !== null) {
      throw new ResponseError(ResponseCode.SocketNotFound);
    }

    if (!isOpen) {
      throw new ResponseError(ResponseCode.SocketRejected);
    }

    return {
      status: ResponseCode.Ok,
      message: 'Active',
      value: true
    };
  }

  async sendMessage(to, message) {
    await this.ensureConnection();

    if (!this.sock) {
      throw new ResponseError(ResponseCode.SocketNotFound);
    }

    try {
      await this.sock.sendMessage(formatReceipt(to), {
        text: message
      });

      return 'Message sent successfully';
    } catch (error) {
      logger.error(`Failed to send message from ${this.token} to ${to}: ${error.message}`);
      // if (this.connectionStatus !== 'open') {
      //   throw new ResponseError(ResponseCode.SocketRejected);
      // }
      // throw new ResponseError(ResponseCode.InternalServerError);
    }
  }

  async sendMedia(to, caption, type, url, ptt, filename) {
    await this.ensureConnection();

    if (!this.sock) {
      throw new ResponseError(ResponseCode.SocketNotFound);
    }

    try {
      const formattedRecipient = formatReceipt(to);
      let userId = this.sock.user.id.replace(/:\d+/, '');

      if (type === 'audio') {
        return await this.sock.sendMessage(formattedRecipient, {
          audio: { url: url },
          ptt: true,
          mimetype: 'audio/mpeg'
        });
      }

      const mediaMessage = await prepareMediaMessage(this.sock, {
        caption: caption ? caption : '',
        fileName: filename ? filename : '',
        media: url,
        mediatype: type !== 'video' && type !== 'image' ? 'document' : type
      });

      const forwardMessage = { ...mediaMessage.message };

      const result = await this.sock.sendMessage(formattedRecipient, {
        forward: {
          key: {
            remoteJid: userId,
            fromMe: true
          },
          message: forwardMessage
        }
      });

      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = WaService;
