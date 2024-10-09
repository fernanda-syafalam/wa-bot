const { getStatus } = require('../controller/whatsapp-controller');

const ResponseCode = {
  Ok: '20000',
  BadRequest: '40000',
  SessionsNotFound: '40401',
  SocketNotFound: '40402',
  SocketRejected: '40001',
  Unauthorized: '40300',
  ConflictQR: '40901',
  InternalServerError: '50000',
  CleanUpFailed: '50001',
  SessionLost: '40002'
};

const ResponseCodeUtils = {
  getMessage(code) {
    const messages = {
      [ResponseCode.Ok]: 'Successful',
      [ResponseCode.BadRequest]: 'Bad Request',
      [ResponseCode.SessionsNotFound]: 'Sessions Not Found',
      [ResponseCode.SocketNotFound]: 'Socket Not Found',
      [ResponseCode.SocketRejected]: 'Socket Rejected By WhatsApp',
      [ResponseCode.SessionLost]: 'Session Expired need to terminate',
      [ResponseCode.CleanUpFailed]: 'Clean Up Failed',
      [ResponseCode.Unauthorized]: 'Unauthorized',
      [ResponseCode.ConflictQR]: 'QR already setup',
      [ResponseCode.InternalServerError]: 'Internal Server Error',
      [ResponseCode.ServiceUnavailable]: 'Service Unavailable'
    };
    return messages[code] || 'Unknown Error';
  },

  getFullCode(code) {
    const serviceCode = this.getServiceCode();
    return this.getStatusCode(code) + serviceCode + this.getCaseCode(code);
  },

  getStatusCode(code) {
    return parseInt(code.substring(0, 3));
  },

  getCaseCode(code) {
    return code.substring(3);
  }
};

Object.freeze(ResponseCode);
module.exports = { ResponseCode, ResponseCodeUtils };
