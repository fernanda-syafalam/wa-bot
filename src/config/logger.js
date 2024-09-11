require('dotenv').config();
const pino = require('pino');
const fs = require('fs-extra');
const path = require('path');
const pinoPretty = require('pino-pretty');
const { multistream } = require('pino-multi-stream');

class LoggerConfig {
  constructor() {
    this.logLevels = ['info', 'error', 'warn'];
    this.streams = {};
    this.currentHour = this.getCurrentHour(); // Initial hour in Jakarta time
  }

  // Get the current hour in Indonesia timezone (Jakarta)
  getCurrentHour() {
    const date = new Date();
    const options = { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }

  // Generate the log folder path
  static getLogFolderPath(level) {
    const logFolderPath = path.join(__dirname, '..', 'logs', level);
    fs.ensureDirSync(logFolderPath); // Ensure folder exists
    return logFolderPath;
  }

  // Generate the log file path with date and hour
  static getLogFilePath(level, hour) {
    const date = new Date();
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
    const logFolderPath = this.getLogFolderPath(level);
    return path.join(logFolderPath, `${dateStr}_${hour}.log`);
  }

  // Create a new file stream for a specific level and hour
  createLogStream(level) {
    const filePath = LoggerConfig.getLogFilePath(level, this.currentHour);
    const fileStream = fs.createWriteStream(filePath, {
      flags: 'a', // Append to the file
      highWaterMark: 1024 * 1024 // 1MB buffer size for better performance
    });

    const prettyOptions = {
      colorize: false, // No color for file logs
      translateTime: 'yyyy-mm-dd HH:MM:ss.l',
      ignore: 'hostname,pid',
      destination: fileStream
    };

    const prettyStream = pinoPretty(prettyOptions);
    return prettyStream;
  }

  // Rotate the log file if the hour has changed
  rotateLogFilesIfNeeded() {
    const newHour = this.getCurrentHour();
    if (newHour !== this.currentHour) {
      this.currentHour = newHour;
      this.logLevels.forEach(level => {
        if (this.streams[level]?.destination) {
          this.streams[level].destination.end(); // Close the old stream
        }
        this.streams[level] = this.createLogStream(level); // Create a new stream for the new hour
      });
    }
  }

  // Add log file streams (lazy initialization)
  addFileStreams() {
    if (process.env.NODE_ENV === 'production') {
      this.logLevels.forEach(level => {
        this.streams[level] = this.createLogStream(level); // Initialize stream lazily
      });
    }
  }

  // Add console stream for non-production environments
  addConsoleStream() {
    if (process.env.NODE_ENV !== 'production') {
      this.streams['info'] = pinoPretty({
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss.l',
        ignore: 'hostname,pid'
      });
    }
  }

  // Get logger instance
  getLogger() {
    this.addFileStreams();
    this.addConsoleStream();

    // Each time we log, we first check if the hour has changed and rotate if necessary
    const streamList = Object.values(this.streams).map((stream, i) => ({
      level: this.logLevels[i] || 'info', // Set the log level
      stream
    }));

    const logger = pino(
      {
        level: 'info' // Default logging level
      },
      multistream(streamList)
    );

    return new Proxy(logger, {
      get: (target, propKey) => {
        if (['info', 'error', 'warn'].includes(propKey)) {
          return (...args) => {
            this.rotateLogFilesIfNeeded(); // Rotate the files before logging
            target[propKey](...args); // Log the message
          };
        }
        return target[propKey];
      }
    });
  }
}

module.exports = new LoggerConfig().getLogger();
