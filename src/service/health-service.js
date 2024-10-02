const os = require('os');

const MB_DIVISOR = 1024 * 1024;

const getUptime = () => {
  const uptimeSeconds = Math.floor(process.uptime());
  const uptimeMinutes = Math.floor(uptimeSeconds / 60);
  const remainingSeconds = uptimeSeconds % 60;
  return `${uptimeMinutes} minutes, ${remainingSeconds} seconds`;
};

const getMemoryUsage = () => {
  const memoryUsage = process.memoryUsage();
  return {
    rss: `${(memoryUsage.rss / MB_DIVISOR).toFixed(2)} MB`,
    heapTotal: `${(memoryUsage.heapTotal / MB_DIVISOR).toFixed(2)} MB`,
    heapUsed: `${(memoryUsage.heapUsed / MB_DIVISOR).toFixed(2)} MB`,
    external: `${(memoryUsage.external / MB_DIVISOR).toFixed(2)} MB`
  };
};

const getLoadAverage = () => {
  const loadAvg = os.loadavg();
  return {
    '1min': loadAvg[0].toFixed(2),
    '5min': loadAvg[1].toFixed(2),
    '15min': loadAvg[2].toFixed(2)
  };
};

const getHealthCheck = () => {
  return {
    uptime: getUptime(),
    timestamp: new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta'
    }),
    memoryUsage: getMemoryUsage(),
    platform: os.platform(),
    nodeVersion: process.version,
    cpuCount: os.cpus().length,
    totalMemory: `${(os.totalmem() / MB_DIVISOR).toFixed(2)} MB`,
    loadAverage: getLoadAverage()
  };
};

module.exports = { getHealthCheck };
