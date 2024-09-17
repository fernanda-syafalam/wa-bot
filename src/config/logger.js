const pino = require('pino');
const { multistream } = require('pino-multi-stream');
const rfs = require('rotating-file-stream');
const path = require('path');
const pretty = require('pino-pretty');

const pad = num => (num > 9 ? '' : '0') + num;
const generator = (time, index) => {
  if (!time) return 'latest.log';

  const date = new Date(time.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const month = date.getFullYear() + '-' + pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours() - 1);
  const minute = pad(date.getMinutes());

  return `${month}-${day}_${hour}.log`;
};

function createRotatingStream(folder) {
  return rfs.createStream(generator, {
    interval: '1h',
    path: path.join(__dirname, '../logs', folder)
  });
}

const streams = [
  { level: 'debug', stream: createRotatingStream('debugs') },
  { level: 'info', stream: createRotatingStream('infos') },
  { level: 'warn', stream: createRotatingStream('warnings') },
  { level: 'error', stream: createRotatingStream('errors') }
];

if (process.env.NODE_ENV === 'development') {
  streams.push({
    level: 'debug',
    stream: pretty({
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname'
    })
  });
}

const logger = pino(
  {
    level: 'debug',
    formatters: {
      level(label) {
        return { level: label.toUpperCase() };
      }
    },
    base: null,
    timestamp: () =>
      `,"timestamp":"${new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta'
      })}"`
  },
  multistream(streams)
);

logger.error('This is an error message');
logger.warn('This is a warning message');
logger.info('This is an info message');
logger.debug('This is a debug message');

module.exports = logger;
