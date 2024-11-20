const {
  useMultiFileAuthState,
  Browsers,
  default: makeWASocket,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
  WA_DEFAULT_EPHEMERAL
} = require('@whiskeysockets/baileys');
const logger = require('../config/logger');
const QRCode = require('qrcode');
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');
const ResponseError = require('../error/response-error');
const { ResponseCode } = require('../constant/status-code');
const {
  RECONNECT_REASONS,
  CONNECT_TIMEOUT,
  KEEP_ALIVE_INTERVAL,
  RETRY_REQUEST_DELAY,
  TIME_INITIALIZATION,
  TIME_TOGENERATE_QR,
  SECONDS,
  RESTART_REASONS
} = require('../constant/whatsapp-const');
const RECONNECT_TIMEOUT = RETRY_REQUEST_DELAY * SECONDS;
const { formatReceipt, prepareMediaMessage } = require('../utils/helper');
const SESSION_DIRECTORY = path.join(__dirname, '../../', 'sessions');

const msgRetryCounterCache = new NodeCache();
const groupsCache = new NodeCache({ stdTTL: 60 * 5 });

class WhatsAppService {
  constructor(session) {
    this.session = session;
    this.socket = null;
    this.isInitialized = false;
    this.connectionStatus = 'close';
    this.qrCode = undefined;
    this.isScanRequired = true;
    this.sessionPath = path.join(SESSION_DIRECTORY, this.session);
    this.needTerminate = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
      const { version } = await fetchLatestBaileysVersion();

      this.socket = this.createSocket(state, version);

      this.socket.ev.on('connection.update', this.handleConnectionUpdate.bind(this));
      this.socket.ev.on('creds.update', saveCreds);

      this.isInitialized = true;
      logger.info(`WhatsApp socket isInitialized for session: ${this.session}`);
    } catch (error) {
      logger.error(`Failed to initialize WhatsApp socket for session: ${this.session}, Error: ${error.message}`);
    }
  }

  createSocket(state, version) {
    try {
      return makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        logger,
        printQRInTerminal: false,
        browser: Browsers.macOS('Desktop'),
        connectTimeoutMs: CONNECT_TIMEOUT * SECONDS,
        keepAliveIntervalMs: KEEP_ALIVE_INTERVAL * SECONDS,
        retryRequestDelayMs: RETRY_REQUEST_DELAY * SECONDS,
        generateHighQualityLinkPreview: true,
        fireInitQueries: false,
        msgRetryCounterCache
      });
    } catch (error) {
      logger.error(`Failed to create WhatsApp socket for session: ${this.session}, Error: ${error.message}`);
    }
  }

  cleanUpSession() {
    try {
      logger.info(`Cleaning up session: ${this.session}`);
      this.logoutAndRemoveSocket();
      this.deleteSessionPath();

      this.isInitialized = false;
    } catch (error) {
      logger.error(`Error during session cleanup for ${this.session}: ${error.message}`);
      throw new ResponseError(ResponseCode.CleanUpFailed, 'Session cleanup error');
    }
  }

  async logoutAndRemoveSocket() {
    try {
      if (this.socket) {
        await this.socket.logout();
        this.socket = null;
      }
    } catch (error) {
      logger.error(`Failed to logout and remove socket for ${this.session}: ${error.message}`);
    }
  }

  deleteSessionPath() {
    console.log('🚀 ~ WhatsAppService ~ deleteSessionPath ~ fs.existsSync(this.sessionPath):', fs.existsSync(this.sessionPath));
    if (fs.existsSync(this.sessionPath)) {
      fs.rm(this.sessionPath, { recursive: true }, err => {
        if (err) {
          logger.error(`Failed to delete session files for ${this.session}: ${err.message}`);
        } else {
          logger.info(`Session files deleted successfully for ${this.session}`);
        }
      });
    } else {
      logger.warn(`Session files for ${this.session} do not exist.`);
    }
  }

  async handleConnectionUpdate(update) {
    try {
      const { connection, lastDisconnect, qr } = update;
      this.qrCode = qr;
      this.isScanRequired = !!qr;

      if (connection === 'close') {
        this.handleConnectionClose(lastDisconnect);
      } else if (connection === 'open') {
        this.connectionStatus = 'open';
        logger.info(`Connection established for session: ${this.session}`);
      } else if (connection === 'connecting') {
        this.connectionStatus = 'connecting';
      }
    } catch (error) {
      logger.error(`Error handling connection update for session: ${this.session}, Error: ${error.message}`);
    }
  }

  async handleConnectionClose(lastDisconnect) {
    try {
      this.connectionStatus = 'close';
      const lastDisconnectCode = lastDisconnect?.error?.output?.statusCode;
      logger.info(`Connection closed for session: ${this.session}, Reason: ${lastDisconnectCode}`);

      if (RESTART_REASONS.includes(lastDisconnectCode)) {
        logger.info(`Restarting session for ${this.session} due to disconnect reason: ${lastDisconnectCode}`);
        this.isInitialized = false;
        await this.initialize();
        logger.info(`Restarted session for ${this.session}`);
      } else if (RECONNECT_REASONS.includes(lastDisconnectCode)) {
        logger.info(`Reconnecting for session: ${this.session}`);
        this.needTerminate = true;
        // await this.initialize();
      } else {
        logger.error(`Unhandled disconnect reason: ${lastDisconnectCode} for session: ${this.session}`);
      }
    } catch (error) {
      logger.error(`Error handling connection close for session: ${this.session}, Error: ${error.message}`);
    }
  }

  async ensureConnection() {
    if (this.connectionStatus === 'open') return;
    if (this.needTerminate) {
      throw new ResponseError(ResponseCode.SessionLost);
    }
    try {
      this.validateSessions();
      await this.reconnect();
      this.validateSocket();
    } catch (error) {
      logger.error(`Error ensuring connection for ${this.session}: ${error.message}`);
    }
  }

  validateSessions() {
    if (this.needTerminate) {
      throw new ResponseError(ResponseCode.SessionLost);
    }

    if (!fs.existsSync(this.sessionPath)) {
      throw new ResponseError(ResponseCode.SessionsNotFound, 'Session not isInitialized');
    }
  }

  async checkIsConnectionOpen() {
    if (this.connectionStatus !== 'open') {
      await this.ensureConnection();
      this.validateSocket();
    }
  }

  async reconnect() {
    if (!this.isInitialized) {
      logger.warn(`Socket not isInitialized for session: ${this.session}, reconnecting...`);
      await this.initialize();
      await new Promise(resolve => setTimeout(resolve, RECONNECT_TIMEOUT));
    }
  }

  validateSocket() {
    if (this.needTerminate) {
      throw new ResponseError(ResponseCode.SessionLost);
    }
    if (!this.socket) {
      throw new ResponseError(ResponseCode.SocketNotFound, 'Socket not isInitialized');
    }
  }

  async getAllGroups() {
    await this.ensureConnection();

    try {
      const cachedGroups = groupsCache.get(`groups_${this.session}`);
      if (cachedGroups) return cachedGroups;

      const groups = await this.socket.groupFetchAllParticipating();
      const groupsList = Object.values(groups);

      groupsCache.set(`groups_${this.session}`, groupsList);
      return groupsList;
    } catch (error) {
      logger.error(`Failed to retrieve groups for session: ${this.session}, Error: ${error.message}`);
      throw new ResponseError(ResponseCode.SocketRejected);
    }
  }

  async generateQr(raw = false) {
    if (this.needTerminate) {
      throw new ResponseError(ResponseCode.SessionLost);
    }

    if (this.connectionStatus !== 'open') {
      console.log('🚀 ~ WhatsAppService ~ generateQr ~ this.connectionStatus:', this.connectionStatus);
      await this.reconnect();
    }

    this.checkIsScanRequired();
    try {
      while (!this.qrCode) {
        await new Promise(resolve => setTimeout(resolve, TIME_TOGENERATE_QR * SECONDS));
      }
      if (raw) return this.qrCode;
      return await QRCode.toBuffer(this.qrCode);
    } catch (error) {
      throw new ResponseError(ResponseCode.InternalServerError);
    }
  }

  checkIsScanRequired() {
    if (!this.isScanRequired) {
      throw new ResponseError(ResponseCode.ConflictQR);
    }
  }

  async getStatus() {
    await this.checkIsConnectionOpen();

    return {
      status: ResponseCode.Ok,
      message: 'Active',
      value: true
    };
  }

  async sendMessage(recipient, message, disappearingDay = 0) {
    await this.checkIsConnectionOpen();
    try {
      await this.socket.sendMessage(formatReceipt(recipient), this.formatTextMessage(message), {
        ephemeralExpiration: disappearingDay * 24 * 60 * 60
      });
      return 'Message sent successfully';
    } catch (error) {
      logger.error(`Failed to send message to ${recipient}, Error: ${error.message}`);
      throw new ResponseError(ResponseCode.InternalServerError);
    }
  }

  formatTextMessage(message) {
    return { text: message };
  }

  async sendMediaMessage(recipient, caption, type, url, isPTT, fileName, disappearingDay = 0) {
    await this.checkIsConnectionOpen();
    try {
      const formattedRecipient = formatReceipt(recipient);

      if (type === 'audio') {
        return await this.sendAudioMessage(formattedRecipient, url, isPTT);
      }

      const mediaMessage = await prepareMediaMessage(this.socket, {
        caption: caption || '',
        fileName: fileName || '',
        media: url,
        mediatype: type !== 'video' && type !== 'image' ? 'document' : type
      });

      const forwardMessage = { ...mediaMessage.message };
      return await this.socket.sendMessage(
        formattedRecipient,
        {
          forward: {
            key: {
              remoteJid: this.socket.user.id.replace(/:\d+/, ''),
              fromMe: true
            },
            message: forwardMessage
          }
        },
        {
          ephemeralExpiration: disappearingDay * 24 * 60 * 60
        }
      );
    } catch (error) {
      throw new ResponseError(ResponseCode.InternalServerError, `Failed to send media to ${recipient}`);
    }
  }

  async sendAudioMessage(recipient, url, isPTT) {
    return this.socket.sendMessage(recipient, {
      audio: { url },
      ptt: isPTT,
      mimetype: 'audio/mpeg'
    });
  }
}

module.exports = WhatsAppService;
