const WhatsAppService = require('../service/whatsapp-service');
const logger = require('../config/logger');

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
      this.services[session].cleanup();
      delete this.services[session];
    }
  }

  getActiveServices() {
    return Object.keys(this.services);
  }

  cleanupInactiveServices() {
    try {
      Object.entries(this.services).forEach(async ([session, service]) => {
        const status = await service.getStatus();
        if (!status.value) {
          logger.info(`Removing inactive WhatsApp instance for ${session}`);
          this.removeService(session);
        }
      });
    } catch (error) {
      // ignore
    }
  }
}

module.exports = new WhatsAppManager();
