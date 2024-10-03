require('dotenv').config();

const staticApiKey = process.env.API_KEY;
const logger = require('../config/logger');
const { generateSignature } = require('../utils/generateSignature');
const { responseError } = require('../utils/response');
const { ResponseCode } = require('../constant/status-code');
const crypto = require('crypto');

const validateHeaders = req => {
  const apiKey = req.headers['x-api-key']?.trim().replace(/,$/, '');
  const timestamp = req.headers['x-timestamp'];
  const signature = req.headers['x-signature'];
  return { apiKey, timestamp, signature };
};

const authMiddleware = (req, res, next) => {
  const { apiKey, timestamp, signature } = validateHeaders(req);
  const url = req.originalUrl;
  const now = new Date().getTime() / 1000;
  const MAX_AGE = 180;
  let body = '';

  if (!url || !apiKey || !timestamp || !signature) {
    logger.warn('Missing headers for authentication');
    responseError(res, ResponseCode.Unauthorized, 'Missing headers for authentication');
    return;
  }

  if (!apiKey || !timestamp || !signature) {
    logger.warn(`Missing headers for authentication. API key: ${apiKey}, timestamp: ${timestamp}, signature: ${signature}`);
    responseError(res, ResponseCode.Unauthorized, 'Missing headers for authentication');
    return;
  }

  if (apiKey !== staticApiKey) {
    logger.warn(`Invalid API key: ${apiKey}`);
    responseError(res, ResponseCode.Unauthorized, 'Invalid API key');
    return;
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    body = JSON.stringify(JSON.parse(req.body));
  }

  try {
    if (Math.abs(now - parseInt(new Date(timestamp).getTime() / 1000)) > MAX_AGE) {
      logger.warn(`Timestamp is too far from current time. Current time: ${now}, timestamp: ${timestamp}`);
      responseError(res, ResponseCode.Unauthorized, 'Timestamp is too far from current time');
      return;
    }
  } catch (error) {
    responseError(res, ResponseCode.Unauthorized, 'Invalid timestamp');
  }

  const generatedSignature = generateSignature(req.method, url, timestamp, body);
  logger.error(`🚀 ~ authMiddleware ~ req.method: ${req.method}, url: ${url}, timestamp: ${timestamp}, body: ${body}`);

  if (signature !== generatedSignature) {
    logger.warn(`Invalid signature for API key ${apiKey}. Expected: ${generatedSignature}, Received: ${signature}`);
    responseError(res, ResponseCode.Unauthorized, 'Invalid signature');
    return;
  }

  next();
};

module.exports = authMiddleware;
