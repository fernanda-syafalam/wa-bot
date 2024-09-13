const pino = require('pino');
const { multistream } = require('pino-multi-stream');
const rfs = require('rotating-file-stream');
const path = require('path');
const pretty = require('pino-pretty');

// Fungsi untuk membuat stream rotasi file dengan pino-pretty
const pad = num => (num > 9 ? '' : '0') + num;
const generator = (time, index) => {
  if (!time) return 'init.log';

  var month = time.getFullYear() + '-' + pad(time.getMonth() + 1);
  var day = pad(time.getDate());
  var hour = pad(time.getHours());
  var minute = pad(time.getMinutes());

  return `${month}-${day}_${hour}.log`;
};
function createPrettyRotatingStream(level, folder) {
  return pretty({
    colorize: false,
    destination: rfs.createStream(generator, {
      interval: '1h', // Rotasi setiap menit
      path: path.join(__dirname, '../logs', folder) // Direktori penyimpanan berdasarkan level
    }),
    translateTime: new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date()), // Format timestamp yang lebih rapi
    ignore: 'pid,hostname' // Abaikan informasi pid dan hostname agar lebih bersih
  });
}

// Membuat multi-stream untuk menyimpan log berdasarkan level
const streams = [
  { level: 'debug', stream: createPrettyRotatingStream('debug', 'debugs') },
  { level: 'info', stream: createPrettyRotatingStream('info', 'infos') },
  { level: 'warn', stream: createPrettyRotatingStream('warn', 'warnings') },
  { level: 'error', stream: createPrettyRotatingStream('error', 'errors') }
];

// Jika dalam mode development, tambahkan stream ke console dengan pino-pretty untuk log yang lebih rapi
if (process.env.NODE_ENV === 'development') {
  streams.push({
    level: 'debug',
    stream: pretty({
      colorize: true, // Berikan warna pada output di console
      translateTime: 'yyyy-mm-dd HH:MM:ss', // Format timestamp yang lebih rapi
      ignore: 'pid,hostname' // Abaikan informasi pid dan hostname agar lebih bersih
    })
  });
}

// Membuat logger menggunakan pino
const logger = pino(
  {
    level: 'debug' // Menangani semua level log dari debug ke atas
  },
  multistream(streams)
);

// Contoh penggunaan log di dalam aplikasi
logger.error('This is an error message');
logger.warn('This is a warning message');
logger.info('This is an info message');
logger.debug('This is a debug message');

module.exports = logger;
