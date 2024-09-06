const { getHealthCheck } = require('../service/health-service');

class healthController {
  async healthCheck(req, res) {
    try {
      const healthData = getHealthCheck();
      res.status(200).json({
        status: 'UP',
        data: healthData
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(503).json({
        status: 'DOWN',
        message: 'Service Unavailable',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new healthController();
