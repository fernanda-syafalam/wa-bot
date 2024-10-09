const WhatsAppService = require('../service/whatsapp-service');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');
const SESSION_DIRECTORY = path.join(__dirname, '../../', 'sessions');

class WhatsAppManager {
  constructor() {
    this.services = {};
  }

  getService(session) {
    if (session in this.services) {
      return this.services[session];
    }

    logger.info(`Creating new WhatsApp instance for ${session}`);
    const service = new WhatsAppService(session);
    this.services[session] = service;
    return service;
  }

  removeService(session) {
    if (session in this.services) {
      this.services[session].cleanUpSession();
      delete this.services[session];
    }
  }

  getActiveServices() {
    return Object.keys(this.services);
  }

  async cleanupInactiveServices() {
    try {
      const sessions = await this.getSessions();
      console.log('🚀 ~ WhatsAppManager ~ cleanupInactiveServices ~ sessions:', sessions);
      await Promise.all(sessions.map(this.cleanupSession.bind(this)));
    } catch (error) {
      logger.error(`Error during cleanupInactiveServices: ${error.message}`);
    }
  }

  async getSessions() {
    try {
      return new Promise((resolve, reject) => {
        fs.readdir(SESSION_DIRECTORY, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    } catch (error) {
      logger.error(`Error during getSessions: ${error.message}`);
      return [];
    }
  }

  async cleanupSession(session) {
    const sessionPath = this.getSessionPath(session);

    if (this.isServiceActive(session)) {
      await this.handleActiveService(session, sessionPath);
    } else {
      await this.handleInactiveService(session, sessionPath);
    }
  }

  isServiceActive(session) {
    return Boolean(this.services[session]);
  }

  async handleActiveService(session, sessionPath) {
    try {
      const status = await this.services[session].getStatus();
      if (!status || status === 'inactive') {
        await this.removeServiceAndSession(session, sessionPath);
      }
    } catch (error) {
      logger.error(`Error fetching status for session: ${session}`, error);
      await this.removeServiceAndSession(session, sessionPath);
    }
  }

  async handleInactiveService(session, sessionPath) {
    logger.info(`Service not found for session: ${session}. Removing...`);
    await this.removeServiceAndSession(session, sessionPath);
  }

  async removeServiceAndSession(session, sessionPath) {
    this.removeService(session);
    this.deleteSessionFolder(sessionPath);
  }

  deleteSessionFolder(sessionPath) {
    fs.rm(sessionPath, { recursive: true }, err => {
      if (err) {
        logger.error(`Failed to delete session files for ${this.session}: ${err.message}`);
      } else {
        logger.info(`Session files deleted successfully for ${this.session}`);
      }
    });
    logger.info(`Session folder deleted successfully for ${sessionPath}`);
  }

  getSessionPath(session) {
    return path.join(SESSION_DIRECTORY, session);
  }
}

module.exports = new WhatsAppManager();
