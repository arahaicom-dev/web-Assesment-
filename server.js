/*
 * Asesmen Merdeka — server Node.js + MySQL
 * Jalankan: npm install && npm start   (konfigurasi di .env atau Environment variables cPanel)
 *
 * Jika ada masalah saat menyala, server tetap hidup dan menampilkan halaman
 * penjelasan, serta mencatat detailnya di file log-aplikasi.txt.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const http = require('http');

const LOG_FILE = path.join(__dirname, 'log-aplikasi.txt');
const PORT = process.env.PORT || 3000;

function log() {
  const line = new Date().toISOString() + ' ' + Array.from(arguments).join(' ');
  console.log(line);
  try {
    // Batasi ukuran log ~200 KB
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > 200 * 1024) fs.writeFileSync(LOG_FILE, '');
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (e) { /* abaikan */ }
}
process.on('uncaughtException', e => log('[FATAL]', e && e.stack || e));
process.on('unhandledRejection', e => log('[FATAL]', e && e.stack || e));

/** Server darurat: tampilkan penjelasan masalah alih-alih error 503. */
function startFallback(title, steps, detail) {
  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Asesmen Merdeka — perlu pengaturan</title>
<style>body{font-family:system-ui,sans-serif;background:#eef1fb;color:#1c2340;margin:0;padding:30px 16px}.c{max-width:680px;margin:auto;background:#fff;border-radius:18px;padding:26px;box-shadow:0 14px 40px #2a3b8a22}
h1{font-size:1.4rem;margin:0 0 6px}ol{line-height:1.7}pre{background:#f3f4fa;padding:12px;border-radius:10px;white-space:pre-wrap;font-size:.85rem}.m{color:#667}</style></head>
<body><div class="c"><h1>⚠️ ${title}</h1><p class="m">Aplikasi Asesmen Merdeka sudah terpasang, tetapi belum bisa berjalan.</p>
<h3>Cara memperbaiki</h3><ol>${steps.map(s => '<li>' + s + '</li>').join('')}</ol>
<h3>Detail teknis</h3><pre>${String(detail || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}\nNode.js ${process.version} · folder ${__dirname}</pre></div></body></html>`;
  http.createServer((req, res) => {
    const json = req.url.indexOf('/api/') >= 0;
    res.writeHead(503, { 'Content-Type': json ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8' });
    res.end(json ? JSON.stringify({ error: title + ' — ' + detail }) : html);
  }).listen(PORT, () => log('[fallback] halaman bantuan aktif di port', PORT));
}

function main() {
  log('Memulai Asesmen Merdeka versi ' + require('./package.json').version + '. Node', process.version, '· port', PORT, '· folder', __dirname);

  const major = parseInt(process.versions.node.split('.')[0], 10);
  if (major < 14) {
    log('[ERROR] Versi Node.js terlalu lama:', process.version);
    return startFallback('Versi Node.js terlalu lama (' + process.version + ')', [
      'Buka cPanel → <b>Setup Node.js App</b> → klik ikon pensil (Edit) pada aplikasi ini.',
      'Ubah <b>Node.js version</b> ke versi tertinggi yang tersedia (minimal 14, disarankan 18 atau lebih baru).',
      'Klik <b>Save</b>, lalu <b>Run NPM Install</b>, lalu <b>Restart</b>.'
    ], 'Butuh Node.js 14 atau lebih baru.');
  }

  let express;
  try {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
    express = require('express');
    require('mysql2/promise');
  } catch (e) {
    log('[ERROR] Modul belum terpasang:', e.message);
    return startFallback('Modul aplikasi belum terpasang', [
      'Buka cPanel → <b>Setup Node.js App</b> → klik ikon pensil (Edit) pada aplikasi ini.',
      'Klik tombol <b>Run NPM Install</b> dan tunggu sampai selesai (bisa 1–2 menit).',
      'Klik <b>Restart</b>, lalu muat ulang halaman ini.',
      'Pastikan file <b>package.json</b> berada langsung di dalam folder <i>Application root</i> (bukan di sub-folder).'
    ], e.message);
  }

  const missing = ['DB_USER', 'DB_NAME'].filter(k => !process.env[k]);
  if (missing.length) {
    log('[ERROR] Pengaturan database belum diisi:', missing.join(', '));
    return startFallback('Pengaturan database belum diisi', [
      'Buka cPanel → <b>Setup Node.js App</b> → Edit aplikasi ini.',
      'Di bagian <b>Environment variables</b>, tambahkan: <b>DB_HOST</b> = localhost, <b>DB_NAME</b>, <b>DB_USER</b>, <b>DB_PASSWORD</b> (nama lengkap dari menu MySQL® Databases).',
      'Klik <b>Save</b>, lalu <b>Restart</b>.'
    ], 'Belum ada: ' + missing.join(', '));
  }

  const db = require('./server/db');
  const { router } = require('./server/api');

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(express.json({ limit: '30mb' }));
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'same-origin');
    next();
  });
  app.use('/api', router);
  app.use('/api', (req, res) => res.status(404).json({ error: 'Tidak ditemukan.' }));
  // HTML/JS/CSS selalu dicek ulang agar update langsung terlihat; pustaka PDF boleh di-cache lama
  app.use(express.static(path.join(__dirname, 'public'), {
    extensions: ['html'],
    setHeaders(res, file) {
      if (/[\\/]lib[\\/]/.test(file)) res.set('Cache-Control', 'public, max-age=604800');
      else res.set('Cache-Control', 'no-cache');
    }
  }));

  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    log('[error]', req.method, req.url, err && err.stack || err);
    if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'Data terlalu besar (maks. 30 MB). Kurangi gambar pada soal.' });
    res.status(500).json({ error: db.explain(err) || 'Terjadi kesalahan di server.' });
  });

  app.listen(PORT, () => log('Asesmen Merdeka berjalan di port', PORT));

  db.migrate()
    .then(() => log('[db] terhubung, tabel siap'))
    .catch(e => log('[db] GAGAL:', db.explain(e) || e.message, '(' + (e.code || '') + ' ' + e.message + ')'));
}

main();
