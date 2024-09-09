const WaService = require('../service/wa-service');
const logger = require('../config/logger');

class WaServiceManager {
  constructor() {
    this.services = {};
    return new Proxy(this, {
      get: (target, token) => {
        if (token in target && typeof target[token] === 'function') {
          return target[token].bind(target);
        }

        if (typeof token === 'string' && token in target.services) {
          return target.services[token];
        }

        if (typeof token === 'string') {
          logger.info(`Creating new WaService instance for ${token}`);
          const service = new WaService(token);
          target.services[token] = service;
          return service;
        }

        return undefined;
      }
    });
  }

  removeService(token) {
    if (this.services[token]) {
      this.services[token].cleanup();
      delete this.services[token];
    }
  }

  getActiveServices() {
    return Object.keys(this.services);
  }

  cleanupInactiveServices() {
    try {
      Object.entries(this.services).forEach(async ([token, service]) => {
        const status = await service.getStatus();
        if (!status.value) {
          logger.info(`Removing inactive WaService instance for ${token}`);
          this.removeService(token);
        }
      });
    } catch (error) {}
  }
}

module.exports = new WaServiceManager();
