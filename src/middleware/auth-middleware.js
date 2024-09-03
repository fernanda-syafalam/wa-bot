require('dotenv').config();

const staticApiKey = process.env.STATIC_API_KEY;
const logger = require('../config/logger');
const { STATUS_CODE } = require('../constant/status-code');
const { generateSignature } = require('../utils/generateSignature');
const { responseError } = require('../utils/response');

const validateHeaders = req => {
  const apiKey = req.headers['x-api-key']?.trim().replace(/,$/, '');
  const timestamp = req.headers['x-timestamp'];
  const signature = req.headers['x-signature'];
  return { apiKey, timestamp, signature };
};

const authMiddleware = (req, res, next) => {
  const { apiKey, timestamp, signature } = validateHeaders(req);
  const url = req.originalUrl;

  if (!apiKey || !timestamp || !signature) {
    logger.warn(`Missing headers for authentication. API key: ${apiKey}, timestamp: ${timestamp}, signature: ${signature}`);
    responseError(res, 'Missing headers for authentication', STATUS_CODE.HTTP_UNAUTHORIZED);
    return;
  }

  if (apiKey !== staticApiKey) {
    logger.warn(`Invalid API key: ${apiKey}`);
    responseError(res, 'Invalid API key', STATUS_CODE.HTTP_UNAUTHORIZED);
    return;
  }

  const generatedSignature = generateSignature(url, timestamp);

  if (signature !== generatedSignature) {
    logger.warn(`Invalid signature for API key ${apiKey}. Expected: ${generatedSignature}, Received: ${signature}`);
    responseError(res, 'Invalid signature', STATUS_CODE.HTTP_UNAUTHORIZED);
    return;
  }

  next();
};

module.exports = authMiddleware;
