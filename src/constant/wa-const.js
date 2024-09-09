const { DisconnectReason } = require('@whiskeysockets/baileys');

const RECONNECT_REASONS = [
  DisconnectReason.timedOut,
  DisconnectReason.connectionClosed,
  DisconnectReason.connectionLost,
  DisconnectReason.connectionReplaced,
  DisconnectReason.restartRequired
];

const RESTART_SESSION_REASONS = [
  DisconnectReason.badSession,
  DisconnectReason.multideviceMismatch,
  DisconnectReason.forbidden,
  DisconnectReason.unavailableService
];

const CONNECT_TIMEOUT = 15;
const KEEP_ALIVE_INTERVAL = 7.5;
const RETRY_REQUEST_DELAY = 1.5;
const TIME_INITIALIZATION = 1;
const TIME_TOGENERATE_QR = 1;
const SECONDS = 1000;

module.exports = {
  RECONNECT_REASONS,
  RESTART_SESSION_REASONS,
  CONNECT_TIMEOUT,
  KEEP_ALIVE_INTERVAL,
  RETRY_REQUEST_DELAY,
  TIME_INITIALIZATION,
  TIME_TOGENERATE_QR,
  SECONDS
};
