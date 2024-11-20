const { ResponseCode } = require('../constant/status-code');
const WhatsAppManager = require('../manager/whatsapp-manager');
const { responseSuccess, responseError } = require('../utils/response');

class WhatsAppController {
  async cleanUpInactiveSessions(req, res) {
    try {
      WhatsAppManager.cleanupInactiveServices();
      responseSuccess(res, ResponseCode.Ok, 'Session cleaned successfully');
    } catch (error) {
      responseError(res, error.status);
    }
  }

  async cleanUpSession(req, res) {
    try {
      const session = req.params.session;
      await WhatsAppManager.getService(session).cleanUpSession();
      WhatsAppManager.removeSession(session);
      responseSuccess(res, ResponseCode.Ok, 'Session cleaned successfully');
    } catch (error) {
      responseError(res, error.status);
    }
  }

  async generateQrCode(req, res, next) {
    try {
      const session = req.body.sessionId;
      if (!session) {
        responseError(res, ResponseCode.BadRequest, 'Missing required sessionId');
        return;
      }
      const result = await WhatsAppManager.getService(session).generateQr();
      res.setHeader('Content-Type', 'image/png');
      res.send(result);
    } catch (error) {
      responseError(res, error.status);
    }
  }
  async generateQrCodeRaw(req, res, next) {
    try {
      const session = req.body.sessionId;
      if (!session) {
        responseError(res, ResponseCode.BadRequest, 'Missing required sessionId');
        return;
      }
      const result = await WhatsAppManager.getService(session).generateQr(true);
      responseSuccess(res, ResponseCode.Ok, 'Success', result);
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
      const activeServices = await WhatsAppManager.getSessions();
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
      const { to, type, url, caption, ptt, filename, disappearingDay } = req.body;
      const data = await WhatsAppManager.getService(session).sendMediaMessage(to, caption, type, url, ptt, filename, disappearingDay);

      return responseSuccess(res, ResponseCode.Ok, 'Message sent successfully');
    } catch (error) {
      responseError(res, error.status);
    }
  }

  async sendMessage(req, res, next) {
    try {
      const session = req.params.session;
      const { to, message, disappearingDay } = req.body;
      const data = await WhatsAppManager.getService(session).sendMessage(to, message, disappearingDay);
      return responseSuccess(res, ResponseCode.Ok, 'Message sent successfully');
    } catch (error) {
      responseError(res, error.status);
    }
  }
}

module.exports = new WhatsAppController();
