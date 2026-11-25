/* REST API: login guru, sinkronisasi data, ujian online murid */
'use strict';
const express = require('express');
const crypto = require('crypto');
const db = require('./db');
const P = require('../public/js/parser.js');
const QT = require('../public/js/qtypes.js');

const router = express.Router();
const DOC_KINDS = ['settings', 'classes', 'subjects', 'assessments', 'questionSets'];
const SESSION_DAYS = +(process.env.SESSION_DAYS || 30);

/* ---------------- util ---------------- */
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
function bad(res, code, msg) { return res.status(code).json({ error: msg }); }
function parseJSON(s, def) { try { return JSON.parse(s); } catch (e) { return def; } }
function cleanId(v) { return typeof v === 'string' && v.length > 0 && v.length <= 64 ? v : null; }

function hashPassword(pw) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(String(pw), salt, 64, (err, key) => err ? reject(err) : resolve('scrypt$' + salt + '$' + key.toString('hex')));
  });
}
function verifyPassword(pw, stored) {
  return new Promise(resolve => {
    const [algo, salt, hex] = String(stored || '').split('$');
    if (algo !== 'scrypt' || !salt || !hex) return resolve(false);
    crypto.scrypt(String(pw), salt, 64, (err, key) => {
      if (err) return resolve(false);
      const a = Buffer.from(hex, 'hex');
      resolve(a.length === key.length && crypto.timingSafeEqual(a, key));
    });
  });
}
function validPassword(pw) { return typeof pw === 'string' && pw.length >= 6 && pw.length <= 200; }
function validUsername(u) { return typeof u === 'string' && /^[a-zA-Z0-9._-]{3,64}$/.test(u); }

async function newSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const exp = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.query('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)', [token, userId, exp]);
  await db.query('DELETE FROM sessions WHERE expires_at < NOW()');
  return token;
}
function publicUser(u) { return { id: u.id, username: u.username, name: u.name, role: u.role }; }

/* Pembatas percobaan login (sederhana, di memori) */
const fails = new Map();
function lockKey(req, u) { return (req.ip || '') + '|' + String(u || '').toLowerCase(); }
function isLocked(k) { const f = fails.get(k); return f && f.n >= 8 && Date.now() - f.t < 10 * 60e3; }
function addFail(k) { const f = fails.get(k) || { n: 0, t: 0 }; if (Date.now() - f.t > 10 * 60e3) f.n = 0; f.n++; f.t = Date.now(); fails.set(k, f); }

/* ---------------- autentikasi ---------------- */
const auth = wrap(async (req, res, next) => {
  const h = req.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!/^[a-f0-9]{64}$/.test(token)) return bad(res, 401, 'Silakan login.');
  const rows = await db.query('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > NOW()', [token]);
  if (!rows.length) return bad(res, 401, 'Sesi berakhir, silakan login lagi.');
  req.user = rows[0]; req.token = token;
  next();
});
const adminOnly = (req, res, next) => req.user.role === 'admin' ? next() : bad(res, 403, 'Hanya admin.');

router.get('/health', async (req, res) => {
  try {
    const r = await db.query('SELECT COUNT(*) AS n FROM users');
    res.json({ ok: true, mode: 'server', version: require('../package.json').version, needsSetup: r[0].n === 0 });
  } catch (e) {
    if (e && e.code === 'ER_NO_SUCH_TABLE') { try { await db.migrate(); return res.json({ ok: true, mode: 'server', needsSetup: true }); } catch (e2) { e = e2; } }
    res.json({ ok: false, mode: 'server', dbError: db.explain(e) || ('Gagal terhubung ke database: ' + (e && e.message)) });
  }
});

router.post('/setup', wrap(async (req, res) => {
  const { username, password, name, schoolName } = req.body || {};
  const r = await db.query('SELECT COUNT(*) AS n FROM users');
  if (r[0].n > 0) return bad(res, 409, 'Aplikasi sudah dipasang. Silakan login.');
  if (!validUsername(username)) return bad(res, 400, 'Username 3–64 karakter (huruf, angka, titik, minus, garis bawah).');
  if (!validPassword(password)) return bad(res, 400, 'Password minimal 6 karakter.');
  const hash = await hashPassword(password);
  const ins = await db.query('INSERT INTO users (username, name, pass_hash, role) VALUES (?,?,?,?)', [username, String(name || username).slice(0, 150), hash, 'admin']);
  if (schoolName) {
    await db.query('INSERT INTO docs (kind, id, data) VALUES (?,?,?) ON DUPLICATE KEY UPDATE data = VALUES(data)', ['settings', 'main', JSON.stringify({ schoolName: String(schoolName).slice(0, 200), teacherName: String(name || '') })]);
  }
  const token = await newSession(ins.insertId);
  res.json({ token, user: { id: ins.insertId, username, name: name || username, role: 'admin' } });
}));

router.post('/login', wrap(async (req, res) => {
  const { username, password } = req.body || {};
  const k = lockKey(req, username);
  if (isLocked(k)) return bad(res, 429, 'Terlalu banyak percobaan. Coba lagi 10 menit lagi.');
  const rows = await db.query('SELECT * FROM users WHERE username = ?', [String(username || '')]);
  if (!rows.length || !(await verifyPassword(password, rows[0].pass_hash))) { addFail(k); return bad(res, 401, 'Username atau password salah.'); }
  fails.delete(k);
  const token = await newSession(rows[0].id);
  res.json({ token, user: publicUser(rows[0]) });
}));

router.post('/logout', auth, wrap(async (req, res) => {
  await db.query('DELETE FROM sessions WHERE token = ?', [req.token]);
  res.json({ ok: true });
}));

router.get('/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));

router.put('/me/password', auth, wrap(async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!(await verifyPassword(oldPassword, req.user.pass_hash))) return bad(res, 400, 'Password lama salah.');
  if (!validPassword(newPassword)) return bad(res, 400, 'Password baru minimal 6 karakter.');
  await db.query('UPDATE users SET pass_hash = ? WHERE id = ?', [await hashPassword(newPassword), req.user.id]);
  await db.query('DELETE FROM sessions WHERE user_id = ? AND token <> ?', [req.user.id, req.token]);
  res.json({ ok: true });
}));

/* ---------------- kelola akun guru (admin) ---------------- */
router.get('/users', auth, adminOnly, wrap(async (req, res) => {
  const rows = await db.query('SELECT id, username, name, role, created_at FROM users ORDER BY id');
  res.json({ users: rows });
}));
router.post('/users', auth, adminOnly, wrap(async (req, res) => {
  const { username, name, password, role } = req.body || {};
  if (!validUsername(username)) return bad(res, 400, 'Username 3–64 karakter (huruf, angka, titik, minus, garis bawah).');
  if (!validPassword(password)) return bad(res, 400, 'Password minimal 6 karakter.');
  const ex = await db.query('SELECT id FROM users WHERE username = ?', [username]);
  if (ex.length) return bad(res, 409, 'Username sudah dipakai.');
  await db.query('INSERT INTO users (username, name, pass_hash, role) VALUES (?,?,?,?)', [username, String(name || username).slice(0, 150), await hashPassword(password), role === 'admin' ? 'admin' : 'guru']);
  res.json({ ok: true });
}));
router.put('/users/:id/password', auth, adminOnly, wrap(async (req, res) => {
  const { password } = req.body || {};
  if (!validPassword(password)) return bad(res, 400, 'Password minimal 6 karakter.');
  await db.query('UPDATE users SET pass_hash = ? WHERE id = ?', [await hashPassword(password), +req.params.id]);
  await db.query('DELETE FROM sessions WHERE user_id = ?', [+req.params.id]);
  res.json({ ok: true });
}));
router.delete('/users/:id', auth, adminOnly, wrap(async (req, res) => {
  if (+req.params.id === req.user.id) return bad(res, 400, 'Tidak bisa menghapus akun sendiri.');
  await db.query('DELETE FROM sessions WHERE user_id = ?', [+req.params.id]);
  await db.query('DELETE FROM users WHERE id = ?', [+req.params.id]);
  res.json({ ok: true });
}));

/* ---------------- data aplikasi ---------------- */
async function loadState(userId) {
  const state = { settings: {}, classes: [], subjects: [], assessments: [], questionSets: [], scores: {}, submissions: {} };
  for (const d of await db.query('SELECT kind, data FROM docs')) {
    const obj = parseJSON(d.data, null);
    if (!obj) continue;
    if (d.kind === 'settings') state.settings = obj;
    else if (state[d.kind]) state[d.kind].push(obj);
  }
  for (const s of await db.query('SELECT assessment_id a, student_id s, value FROM scores')) {
    (state.scores[s.a] = state.scores[s.a] || {})[s.s] = parseJSON(s.value, null);
  }
  for (const s of await db.query('SELECT assessment_id a, student_id s, data FROM submissions')) {
    (state.submissions[s.a] = state.submissions[s.a] || {})[s.s] = parseJSON(s.data, null);
  }
  const byCreated = (a, b) => (a.created || 0) - (b.created || 0);
  state.classes.sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.name).localeCompare(String(b.name), 'id', { numeric: true }));
  state.subjects.sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.name).localeCompare(String(b.name), 'id'));
  state.assessments.sort(byCreated); state.questionSets.sort(byCreated);
  if (userId) {
    const u = await db.query('SELECT theme FROM users WHERE id = ?', [userId]);
    state.theme = u.length ? parseJSON(u[0].theme, null) : null;
  }
  return state;
}

router.get('/state', auth, wrap(async (req, res) => {
  const state = await loadState(req.user.id);
  res.json({ state, user: publicUser(req.user) });
}));

function examCodeOf(kind, data) {
  return kind === 'assessments' && data && data.examOpen && data.examCode ? String(data.examCode).toUpperCase().slice(0, 16) : null;
}

/** Terapkan perubahan (diff) dari browser dalam satu transaksi. */
router.post('/sync', auth, wrap(async (req, res) => {
  const b = req.body || {};
  const uid = req.user.id;
  let n = 0;
  await db.tx(async q => {
    for (const d of b.docs || []) {
      if (!DOC_KINDS.includes(d.kind) || !cleanId(d.id) || typeof d.data !== 'object') continue;
      await q('INSERT INTO docs (kind, id, data, exam_code, updated_by) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE data = VALUES(data), exam_code = VALUES(exam_code), updated_by = VALUES(updated_by)',
        [d.kind, d.id, JSON.stringify(d.data), examCodeOf(d.kind, d.data), uid]);
      n++;
    }
    for (const d of b.delDocs || []) {
      if (!DOC_KINDS.includes(d.kind) || !cleanId(d.id)) continue;
      await q('DELETE FROM docs WHERE kind = ? AND id = ?', [d.kind, d.id]); n++;
    }
    for (const s of b.scores || []) {
      if (!cleanId(s.a) || !cleanId(s.s)) continue;
      await q('INSERT INTO scores (assessment_id, student_id, value) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value = VALUES(value)', [s.a, s.s, JSON.stringify(s.v)]); n++;
    }
    for (const s of b.delScores || []) {
      if (!cleanId(s.a)) continue;
      if (s.s === '*') await q('DELETE FROM scores WHERE assessment_id = ?', [s.a]);
      else if (cleanId(s.s)) await q('DELETE FROM scores WHERE assessment_id = ? AND student_id = ?', [s.a, s.s]);
      n++;
    }
    for (const s of b.subs || []) {
      if (!cleanId(s.a) || !cleanId(s.s)) continue;
      await q('INSERT INTO submissions (assessment_id, student_id, data) VALUES (?,?,?) ON DUPLICATE KEY UPDATE data = VALUES(data)', [s.a, s.s, JSON.stringify(s.d)]); n++;
    }
    for (const s of b.delSubs || []) {
      if (!cleanId(s.a)) continue;
      if (s.s === '*') await q('DELETE FROM submissions WHERE assessment_id = ?', [s.a]);
      else if (cleanId(s.s)) await q('DELETE FROM submissions WHERE assessment_id = ? AND student_id = ?', [s.a, s.s]);
      n++;
    }
    if (b.theme && typeof b.theme === 'object') { await q('UPDATE users SET theme = ? WHERE id = ?', [JSON.stringify(b.theme), uid]); n++; }
  });
  res.json({ ok: true, applied: n });
}));

/** Ganti seluruh data (pulihkan cadangan / hapus semua). Khusus admin. */
router.post('/import', auth, adminOnly, wrap(async (req, res) => {
  const d = req.body && req.body.state;
  if (!d || !Array.isArray(d.classes)) return bad(res, 400, 'Format cadangan tidak dikenali.');
  await db.tx(async q => {
    await q('DELETE FROM docs'); await q('DELETE FROM scores'); await q('DELETE FROM submissions');
    if (d.settings) await q('INSERT INTO docs (kind, id, data) VALUES (?,?,?)', ['settings', 'main', JSON.stringify(d.settings)]);
    for (const kind of ['classes', 'subjects', 'assessments', 'questionSets']) {
      for (const it of d[kind] || []) if (it && cleanId(it.id)) await q('INSERT INTO docs (kind, id, data, exam_code) VALUES (?,?,?,?)', [kind, it.id, JSON.stringify(it), examCodeOf(kind, it)]);
    }
    for (const a in d.scores || {}) for (const s in d.scores[a]) if (cleanId(a) && cleanId(s)) await q('INSERT INTO scores (assessment_id, student_id, value) VALUES (?,?,?)', [a, s, JSON.stringify(d.scores[a][s])]);
    for (const a in d.submissions || {}) for (const s in d.submissions[a]) if (cleanId(a) && cleanId(s)) await q('INSERT INTO submissions (assessment_id, student_id, data) VALUES (?,?,?)', [a, s, JSON.stringify(d.submissions[a][s])]);
  });
  res.json({ ok: true });
}));

/* ---------------- ujian online murid (tanpa login guru) ---------------- */
async function examByCode(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) return null;
  const rows = await db.query('SELECT data FROM docs WHERE kind = ? AND exam_code = ?', ['assessments', code]);
  if (!rows.length) return null;
  const a = parseJSON(rows[0].data, null);
  if (!a || !a.examOpen || !a.qsetId) return null;
  const load = async (kind, id) => { const r = await db.query('SELECT data FROM docs WHERE kind = ? AND id = ?', [kind, id]); return r.length ? parseJSON(r[0].data, null) : null; };
  const [qset, cls, subj, settings] = await Promise.all([load('questionSets', a.qsetId), load('classes', a.classId), load('subjects', a.subjectId), load('settings', 'main')]);
  if (!qset || !cls) return null;
  return { a, qset, cls, subj, settings: settings || {} };
}
function normNis(v) { return String(v || '').trim().toLowerCase(); }
function checkStudent(ex, studentId, nis) {
  const st = ex.cls.students.find(s => s.id === studentId);
  if (!st) return { err: 'Nama murid tidak ditemukan.' };
  if (st.nis && normNis(st.nis) !== normNis(nis)) return { err: 'NIS tidak cocok. Tanyakan NIS kamu ke guru.' };
  return { st };
}
function shuffle(arr, seed) {
  // Acak deterministik per murid agar urutan tetap sama saat halaman dimuat ulang
  let h = 2166136261;
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = out[i]; out[i] = out[j]; out[j] = t; }
  return out;
}

router.get('/exam/:code', wrap(async (req, res) => {
  const ex = await examByCode(req.params.code);
  if (!ex) return bad(res, 404, 'Token ujian tidak ditemukan atau ujian sudah ditutup.');
  const done = new Set((await db.query('SELECT student_id FROM submissions WHERE assessment_id = ?', [ex.a.id])).map(r => r.student_id));
  res.json({
    assessment: { title: ex.a.title, type: ex.a.type, duration: +ex.a.duration || 0, questionCount: ex.qset.questions.length },
    className: ex.cls.name, subjectName: ex.subj ? ex.subj.name : '', schoolName: ex.settings.schoolName || '',
    students: ex.cls.students.map(s => ({ id: s.id, name: s.name, needNis: !!s.nis, done: done.has(s.id) }))
  });
}));

router.post('/exam/:code/start', wrap(async (req, res) => {
  const ex = await examByCode(req.params.code);
  if (!ex) return bad(res, 404, 'Token ujian tidak ditemukan atau ujian sudah ditutup.');
  const { studentId, nis } = req.body || {};
  const k = lockKey(req, 'exam:' + studentId);
  if (isLocked(k)) return bad(res, 429, 'Terlalu banyak percobaan. Tunggu 10 menit.');
  const chk = checkStudent(ex, studentId, nis);
  if (chk.err) { addFail(k); return bad(res, 401, chk.err); }
  const sub = await db.query('SELECT data FROM submissions WHERE assessment_id = ? AND student_id = ?', [ex.a.id, studentId]);
  if (sub.length) {
    const d = parseJSON(sub[0].data, {});
    return res.json({ submitted: true, result: ex.a.hideScore ? null : { score: d.result && d.result.score, needsReview: d.result && d.result.needsReview } });
  }
  let questions = ex.qset.questions.filter(q => QT.TYPES[q.type]).map(q => QT.publicView(q, ex.a.id + studentId + q.id));
  if (ex.a.shuffle) questions = shuffle(questions, ex.a.id + studentId);
  res.json({ submitted: false, student: { id: chk.st.id, name: chk.st.name }, questions, duration: +ex.a.duration || 0, serverTime: Date.now() });
}));

router.post('/exam/:code/submit', wrap(async (req, res) => {
  const ex = await examByCode(req.params.code);
  if (!ex) return bad(res, 404, 'Token ujian tidak ditemukan atau ujian sudah ditutup.');
  const { studentId, nis, answers, startedAt } = req.body || {};
  const chk = checkStudent(ex, studentId, nis);
  if (chk.err) return bad(res, 401, chk.err);
  const clean = {};
  const ids = new Set(ex.qset.questions.map(q => q.id));
  for (const k in (answers || {})) if (ids.has(k)) { const v = String(answers[k] == null ? '' : answers[k]); clean[k] = /^data:(image|audio)\//.test(v) && v.length < 4000000 ? v : v.slice(0, 5000); }
  const result = P.grade(ex.qset.questions, clean);
  const kktp = +ex.settings.kktp || 75;
  const cap = ex.settings.remedialCap !== false ? kktp : 100;
  const out = await db.tx(async q => {
    const ex1 = await q('SELECT 1 FROM submissions WHERE assessment_id = ? AND student_id = ? FOR UPDATE', [ex.a.id, studentId]);
    if (ex1.length) return { dup: true };
    const sub = { answers: clean, manual: {}, result, at: Date.now(), duration: startedAt ? Math.max(0, Math.round((Date.now() - +startedAt) / 1000)) : null, online: true };
    await q('INSERT INTO submissions (assessment_id, student_id, data) VALUES (?,?,?)', [ex.a.id, studentId, JSON.stringify(sub)]);
    // Simpan nilai, pertahankan catatan/remedial bila ada
    const prev = await q('SELECT value FROM scores WHERE assessment_id = ? AND student_id = ? FOR UPDATE', [ex.a.id, studentId]);
    let val = result.score;
    const pv = prev.length ? parseJSON(prev[0].value, null) : null;
    if (pv && typeof pv === 'object') {
      val = Object.assign({}, pv, { score: result.score });
      if (typeof val.remedial === 'number' && result.score < kktp) val.final = Math.max(result.score, Math.min(val.remedial, cap));
      else { delete val.remedial; delete val.final; }
    }
    await q('INSERT INTO scores (assessment_id, student_id, value) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value = VALUES(value)', [ex.a.id, studentId, JSON.stringify(val)]);
    return { dup: false };
  });
  if (out.dup) return bad(res, 409, 'Jawaban kamu sudah pernah dikumpulkan.');
  res.json({ ok: true, result: ex.a.hideScore ? null : { score: result.score, earned: result.earned, total: result.total, needsReview: result.needsReview } });
}));

module.exports = { router, hashPassword, verifyPassword, loadState };
