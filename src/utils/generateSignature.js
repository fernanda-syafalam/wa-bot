require('dotenv').config();

const crypto = require('crypto');
const staticApiKey = process.env.STATIC_API_KEY;
const secretKey = process.env.SECRET_KEY;

const generateSignature = (url, timestamp) => {
  const data = `${staticApiKey}${url}${timestamp}`;
  const signature = crypto.createHmac('sha256', secretKey).update(data).digest('hex');

  return `${staticApiKey}:${signature}:${timestamp}`;
};

module.exports = { generateSignature };
