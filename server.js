/*
 * Asesmen Merdeka — server Node.js + MySQL
 * Jalankan: npm install && npm start   (konfigurasi di file .env)
 */
'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
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
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '1h' }));

// Penanganan error API
app.use((err, req, res, next) => {
  console.error('[error]', err && err.stack || err);
  if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'Data terlalu besar (maks. 30 MB). Kurangi gambar pada soal.' });
  const dbDown = err && /ECONNREFUSED|ER_ACCESS_DENIED|ER_BAD_DB|ENOTFOUND/.test(err.code || '');
  res.status(500).json({ error: dbDown ? 'Tidak bisa terhubung ke database. Periksa pengaturan .env.' : 'Terjadi kesalahan di server.' });
});

const PORT = process.env.PORT || 3000;

db.migrate()
  .then(() => console.log('[db] tabel siap'))
  .catch(e => console.error('[db] gagal menyiapkan tabel — periksa DB_HOST/DB_USER/DB_PASSWORD/DB_NAME di .env:', e.message))
  .finally(() => {
    app.listen(PORT, () => console.log(`Asesmen Merdeka berjalan di port ${PORT}`));
  });

module.exports = app;
