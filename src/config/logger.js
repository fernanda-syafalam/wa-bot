require('dotenv').config();
const pino = require('pino');
const fs = require('fs-extra');
const path = require('path');
const pinoPretty = require('pino-pretty');
const { multistream } = require('pino-multi-stream');

class LoggerConfig {
  constructor() {
    this.logLevels = ['info', 'error', 'warn'];
    this.streams = [];
  }

  static getLogFolderPath(level) {
    const logFolderPath = path.join(__dirname, '..', 'logs', level);
    fs.ensureDirSync(logFolderPath);
    return logFolderPath;
  }

  static getLogFilePath(level) {
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const hourStr = String(date.getHours()).padStart(2, '0');
    const logFolderPath = this.getLogFolderPath(level);

    return path.join(logFolderPath, `${dateStr}_${hourStr}.log`);
  }

  createLogStream(level) {
    const filePath = LoggerConfig.getLogFilePath(level);
    const fileStream = fs.createWriteStream(filePath, {
      flags: 'a', // Append mode
      highWaterMark: 1024 * 1024 // Buffer sebesar 1MB
    });

    const prettyOptions = {
      colorize: false, // Tidak perlu warna untuk log file
      translateTime: 'yyyy-mm-dd HH:MM:ss.l',
      ignore: 'hostname,pid',
      destination: fileStream
    };

    const prettyStream = pinoPretty(prettyOptions);

    return prettyStream;
  }

  addFileStreams() {
    if (process.env.NODE_ENV === 'production') {
      this.logLevels.forEach(level => {
        this.streams.push({
          level,
          stream: this.createLogStream(level)
        });
      });
    }
  }

  addConsoleStream() {
    if (process.env.NODE_ENV !== 'production') {
      this.streams.push({
        level: 'info',
        stream: pinoPretty({
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss.l',
          ignore: 'hostname,pid'
        })
      });
    }
  }

  getLogger() {
    this.addFileStreams();
    this.addConsoleStream();

    return pino(
      {
        level: 'info'
      },
      multistream(this.streams)
    );
  }
}

module.exports = new LoggerConfig().getLogger();
