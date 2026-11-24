/* Koneksi & struktur tabel MySQL/MariaDB */
'use strict';
const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: +(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: +(process.env.DB_POOL || 8),
      dateStrings: true
    });
  }
  return pool;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    pass_hash VARCHAR(255) NOT NULL,
    role VARCHAR(16) NOT NULL DEFAULT 'guru',
    theme TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token CHAR(64) NOT NULL PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    expires_at DATETIME NOT NULL,
    INDEX (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  // Dokumen: pengaturan, kelas (+murid), mapel (+TP), asesmen, paket soal
  `CREATE TABLE IF NOT EXISTS docs (
    kind VARCHAR(32) NOT NULL,
    id VARCHAR(64) NOT NULL,
    data LONGTEXT NOT NULL,
    exam_code VARCHAR(16) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NULL,
    PRIMARY KEY (kind, id),
    INDEX (exam_code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS scores (
    assessment_id VARCHAR(64) NOT NULL,
    student_id VARCHAR(64) NOT NULL,
    value TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (assessment_id, student_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS submissions (
    assessment_id VARCHAR(64) NOT NULL,
    student_id VARCHAR(64) NOT NULL,
    data LONGTEXT NOT NULL,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (assessment_id, student_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
];

async function migrate() {
  const p = getPool();
  for (const sql of SCHEMA) await p.query(sql);
}

async function query(sql, params) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

/** Jalankan fungsi di dalam transaksi. */
async function tx(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const q = async (sql, params) => (await conn.query(sql, params))[0];
    const out = await fn(q);
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/** Pesan kesalahan database yang mudah dipahami. */
function explain(e) {
  const c = e && e.code;
  if (!c) return null;
  if (c === 'ER_ACCESS_DENIED_ERROR' || c === 'ER_DBACCESS_DENIED_ERROR') return 'Database menolak login: periksa DB_USER dan DB_PASSWORD, dan pastikan user sudah ditambahkan ke database dengan ALL PRIVILEGES.';
  if (c === 'ER_BAD_DB_ERROR') return 'Database "' + process.env.DB_NAME + '" tidak ditemukan: periksa DB_NAME (gunakan nama lengkap dengan awalan akun, mis. akunanda_asesmen).';
  if (c === 'ECONNREFUSED' || c === 'ENOTFOUND' || c === 'ETIMEDOUT' || c === 'EHOSTUNREACH') return 'Tidak bisa menghubungi server database di "' + (process.env.DB_HOST || 'localhost') + '": periksa DB_HOST (biasanya localhost).';
  if (c === 'ER_TABLEACCESS_DENIED_ERROR' || c === 'ER_SPECIFIC_ACCESS_DENIED_ERROR') return 'User database tidak punya izin yang cukup: beri ALL PRIVILEGES atau impor schema.sql lewat phpMyAdmin.';
  if (c === 'ER_NO_SUCH_TABLE') return 'Tabel belum ada: restart aplikasi atau impor schema.sql lewat phpMyAdmin.';
  return null;
}

module.exports = { getPool, migrate, query, tx, SCHEMA, explain };
