const { STATUS_CODE } = require('../constant/status-code');
const waServiceManager = require('../manager/wa-manager');
const { responseSuccess, responseError } = require('../utils/response');

class WaController {
  async cleanup(req, res) {
    try {
      const session = req.params.session;
      const data = await waServiceManager[session].cleanup();
      responseSuccess(res, STATUS_CODE.HTTP_SUCCESS, data);
    } catch (error) {
      responseError(res, error.message, error.status);
    }
  }

  async generateQr(req, res, next) {
    try {
      const session = req.params.session;
      const result = await waServiceManager[session].generateQr();
      if (result.message) {
        responseSuccess(res, STATUS_CODE.HTTP_SUCCESS, result.message);
        return;
      }

      res.setHeader('Content-Type', 'image/png');
      res.send(result);
    } catch (error) {
      responseError(res, error.message, error.status);
    }
  }

  async getStatus(req, res) {
    try {
      const session = req.params.session;
      const status = await waServiceManager[session].getStatus();
      if (status) {
        responseSuccess(res, STATUS_CODE.HTTP_SUCCESS, 'Active');
      } else {
        responseSuccess(res, STATUS_CODE.HTTP_PRECONDITION_FAILED, 'Inactive');
      }
    } catch (error) {
      responseError(res, error.message, error.status);
    }
  }

  async getAllGroups(req, res) {
    try {
      const session = req.params.session;
      const groups = await waServiceManager[session].getAllGroups();
      responseSuccess(res, STATUS_CODE.HTTP_SUCCESS, 'Success', groups);
    } catch (error) {
      responseError(res, error.message, error.status);
    }
  }

  async listActiveServices(req, res) {
    try {
      const activeServices = waServiceManager.getActiveServices();
      responseSuccess(res, STATUS_CODE.HTTP_SUCCESS, 'Success', activeServices);
    } catch (error) {
      responseError(res, error.message, error.status);
    }
  }

  async removeService(req, res) {
    try {
      const session = req.params.session;
      waServiceManager.removeService(session);
      responseSuccess(res, STATUS_CODE.HTTP_SUCCESS, `Service for ${session} removed successfully`);
    } catch (error) {
      responseError(res, error.message, error.status);
    }
  }

  async removeInactiveServices(req, res) {
    try {
      waServiceManager.cleanupInactiveServices();
      responseSuccess(res, STATUS_CODE.HTTP_SUCCESS, 'Success');
    } catch (error) {
      responseError(res, error.message, error.status);
    }
  }

  async sendMessage(req, res, next) {
    try {
      const session = req.params.session;
      const { to, message } = req.body;
      const data = await waServiceManager[session].sendMessage(to, message);
      return responseSuccess(res, STATUS_CODE.HTTP_SUCCESS, data);
    } catch (error) {
      responseError(res, error.message, error.status);
    }
  }
}

module.exports = new WaController();
