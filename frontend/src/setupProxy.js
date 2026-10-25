// Dev server only: sends /media (uploaded PDFs, EPUBs, covers) to Django, even when the
// browser navigates to a file link, which the "proxy" field in package.json skips.
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/media',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
    })
  );
};
