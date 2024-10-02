const { ResponseCode } = require('../constant/status-code');
const waServiceManager = require('../manager/wa-manager');
const { responseSuccess, responseError } = require('../utils/response');

class WaController {
  async cleanup(req, res) {
    try {
      const session = req.params.session;
      const data = await waServiceManager[session].cleanup();
      waServiceManager.cleanupInactiveServices();
      responseSuccess(res, ResponseCode.Ok, data);
    } catch (error) {
      responseError(res, error.status);
    }
  }

  async generateQr(req, res, next) {
    try {
      const session = req.params.session;
      const result = await waServiceManager[session].generateQr();
      if (result.message) {
        responseSuccess(res, ResponseCode.Ok, result.message);
        return;
      }

      res.setHeader('Content-Type', 'image/png');
      res.send(result);
    } catch (error) {
      responseError(res, error.status);
    }
  }

  async getAllGroups(req, res) {
    try {
      const session = req.params.session;
      const groups = await waServiceManager[session].getAllGroups();
      responseSuccess(res, ResponseCode.Ok, 'Success', groups);
    } catch (error) {
      responseError(res, error.status);
    }
  }

  async getStatus(req, res) {
    try {
      const session = req.params.session;
      const data = await waServiceManager[session].getStatus();
      responseSuccess(res, data.status, data.message);
    } catch (error) {
      responseError(res, error.status);
    }
  }

  async listActiveServices(req, res) {
    try {
      const activeServices = waServiceManager.getActiveServices();
      responseSuccess(res, ResponseCode.Ok, 'Success', activeServices);
    } catch (error) {
      responseError(res, error.status);
    }
  }

  async removeService(req, res) {
    try {
      const session = req.params.session;
      waServiceManager.removeService(session);
      responseSuccess(res, ResponseCode.Ok, `Service for ${session} removed successfully`);
    } catch (error) {
      responseError(res, error.status);
    }
  }

  removeInactiveServices() {
    waServiceManager.cleanupInactiveServices();
  }

  async sendMedia(req, res, next) {
    try {
      const session = req.params.session;
      const { to, type, url, caption, ptt, filename } = req.body;
      const data = await waServiceManager[session].sendMedia(to, caption, type, url, ptt, filename);

      return responseSuccess(res, ResponseCode.Ok, 'Message sent', data);
    } catch (error) {
      responseError(res, error.status);
    }
  }

  async sendMessage(req, res, next) {
    try {
      const session = req.params.session;
      const { to, message } = req.body;
      const data = await waServiceManager[session].sendMessage(to, message);
      return responseSuccess(res, ResponseCode.Ok, data);
    } catch (error) {
      responseError(res, error.status);
    }
  }
}

module.exports = new WaController();
