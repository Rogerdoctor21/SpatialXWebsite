const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PAGES_DIR = path.join(ROOT, 'pages');
const PUBLIC_DIR = path.join(ROOT, 'public');

const routes = new Map([
  ['/', 'index.html'],
  ['/capabilities', 'capabilities.html'],
  ['/industries', 'industries.html'],
  ['/insights', 'insights.html'],
  ['/about', 'about.html'],
  ['/contact', 'contact.html'],
  ['/privacy', 'privacy.html'],
  ['/insights/whats-so-spatial-about-risk', 'insights/whats-so-spatial-about-risk.html'],
  ['/insights/gis-critical-infrastructure', 'insights/gis-critical-infrastructure.html'],
  ['/insights/geoai-without-the-hype', 'insights/geoai-without-the-hype.html']
]);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Cache-Control': contentType.includes('text/html') ? 'no-cache' : 'public, max-age=86400'
  });
  res.end(body);
}

function safeJoin(base, requestedPath) {
  const targetPath = path.normalize(path.join(base, requestedPath));
  if (!targetPath.startsWith(base)) return null;
  return targetPath;
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      const notFound = path.join(PAGES_DIR, '404.html');
      fs.readFile(notFound, (notFoundErr, notFoundHtml) => {
        if (notFoundErr) return send(res, 404, 'Not found');
        return send(res, 404, notFoundHtml, 'text/html; charset=utf-8');
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, mimeTypes[ext] || 'application/octet-stream');
  });
}

function handleContact(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 1_000_000) req.destroy();
  });

  req.on('end', () => {
    const contentType = req.headers['content-type'] || '';
    const data = contentType.includes('application/json')
      ? JSON.parse(body || '{}')
      : querystring.parse(body);

    const name = String(data.name || '').trim();
    const email = String(data.email || '').trim();
    const message = String(data.message || '').trim();

    if (!name || !email || !message) {
      return send(res, 400, JSON.stringify({ ok: false, message: 'Please fill out name, email, and message.' }), 'application/json; charset=utf-8');
    }

    // This starter keeps submissions local. On production, connect this endpoint to email, CRM, or a database.
    console.log('SpatialX contact submission:', {
      name,
      organization: String(data.organization || '').trim(),
      email,
      interest: String(data.interest || '').trim(),
      timeline: String(data.timeline || '').trim(),
      message,
      submittedAt: new Date().toISOString()
    });

    return send(res, 200, JSON.stringify({ ok: true, message: 'Thanks. Your message was received.' }), 'application/json; charset=utf-8');
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = url.pathname.replace(/\/$/, '') || '/';

  if (req.method === 'POST' && pathname === '/contact') {
    return handleContact(req, res);
  }

  if (pathname.startsWith('/public/')) {
    const filePath = safeJoin(PUBLIC_DIR, pathname.replace('/public/', ''));
    if (!filePath) return send(res, 403, 'Forbidden');
    return serveFile(res, filePath);
  }

  if (pathname === '/favicon.svg') {
    return serveFile(res, path.join(PUBLIC_DIR, 'assets', 'favicon.svg'));
  }

  if (routes.has(pathname)) {
    return serveFile(res, path.join(PAGES_DIR, routes.get(pathname)));
  }

  return serveFile(res, path.join(PAGES_DIR, '404.html'));
});

server.listen(PORT, () => {
  console.log(`SpatialX Solutions website running on port ${PORT}`);
});
