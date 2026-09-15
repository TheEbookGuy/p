// middleware/rateLimiter.js — Basic rate limiting
const rateLimit = require('express-rate-limit');

/** General API rate limiter — 100 requests per minute per IP */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

/** Stricter limiter for auth endpoints — 20 requests per minute per IP */
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

module.exports = { apiLimiter, authLimiter };
