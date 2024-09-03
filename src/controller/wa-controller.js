const { STATUS_CODE } = require('../constant/status-code');
const waServiceManager = require('../manager/wa-manager');
const { responseSuccess, responseError } = require('../utils/response');

class WaController {
  async cleanup(req, res) {
    try {
      const phoneNumber = req.params.phoneNumber;
      const data = await waServiceManager[phoneNumber].cleanup();
      responseSuccess(res, STATUS_CODE.HTTP_SUCCESS, data);
    } catch (error) {
      responseError(res, error.message, error.status);
    }
  }

  async generateQr(req, res, next) {
    try {
      const phoneNumber = req.params.phoneNumber;
      const result = await waServiceManager[phoneNumber].generateQr();
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
      const phoneNumber = req.params.phoneNumber;
      const status = await waServiceManager[phoneNumber].getStatus();
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
      const phoneNumber = req.params.phoneNumber;
      const groups = await waServiceManager[phoneNumber].getAllGroups();
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
      const phoneNumber = req.params.phoneNumber;
      waServiceManager.removeService(phoneNumber);
      responseSuccess(res, STATUS_CODE.HTTP_SUCCESS, `Service for ${phoneNumber} removed successfully`);
    } catch (error) {
      responseError(res, error.message, error.status);
    }
  }

  async sendMessage(req, res, next) {
    try {
      const phoneNumber = req.params.phoneNumber;
      const { to, message } = req.body;
      const data = await waServiceManager[phoneNumber].sendMessage(to, message);
      return responseSuccess(res, STATUS_CODE.HTTP_SUCCESS, data);
    } catch (error) {
      responseError(res, error.message, error.status);
    }
  }
}

module.exports = new WaController();
