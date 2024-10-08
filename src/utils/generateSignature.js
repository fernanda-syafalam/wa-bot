require('dotenv').config();

const crypto = require('crypto');
const logger = require('../config/logger');
const staticApiKey = process.env.API_KEY;
const secretKey = process.env.SECRET_KEY;

const generateSignature = (method, url, timestamp, body) => {
  const hashBody = crypto.createHash('sha256').update(body).digest('hex');
  // logger.error(`🚀 ~ authMiddleware ~ req.method: ${method}, url: ${url}, timestamp: ${timestamp}, hashBody: ${hashBody}`);

  const data = `${method}:${url}:${hashBody}:${timestamp}`;
  const signature = btoa(crypto.createHmac('sha512', secretKey).update(data).digest('binary'));

  return signature;
};

module.exports = { generateSignature };
