require('dotenv').config();
const pino = require('pino');
const fs = require('fs-extra');
const path = require('path');
const pinoPretty = require('pino-pretty');
const rfs = require('rotating-file-stream');

class LoggerConfig {
  constructor() {
    this.logLevels = ['info', 'error', 'warn'];
    this.streams = [];
  }

  getLogFolderPath(level) {
    const logFolderPath = path.join(__dirname, '..', 'logs', level);
    fs.ensureDirSync(logFolderPath);
    return logFolderPath;
  }

  getCurrentHour() {
    const date = new Date();
    const options = { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }

  getLogFilePath(hour) {
    const date = new Date();
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
    return `${dateStr}_${hour}.log`;
  }

  createLogStream(level) {
    const destination = rfs.createStream(this.getLogFilePath(this.getCurrentHour()), {
      interval: '1h',
      path: this.getLogFolderPath(level),
      size: '10M',
      compress: 'gzip',
      maxFiles: 14
    });

    const prettyOptions = {
      colorize: false, // No color for file logs
      translateTime: new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(new Date()),
      ignore: 'hostname,pid',
      destination: destination
    };

    const prettyStream = pinoPretty(prettyOptions);
    return prettyStream;
  }

  prettyStream(colorize = true) {
    return pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: colorize,
        translateTime: 'yyyy-mm-dd HH:MM:ss.l',
        ignore: 'hostname,pid'
      }
    });
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
        stream: this.prettyStream()
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
      pino.multistream(this.streams)
    );
  }
}

module.exports = new LoggerConfig().getLogger();
