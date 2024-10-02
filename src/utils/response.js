const { ResponseCodeUtils } = require('../constant/status-code');

const responseSuccess = (res, responseCode = 200, message, data = null) => {
  return res.status(200).json({
    code: responseCode,
    message,
    data
  });
};

const responseError = (res, responseCode = '') => {
  return res.status(ResponseCodeUtils.getStatusCode(responseCode)).json({
    code: responseCode,
    message: ResponseCodeUtils.getMessage(responseCode)
  });
};

module.exports = { responseError, responseSuccess };
