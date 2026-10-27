// Dev server only: sends /media (uploaded PDFs, EPUBs, covers) and /api to Django, even
// when the browser navigates to them (a file link, or the editor's EPUB preview frame),
// which the "proxy" field in package.json skips.
const { createProxyMiddleware } = require('http-proxy-middleware');

const target = 'http://127.0.0.1:8000';

module.exports = function (app) {
    app.use(
        ['/media', '/api'],
        createProxyMiddleware({
            target,
            changeOrigin: true,
            // changeOrigin only rewrites Host; Django's CSRF check also compares Origin with
            // it, so rewrite Origin too, as the "proxy" field does.
            onProxyReq(proxyReq) {
                if (proxyReq.getHeader('origin')) proxyReq.setHeader('origin', target);
            },
        })
    );
};
