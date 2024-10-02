const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 6000, // limit each IP to 100 requests per windowMs
  message: JSON.stringify({
    code: 429,
    message: 'Too many requests, please try again later.'
  })
});

module.exports = limiter;
