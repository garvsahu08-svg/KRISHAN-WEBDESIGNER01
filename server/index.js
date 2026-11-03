// KRISHAN WEBDESIGNERC – static file server + contact-form API.
// Zero dependencies: only Node built-ins (Node >= 18 for global fetch).
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const gzipAsync = promisify(gzip);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');

// ---- tiny .env loader (no dotenv dependency) -------------------------------
const envFile = path.join(ROOT, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const PORT = Number(process.env.PORT) || 3000;
const RESEND_API_URL = process.env.RESEND_API_URL || 'https://api.resend.com/emails';
const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt', '.xml']);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
};

// ---- helpers ---------------------------------------------------------------
function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  res.end(body);
}
function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
}
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---- contact API -----------------------------------------------------------
const WEBSITE_TYPES = [
  'Business Website', 'E-commerce Website', 'Portfolio Website', 'Landing Page', 'Restaurant Website',
  'Personal Brand Website', 'Website Redesign', 'Admin Panel / Custom Web App', 'Website Maintenance', 'Other',
];
const BUDGETS = ['Under ₹10,000', '₹10,000 – ₹20,000', '₹20,000 – ₹40,000', '₹40,000+', 'Not sure yet'];

const hits = new Map(); // ip -> timestamps (simple in-memory rate limit)
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return list.length > 5;
}

function readBody(req, limit = 20 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function validate(b) {
  const errors = {};
  const s = (v) => (typeof v === 'string' ? v.trim() : '');
  const data = {
    name: s(b.name), phone: s(b.phone), email: s(b.email),
    websiteType: s(b.websiteType), budget: s(b.budget), message: s(b.message),
  };
  if (data.name.length < 2 || data.name.length > 80) errors.name = 'Please enter your name.';
  if (!/^\+?[\d\s\-()]{7,18}$/.test(data.phone) || data.phone.replace(/\D/g, '').length < 7) errors.phone = 'Please enter a valid phone number.';
  if (data.email && (data.email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email))) errors.email = 'Please enter a valid email address.';
  if (!WEBSITE_TYPES.includes(data.websiteType)) errors.websiteType = 'Please choose a website type.';
  if (data.budget && !BUDGETS.includes(data.budget)) errors.budget = 'Please choose a budget.';
  if (data.message.length < 5 || data.message.length > 2000) errors.message = 'Please tell us a little about your project (5–2000 characters).';
  return { data, errors };
}

async function handleContact(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  if (rateLimited(ip)) return sendJson(res, 429, { ok: false, error: 'Too many requests. Please wait a few minutes or contact us on WhatsApp.' });

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (e) {
    return sendJson(res, e.status || 400, { ok: false, error: 'Invalid request.' });
  }
  if (body && typeof body.company === 'string' && body.company.trim()) return sendJson(res, 200, { ok: true }); // honeypot: pretend success to bots

  const { data, errors } = validate(body || {});
  if (Object.keys(errors).length) return sendJson(res, 422, { ok: false, error: 'Please check the highlighted fields.', fields: errors });

  if (!emailConfigured()) {
    console.warn('[contact] Enquiry NOT delivered: set RESEND_API_KEY and CONTACT_TO_EMAIL.');
    return sendJson(res, 503, { ok: false, code: 'not_configured', error: 'Our enquiry form is not connected to email yet, so your message was not sent. Please contact us on WhatsApp instead.' });
  }

  const rows = [
    ['Name', data.name], ['Phone', data.phone], ['Email', data.email || '—'],
    ['Website type', data.websiteType], ['Budget', data.budget || '—'],
  ];
  const html =
    `<h2>New website enquiry</h2><table cellpadding="6" style="border-collapse:collapse">` +
    rows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${escapeHtml(v)}</td></tr>`).join('') +
    `</table><p><b>Message</b></p><p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nMessage:\n${data.message}`;

  try {
    const r = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL || 'KRISHAN WEBDESIGNERC <onboarding@resend.dev>',
        to: process.env.CONTACT_TO_EMAIL.split(',').map((x) => x.trim()).filter(Boolean),
        subject: `New enquiry: ${data.websiteType} – ${data.name}`,
        html, text,
        ...(data.email ? { reply_to: data.email } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) {
      console.error('[contact] Email provider error', r.status, (await r.text()).slice(0, 300));
      return sendJson(res, 502, { ok: false, error: 'We could not send your message right now. Please try again or contact us on WhatsApp.' });
    }
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error('[contact] Email request failed:', err.message);
    return sendJson(res, 502, { ok: false, error: 'We could not send your message right now. Please try again or contact us on WhatsApp.' });
  }
}

// ---- static files ----------------------------------------------------------
async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return send(res, 400, 'Bad request'); }
  if (rel.includes('\0')) return send(res, 400, 'Bad request');
  if (rel === '/privacy') rel = '/privacy.html';
  if (rel === '/terms') rel = '/terms.html';
  let file = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden');
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const buf = await readFile(file);
    const ext = path.extname(file).toLowerCase();
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
      Vary: 'Accept-Encoding',
    };
    let out = buf;
    if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '') && buf.length > 1024) {
      out = await gzipAsync(buf);
      headers['Content-Encoding'] = 'gzip';
    }
    headers['Content-Length'] = out.length;
    send(res, 200, req.method === 'HEAD' ? undefined : out, headers);
  } catch {
    let notFound = '<h1>404 – Page not found</h1><p><a href="/">Back to home</a></p>';
    try { notFound = await readFile(path.join(PUBLIC_DIR, '404.html'), 'utf8'); } catch { /* use fallback */ }
    send(res, 404, notFound, { 'Content-Type': 'text/html; charset=utf-8' });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/health') return sendJson(res, 200, { ok: true, emailConfigured: emailConfigured() });
    if (url.pathname === '/api/contact') return await handleContact(req, res);
    return await serveStatic(req, res, url.pathname);
  } catch (err) {
    console.error('[server] Unhandled error:', err);
    if (!res.headersSent) sendJson(res, 500, { ok: false, error: 'Server error.' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`KRISHAN WEBDESIGNERC running on port ${PORT}`);
  console.log(emailConfigured() ? 'Contact form email: configured' : 'Contact form email: NOT configured (set RESEND_API_KEY and CONTACT_TO_EMAIL)');
});
