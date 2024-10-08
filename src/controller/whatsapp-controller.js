const { ResponseCode } = require('../constant/status-code');
const WhatsAppManager = require('../manager/whatsapp-manager');
const { responseSuccess, responseError } = require('../utils/response');

class WhatsAppController {
  async cleanup(req, res) {
    try {
      const session = req.params.session;
      const data = await WhatsAppManager.getService(session).cleanup();
      WhatsAppManager.cleanupInactiveServices();
      responseSuccess(res, ResponseCode.Ok, data);
    } catch (error) {
      responseError(res, error.status);
    }
  }

  async generateQr(req, res, next) {
    try {
      const session = req.params.session;
      const result = await WhatsAppManager.getService(session).generateQr();
      res.setHeader('Content-Type', 'image/png');
      res.send(result);
    } catch (error) {
      responseError(res, error.status);
    }
  }

  async getAllGroups(req, res) {
    try {
      const session = req.params.session;
      const groups = await WhatsAppManager.getService(session).getAllGroups();
      responseSuccess(res, ResponseCode.Ok, 'Success', groups);
    } catch (error) {
      responseError(res, error.status);
    }
  }

  async getStatus(req, res) {
    try {
      const session = req.params.session;
      const data = await WhatsAppManager.getService(session).getStatus();
      responseSuccess(res, data.status, data.message);
    } catch (error) {
      responseError(res, error.status);
    }
  }

  async listActiveServices(req, res) {
    try {
      const activeServices = WhatsAppManager.getActiveServices();
      responseSuccess(res, ResponseCode.Ok, 'Success', activeServices);
    } catch (error) {
      responseError(res, error.status);
    }
  }

  async removeService(req, res) {
    try {
      const session = req.params.session;
      WhatsAppManager.removeService(session);
      responseSuccess(res, ResponseCode.Ok, `Service for ${session} removed successfully`);
    } catch (error) {
      responseError(res, error.status);
    }
  }

  removeInactiveServices() {
    WhatsAppManager.cleanupInactiveServices();
  }

  async sendMedia(req, res, next) {
    try {
      const session = req.params.session;
      const { to, type, url, caption, ptt, filename } = req.body;
      const data = await WhatsAppManager.getService(session).sendMedia(to, caption, type, url, ptt, filename);

      return responseSuccess(res, ResponseCode.Ok, 'Message sent', data);
    } catch (error) {
      responseError(res, error.status);
    }
  }

  async sendMessage(req, res, next) {
    try {
      const session = req.params.session;
      const { to, message } = req.body;
      const data = await WhatsAppManager.getService(session).sendMessage(to, message);
      return responseSuccess(res, ResponseCode.Ok, data);
    } catch (error) {
      responseError(res, error.status);
    }
  }
}

module.exports = new WhatsAppController();
