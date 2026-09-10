const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const xss = require('xss');

function applySecurityMiddleware(app) {
  // Helmet HTTP Headers Security
  app.use(
    helmet({
      contentSecurityPolicy: false, // Tắt CSP tĩnh để hỗ trợ inline scripts / frontend CDNs nếu cần
      crossOriginEmbedderPolicy: false,
    })
  );

  // Chống HTTP Parameter Pollution
  app.use(hpp());

  // Rate Limiter: Tối đa 500 req / 15 phút
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { message: 'Quá nhiều yêu cầu từ IP của bạn, vui lòng thử lại sau 15 phút!' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Middleware Sanitize XSS đơn giản
  app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      for (const key in req.body) {
        if (typeof req.body[key] === 'string') {
          req.body[key] = xss(req.body[key]);
        }
      }
    }
    next();
  });
}

module.exports = applySecurityMiddleware;
