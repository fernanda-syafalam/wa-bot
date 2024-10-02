const logger = require('../config/logger');
const { getHealthCheck } = require('../service/health-service');

class healthController {
  async healthCheck(req, res) {
    try {
      const healthData = getHealthCheck();
      res.status(200).json({
        code: '20000',
        message: 'UP',
        data: healthData
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        code: '50301',
        message: 'Service Unavailable',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new healthController();
