<?php
/*
 * Asesmen Merdeka — pustaka bersama API PHP (database, langganan/SaaS, penilaian).
 * Kompatibel PHP 7.2+.
 */
if (!defined('APP_VERSION')) exit;

/* ================= util ================= */
function out($data, $code = 200) {
  http_response_code($code);
  echo is_string($data) ? $data : json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function bad($code, $msg, $extra = null) { $o = array('error' => $msg); if ($extra) $o = array_merge($o, $extra); out($o, $code); }
function jenc($v) { return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); }
function prop($o, $k, $d = null) { return (is_object($o) && property_exists($o, $k)) ? $o->$k : $d; }
function clean_id($v) { return (is_string($v) && strlen($v) > 0 && strlen($v) <= 64) ? $v : null; }
function client_ip() { return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : ''; }
function str_cut($s, $n) { $s = trim((string)$s); return function_exists('mb_substr') ? mb_substr($s, 0, $n) : substr($s, 0, $n); }
function log_error($msg) {
  @file_put_contents(__DIR__ . '/log-error.php', '<?php exit; ?> ' . date('c') . ' ' . $msg . "\n", FILE_APPEND);
}

/* ================= database ================= */
function pdo_connect($c) {
  $port = isset($c['port']) && $c['port'] ? (int)$c['port'] : 3306;
  $dsn = 'mysql:host=' . $c['host'] . ';port=' . $port . ';dbname=' . $c['name'] . ';charset=utf8mb4';
  return new PDO($dsn, $c['user'], $c['pass'], array(
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => true
  ));
}
function db() {
  static $pdo = null;
  global $CFG;
  if ($pdo) return $pdo;
  $pdo = pdo_connect($CFG);
  return $pdo;
}
function q($sql, $params = array()) { $st = db()->prepare($sql); $st->execute($params); return $st; }
function rows($sql, $params = array()) { return q($sql, $params)->fetchAll(); }
function one($sql, $params = array()) { $r = rows($sql, $params); return $r ? $r[0] : null; }

function explain_db($e) {
  $m = $e->getMessage(); $code = 0;
  if (preg_match('/SQLSTATE\[\w+\]\s*\[(\d+)\]/', $m, $mm)) $code = (int)$mm[1];
  elseif (isset($e->errorInfo[1])) $code = (int)$e->errorInfo[1];
  if ($code === 1045 || $code === 1044) return 'Database menolak login: periksa nama user dan password database, dan pastikan user sudah ditambahkan ke database dengan ALL PRIVILEGES (cPanel → MySQL Databases).';
  if ($code === 1049) return 'Database tidak ditemukan: periksa nama database. Di cPanel nama database diawali nama akun, mis. akunanda_asesmen.';
  if ($code === 2002 || $code === 2005 || $code === 2006) return 'Tidak bisa menghubungi server database: periksa host database (biasanya localhost).';
  if ($code === 1142 || $code === 1227) return 'User database tidak punya izin yang cukup: beri ALL PRIVILEGES di cPanel → MySQL Databases.';
  return null;
}

function schema() {
  $e = ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
  return array(
    "CREATE TABLE IF NOT EXISTS tenants (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      plan VARCHAR(32) NOT NULL DEFAULT 'trial',
      paid_until DATETIME NULL,
      suspended TINYINT NOT NULL DEFAULT 0,
      contact_name VARCHAR(150) NULL,
      contact_email VARCHAR(150) NULL,
      contact_phone VARCHAR(40) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )$e",
    "CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT UNSIGNED NULL,
      username VARCHAR(150) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      pass_hash VARCHAR(255) NOT NULL,
      role VARCHAR(16) NOT NULL DEFAULT 'guru',
      is_super TINYINT NOT NULL DEFAULT 0,
      theme TEXT NULL,
      email VARCHAR(150) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (tenant_id)
    )$e",
    "CREATE TABLE IF NOT EXISTS pw_resets (
      token_hash CHAR(64) NOT NULL PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      expires INT NOT NULL,
      used TINYINT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (user_id)
    )$e",
    "CREATE TABLE IF NOT EXISTS sessions (
      token CHAR(64) NOT NULL PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      expires_at DATETIME NOT NULL,
      INDEX (user_id)
    )$e",
    "CREATE TABLE IF NOT EXISTS docs (
      tenant_id INT UNSIGNED NOT NULL DEFAULT 1,
      kind VARCHAR(32) NOT NULL,
      id VARCHAR(64) NOT NULL,
      data LONGTEXT NOT NULL,
      exam_code VARCHAR(16) NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by INT UNSIGNED NULL,
      PRIMARY KEY (tenant_id, kind, id),
      INDEX (exam_code)
    )$e",
    "CREATE TABLE IF NOT EXISTS scores (
      tenant_id INT UNSIGNED NOT NULL DEFAULT 1,
      assessment_id VARCHAR(64) NOT NULL,
      student_id VARCHAR(64) NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, assessment_id, student_id)
    )$e",
    "CREATE TABLE IF NOT EXISTS submissions (
      tenant_id INT UNSIGNED NOT NULL DEFAULT 1,
      assessment_id VARCHAR(64) NOT NULL,
      student_id VARCHAR(64) NOT NULL,
      data LONGTEXT NOT NULL,
      submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, assessment_id, student_id)
    )$e",
    "CREATE TABLE IF NOT EXISTS payments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT UNSIGNED NOT NULL,
      user_id INT UNSIGNED NULL,
      plan_id VARCHAR(32) NOT NULL,
      plan_name VARCHAR(100) NOT NULL,
      months INT NOT NULL,
      amount INT UNSIGNED NOT NULL,
      proof LONGTEXT NULL,
      note TEXT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      admin_note TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      decided_at DATETIME NULL,
      INDEX (tenant_id), INDEX (status)
    )$e",
    "CREATE TABLE IF NOT EXISTS platform (
      k VARCHAR(64) NOT NULL PRIMARY KEY,
      v LONGTEXT NOT NULL
    )$e",
    "CREATE TABLE IF NOT EXISTS games (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT UNSIGNED NOT NULL,
      code VARCHAR(10) NOT NULL,
      title VARCHAR(200) NOT NULL,
      data LONGTEXT NOT NULL,
      class_id VARCHAR(64) NULL,
      subject_id VARCHAR(64) NULL,
      status VARCHAR(12) NOT NULL DEFAULT 'lobby',
      created_by INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME NULL,
      ended_at DATETIME NULL,
      INDEX (code), INDEX (tenant_id)
    )$e",
    "CREATE TABLE IF NOT EXISTS game_players (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      game_id INT UNSIGNED NOT NULL,
      token CHAR(32) NOT NULL UNIQUE,
      nickname VARCHAR(60) NOT NULL,
      avatar VARCHAR(16) NOT NULL DEFAULT '',
      student_id VARCHAR(64) NULL,
      score INT NOT NULL DEFAULT 0,
      correct INT NOT NULL DEFAULT 0,
      answered INT NOT NULL DEFAULT 0,
      streak INT NOT NULL DEFAULT 0,
      best_streak INT NOT NULL DEFAULT 0,
      cur INT NOT NULL DEFAULT -1,
      cur_started BIGINT NOT NULL DEFAULT 0,
      cur_open TINYINT NOT NULL DEFAULT 0,
      qorder TEXT NULL,
      answers LONGTEXT NULL,
      joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME NULL,
      exam_score DECIMAL(6,2) NULL,
      violations INT NOT NULL DEFAULT 0,
      started_ms BIGINT NOT NULL DEFAULT 0,
      flags TEXT NULL,
      extra LONGTEXT NULL,
      INDEX (game_id)
    )$e",
    "CREATE TABLE IF NOT EXISTS media (
      id CHAR(24) NOT NULL PRIMARY KEY,
      tenant_id INT UNSIGNED NOT NULL,
      data LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (tenant_id)
    )$e",
    "CREATE TABLE IF NOT EXISTS exam_drafts (
      tenant_id INT UNSIGNED NOT NULL,
      assessment_id VARCHAR(64) NOT NULL,
      student_id VARCHAR(64) NOT NULL,
      data LONGTEXT NOT NULL,
      started_ms BIGINT NOT NULL DEFAULT 0,
      reopened_ms BIGINT NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, assessment_id, student_id)
    )$e",
    "CREATE TABLE IF NOT EXISTS login_fails (
      k VARCHAR(190) NOT NULL PRIMARY KEY,
      n INT NOT NULL DEFAULT 0,
      t INT NOT NULL DEFAULT 0
    )$e"
  );
}

function has_column($pdo, $table, $col) {
  $st = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE ?"); $st->execute(array($col));
  return (bool)$st->fetch();
}
function has_table($pdo, $table) {
  $st = $pdo->prepare('SHOW TABLES LIKE ?'); $st->execute(array($table));
  return (bool)$st->fetch();
}

/** Buat tabel & naikkan struktur dari versi sekolah-tunggal (3.2) ke multi-sekolah (SaaS). */
function migrate($pdo = null) {
  $pdo = $pdo ? $pdo : db();
  $hadUsers = has_table($pdo, 'users');
  $hadPlayers = has_table($pdo, 'game_players');
  $hadTenants = has_table($pdo, 'tenants');
  foreach (schema() as $sql) $pdo->exec($sql);
  if ($hadPlayers && !has_column($pdo, 'game_players', 'violations')) {
    $pdo->exec('ALTER TABLE game_players ADD exam_score DECIMAL(6,2) NULL, ADD violations INT NOT NULL DEFAULT 0, ADD started_ms BIGINT NOT NULL DEFAULT 0, ADD flags TEXT NULL, ADD extra LONGTEXT NULL');
  }
  if (!has_column($pdo, 'users', 'email')) $pdo->exec('ALTER TABLE users ADD email VARCHAR(150) NULL AFTER theme');
  if ($hadUsers && !has_column($pdo, 'users', 'tenant_id')) {
    $pdo->exec('ALTER TABLE users ADD tenant_id INT UNSIGNED NULL AFTER id, ADD is_super TINYINT NOT NULL DEFAULT 0 AFTER role, MODIFY username VARCHAR(150) NOT NULL');
    foreach (array('docs' => 'kind, id', 'scores' => 'assessment_id, student_id', 'submissions' => 'assessment_id, student_id') as $t => $pk) {
      if (!has_column($pdo, $t, 'tenant_id')) $pdo->exec("ALTER TABLE `$t` ADD tenant_id INT UNSIGNED NOT NULL DEFAULT 1 FIRST, DROP PRIMARY KEY, ADD PRIMARY KEY (tenant_id, $pk)");
    }
    // Data lama menjadi sekolah #1 milik pemilik platform (tanpa batas waktu)
    $name = 'Sekolah Saya';
    $st = $pdo->query("SELECT data FROM docs WHERE kind = 'settings' AND id = 'main'");
    $r = $st ? $st->fetch() : null;
    if ($r) { $s = json_decode($r['data']); if ($s && !empty($s->schoolName)) $name = $s->schoolName; }
    if (!$hadTenants || !$pdo->query('SELECT COUNT(*) FROM tenants')->fetchColumn()) {
      $pdo->prepare('INSERT INTO tenants (id, name, plan, paid_until) VALUES (1, ?, ?, NULL)')->execute(array($name, 'unlimited'));
    }
    $pdo->exec('UPDATE users SET tenant_id = 1');
    $pdo->exec("UPDATE users SET is_super = 1 WHERE id = (SELECT id FROM (SELECT MIN(id) AS id FROM users WHERE role = 'admin') x)");
  }
}

/* ================= pengaturan platform (harga, rekening) ================= */
function default_platform() {
  return array(
    'brand' => 'Asesmen Merdeka',
    'tagline' => 'Asesmen Kurikulum Merdeka, nilai rapor otomatis, dan ujian online dalam satu aplikasi.',
    'trialDays' => 14,
    'plans' => array(
      array('id' => 'bulanan', 'name' => 'Bulanan', 'price' => 49000, 'months' => 1, 'desc' => 'Fleksibel, bayar per bulan'),
      array('id' => 'semester', 'name' => 'Per Semester', 'price' => 249000, 'months' => 6, 'desc' => 'Hemat ±15% dibanding bulanan'),
      array('id' => 'tahunan', 'name' => 'Tahunan', 'price' => 449000, 'months' => 12, 'desc' => 'Paling hemat untuk satu tahun ajaran')
    ),
    'bankInfo' => "Bank: (isi nama bank)\nNo. Rekening: (isi nomor rekening)\nAtas Nama: (isi nama pemilik rekening)",
    'whatsapp' => '',
    'email' => ''
  );
}
function platform() {
  static $cache = null;
  if ($cache) return $cache;
  $d = default_platform();
  $r = one('SELECT v FROM platform WHERE k = ?', array('config'));
  if ($r) { $v = json_decode($r['v'], true); if (is_array($v)) $d = array_merge($d, $v); }
  return $cache = $d;
}
function public_platform() {
  $p = platform();
  return array('brand' => $p['brand'], 'tagline' => $p['tagline'], 'trialDays' => (int)$p['trialDays'], 'plans' => $p['plans'], 'whatsapp' => $p['whatsapp'], 'email' => $p['email']);
}
function find_plan($id) { foreach (platform()['plans'] as $p) if ($p['id'] === $id) return $p; return null; }

/* ================= sekolah (tenant) & langganan ================= */
function tenant_info($t) {
  if (!is_array($t)) $t = one('SELECT * FROM tenants WHERE id = ?', array((int)$t));
  if (!$t) return null;
  $unlimited = $t['paid_until'] === null;
  $until = $unlimited ? null : strtotime($t['paid_until']);
  $active = !$t['suspended'] && ($unlimited || $until >= time());
  $status = $t['suspended'] ? 'suspended' : ($unlimited ? 'unlimited' : (!$active ? 'expired' : ($t['plan'] === 'trial' ? 'trial' : 'active')));
  return array(
    'id' => (int)$t['id'], 'name' => $t['name'], 'plan' => $t['plan'], 'status' => $status, 'active' => $active,
    'paidUntil' => $unlimited ? null : date('c', $until),
    'daysLeft' => $unlimited ? null : max(0, (int)ceil(($until - time()) / 86400)),
    'uniqueCode' => 100 + ((int)$t['id'] * 37) % 900
  );
}

/* ================= pembatas percobaan ================= */
function lock_key($u) { return substr(client_ip() . '|' . strtolower((string)$u), 0, 190); }
function is_locked($k, $max = 8) { $r = one('SELECT n, t FROM login_fails WHERE k = ?', array($k)); return $r && $r['n'] >= $max && time() - $r['t'] < 600; }
function add_fail($k) {
  $r = one('SELECT n, t FROM login_fails WHERE k = ?', array($k));
  $n = ($r && time() - $r['t'] < 600) ? $r['n'] + 1 : 1;
  q('REPLACE INTO login_fails (k, n, t) VALUES (?,?,?)', array($k, $n, time()));
}
function clear_fail($k) { q('DELETE FROM login_fails WHERE k = ?', array($k)); }

/* ================= akun ================= */
function valid_password($p) { return is_string($p) && strlen($p) >= 6 && strlen($p) <= 200; }
function valid_username($u) { return is_string($u) && preg_match('/^[a-zA-Z0-9._@+-]{3,150}$/', $u); }
function valid_email($e) { return is_string($e) && filter_var($e, FILTER_VALIDATE_EMAIL) && strlen($e) <= 150; }
function public_user($u) {
  return array('id' => (int)$u['id'], 'username' => $u['username'], 'name' => $u['name'], 'email' => isset($u['email']) ? $u['email'] : null, 'role' => $u['role'], 'super' => !empty($u['is_super']), 'tenantId' => $u['tenant_id'] === null ? null : (int)$u['tenant_id']);
}
function new_session($uid) {
  $token = bin2hex(random_bytes(32));
  q('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)', array($token, $uid, date('Y-m-d H:i:s', time() + SESSION_DAYS * 86400)));
  q('DELETE FROM sessions WHERE expires_at < NOW()');
  return $token;
}
function bearer_token() {
  if (!empty($_SERVER['HTTP_X_AUTH_TOKEN'])) return trim($_SERVER['HTTP_X_AUTH_TOKEN']);
  $h = '';
  foreach (array('HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION') as $k) if (!empty($_SERVER[$k])) { $h = $_SERVER[$k]; break; }
  if (!$h && function_exists('apache_request_headers')) foreach (apache_request_headers() as $k => $v) if (strtolower($k) === 'authorization') $h = $v;
  return stripos($h, 'Bearer ') === 0 ? trim(substr($h, 7)) : '';
}
function auth() {
  $t = bearer_token();
  if (!preg_match('/^[a-f0-9]{64}$/', $t)) bad(401, 'Silakan login.');
  $u = one('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > NOW()', array($t));
  if (!$u) bad(401, 'Sesi berakhir, silakan login lagi.');
  $GLOBALS['TOKEN'] = $t;
  return $u;
}
function admin_only($u) { if ($u['role'] !== 'admin') bad(403, 'Hanya admin sekolah.'); }
function super_only($u) { if (empty($u['is_super'])) bad(403, 'Hanya pemilik platform.'); }
function tenant_of($u) { return (int)$u['tenant_id']; }
function require_active($u) {
  $t = tenant_info(tenant_of($u));
  if (!$t || !$t['active']) bad(402, $t && $t['status'] === 'suspended' ? 'Akun sekolah dinonaktifkan. Hubungi pengelola.' : 'Masa langganan sekolah berakhir. Perpanjang di menu Langganan.', array('subscription' => $t));
  return $t;
}

/* ================= penilaian (sama dengan public/js/parser.js) ================= */
function norm_bs($v) {
  $s = preg_replace('/[^a-z]/', '', strtolower((string)$v));
  if (preg_match('/^(b|benar|t|true|betul|ya)$/', $s)) return 'B';
  if (preg_match('/^(s|salah|f|false|tidak)$/', $s)) return 'S';
  return null;
}
function lower($s) { return function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s); }
function norm_answer($s) {
  $s = lower((string)$s);
  if (class_exists('Normalizer')) { $n = Normalizer::normalize($s, Normalizer::FORM_KD); if ($n !== false) $s = preg_replace('/\p{Mn}+/u', '', $n); }
  $s = preg_replace('/[^\p{L}\p{N}\s.,-]/u', ' ', $s);
  $s = preg_replace('/[.,](?!\d)/u', ' ', $s);
  return trim(preg_replace('/\s+/u', ' ', $s));
}
function str_len($s) { return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s); }
function lev($a, $b) {
  if ($a === $b) return 0;
  $a = preg_split('//u', $a, -1, PREG_SPLIT_NO_EMPTY); $b = preg_split('//u', $b, -1, PREG_SPLIT_NO_EMPTY);
  $m = count($a); $n = count($b);
  if (!$m) return $n; if (!$n) return $m;
  $prev = range(0, $n);
  for ($i = 1; $i <= $m; $i++) {
    $cur = array($i);
    for ($j = 1; $j <= $n; $j++) $cur[$j] = min($prev[$j] + 1, $cur[$j - 1] + 1, $prev[$j - 1] + ($a[$i - 1] === $b[$j - 1] ? 0 : 1));
    $prev = $cur;
  }
  return $prev[$n];
}
function match_short($given, $key) {
  $g = norm_answer($given);
  if ($g === '' || $key === null || $key === '') return false;
  $alts = array_filter(array_map('norm_answer', preg_split('/\s*(?:\/|;|\||\batau\b|\bor\b)\s*/iu', (string)$key)), 'strlen');
  foreach ($alts as $a) {
    if ($g === $a) return true;
    if (preg_match('/^-?[\d.,]+$/', $g) && preg_match('/^-?[\d.,]+$/', $a) && abs((float)str_replace(',', '.', $g) - (float)str_replace(',', '.', $a)) < 1e-9) return true;
    if (str_len($a) >= 5 && lev($g, $a) <= floor(str_len($a) * 0.15)) return true;
  }
  return false;
}
function suggest_essay($given, $key, $points) {
  $stop = array_flip(explode(' ', 'yang dan di ke dari untuk pada adalah dengan atau ini itu dalam oleh karena juga akan sebagai tidak bisa dapat secara'));
  $words = function ($s) use ($stop) {
    $out = array();
    foreach (explode(' ', norm_answer($s)) as $w) if (str_len($w) > 2 && !isset($stop[$w])) $out[] = $w;
    return $out;
  };
  $k = array_values(array_unique($words($key)));
  $g = array_unique($words($given));
  if (!$k || !$g) return 0;
  $hit = 0;
  foreach ($k as $w) {
    $ok = in_array($w, $g, true);
    if (!$ok) foreach ($g as $x) {
      if (str_len($x) > 4 && (strpos($x, mb_substr($w, 0, 5)) === 0 || strpos($w, mb_substr($x, 0, 5)) === 0)) { $ok = true; break; }
    }
    if ($ok) $hit++;
  }
  $ratio = min(1, $hit / max(3, (int)ceil(count($k) * 0.6)));
  return round($ratio * $points * 2) / 2;
}
function default_points($t) {
  $d = array('pg' => 1, 'pgk' => 2, 'bs' => 1, 'isian' => 2, 'angka' => 2, 'uraian' => 4, 'jodoh' => 4, 'urut' => 3, 'kelompok' => 4, 'seret' => 3, 'dropdown' => 3, 'titik' => 2, 'label' => 4, 'gambar' => 5, 'suara' => 5, 'polling' => 0, 'slide' => 0);
  return isset($d[$t]) ? $d[$t] : 1;
}
function q_types() { return array('pg', 'pgk', 'bs', 'isian', 'angka', 'jodoh', 'urut', 'kelompok', 'seret', 'dropdown', 'titik', 'label', 'uraian', 'gambar', 'suara', 'polling', 'slide'); }
function manual_type($t) { return in_array($t, array('uraian', 'gambar', 'suara'), true); }
function ungraded_type($t) { return in_array($t, array('polling', 'slide'), true); }
/** Jenis yang bisa dipakai di Kuis Seru mode Permainan. */
function game_type($t) { return in_array($t, array('pg', 'pgk', 'bs', 'isian', 'angka', 'jodoh', 'urut', 'kelompok', 'seret', 'dropdown', 'titik', 'label', 'polling', 'slide'), true); }
function arr_of($v) { return is_array($v) ? $v : (is_object($v) ? (array)$v : array()); }
function json_ans($v) {
  if (is_array($v)) return $v;
  $j = json_decode((string)$v, true);
  return is_array($j) ? $j : null;
}
function blanks_of($text) { preg_match_all('/\[\[(.+?)\]\]/u', (string)$text, $m); return $m[1]; }
function label_set($v) {
  $p = preg_split('/[^A-H]+/', strtoupper((string)$v), -1, PREG_SPLIT_NO_EMPTY);
  $p = array_values(array_unique($p)); sort($p); return $p;
}
function num_of($v) {
  $s = str_replace(',', '.', preg_replace('/\s/', '', trim((string)$v)));
  return preg_match('/^-?\d+(\.\d+)?/', $s, $m) ? (float)$m[0] : null;
}
function is_answered($ans) {
  if ($ans === null) return false;
  if (is_array($ans)) { foreach ($ans as $x) if ($x !== null && $x !== '') return true; return false; }
  $s = trim((string)$ans); if ($s === '') return false;
  $j = json_decode($s, true);
  if (is_array($j)) { if (!$j) return false; foreach ($j as $x) if ($x !== null && $x !== '') return true; return false; }
  return true;
}
/** Apakah soal lengkap kuncinya (sama dengan QT.hasKey di qtypes.js). */
function has_key($q) {
  $t = prop($q, 'type');
  if (manual_type($t) || ungraded_type($t)) return true;
  if (in_array($t, array('pg', 'pgk', 'bs', 'isian', 'angka'), true)) { $k = prop($q, 'answer'); return $k !== null && $k !== ''; }
  if ($t === 'jodoh') { $n = 0; foreach (arr_of(prop($q, 'pairs', array())) as $p) { $p = arr_of($p); if (!empty($p['l']) && !empty($p['r'])) $n++; } return $n >= 2; }
  if ($t === 'urut') return count(array_filter(arr_of(prop($q, 'items', array())), 'strlen')) >= 2;
  if ($t === 'kelompok') { $n = 0; foreach (arr_of(prop($q, 'cats', array())) as $c) { $c = arr_of($c); if (!empty($c['name']) && !empty($c['items'])) $n++; } return $n >= 2; }
  if ($t === 'seret' || $t === 'dropdown') return count(blanks_of(prop($q, 'text', ''))) > 0;
  if ($t === 'titik') return prop($q, 'image') && prop($q, 'spot');
  if ($t === 'label') { $m = arr_of(prop($q, 'marks', array())); if (!prop($q, 'image') || !$m) return false; foreach ($m as $x) { $x = arr_of($x); if (empty($x['label'])) return false; } return true; }
  return false;
}
/**
 * Nilai satu jawaban → pecahan 0..1, null (dinilai manual) atau false (tidak dinilai: polling/slide).
 * Sama dengan SoalParser.gradeOne di public/js/parser.js.
 */
function grade_one($q, $ans) {
  $t = prop($q, 'type'); $key = prop($q, 'answer');
  if (ungraded_type($t)) return false;
  if (manual_type($t)) return null;
  if (!is_answered($ans)) return 0;
  $a = is_array($ans) ? '' : trim((string)$ans);
  if ($t === 'pg') return ($key !== null && strtoupper($a) === strtoupper(trim((string)$key))) ? 1 : 0;
  if ($t === 'bs') return ($key !== null && norm_bs($a) !== null && norm_bs($a) === norm_bs($key)) ? 1 : 0;
  if ($t === 'isian') return match_short($a, $key) ? 1 : 0;
  if ($t === 'angka') { $x = num_of($a); $k = num_of($key); $tol = abs((float)prop($q, 'tol', 0)); return ($x !== null && $k !== null && abs($x - $k) <= $tol + 1e-9) ? 1 : 0; }
  if ($t === 'pgk') {
    $K = label_set($key); $A = label_set($a); if (!$K) return 0;
    $hit = count(array_intersect($A, $K)); $wrong = count($A) - $hit;
    return max(0, ($hit - $wrong) / count($K));
  }
  $j = json_ans($ans);
  if ($t === 'jodoh') { $n = count(arr_of(prop($q, 'pairs', array()))); if (!$n || !is_array($j)) return 0; $c = 0; for ($i = 0; $i < $n; $i++) if (isset($j[$i]) && $j[$i] !== null && $j[$i] !== '' && (int)$j[$i] === $i) $c++; return $c / $n; }
  if ($t === 'urut') { $n = count(arr_of(prop($q, 'items', array()))); if (!$n || !is_array($j)) return 0; $c = 0; for ($i = 0; $i < $n; $i++) if (isset($j[$i]) && is_numeric($j[$i]) && (int)$j[$i] === $i) $c++; return $c / $n; }
  if ($t === 'kelompok') {
    if (!is_array($j)) return 0; $n = 0; $c = 0;
    foreach (array_values(arr_of(prop($q, 'cats', array()))) as $ci => $cat) {
      $cat = arr_of($cat);
      foreach (array_values(arr_of(isset($cat['items']) ? $cat['items'] : array())) as $ii => $it) { $n++; $k = $ci . '-' . $ii; if (isset($j[$k]) && is_numeric($j[$k]) && (int)$j[$k] === $ci) $c++; }
    }
    return $n ? $c / $n : 0;
  }
  if ($t === 'seret') { $bl = blanks_of(prop($q, 'text', '')); if (!$bl || !is_array($j)) return 0; $c = 0; foreach ($bl as $i => $b) if (!empty($j[$i]) && match_short($j[$i], $b)) $c++; return $c / count($bl); }
  if ($t === 'dropdown') {
    $bl = blanks_of(prop($q, 'text', '')); if (!$bl || !is_array($j)) return 0; $c = 0;
    foreach ($bl as $i => $b) { $parts = explode('|', $b); $ok = lower(trim($parts[0])); if (isset($j[$i]) && $j[$i] !== null && lower(trim((string)$j[$i])) === $ok) $c++; }
    return $c / count($bl);
  }
  if ($t === 'titik') {
    $sp = arr_of(prop($q, 'spot')); if (!$sp) return 0;
    $m = explode(',', $a); if (count($m) < 2 || !is_numeric($m[0]) || !is_numeric($m[1])) return 0;
    $ar = !empty($sp['ar']) ? (float)$sp['ar'] : 1; $r = !empty($sp['r']) ? (float)$sp['r'] : 0.08;
    $dx = (float)$m[0] - (float)$sp['x']; $dy = ((float)$m[1] - (float)$sp['y']) * $ar;
    return sqrt($dx * $dx + $dy * $dy) <= $r ? 1 : 0;
  }
  if ($t === 'label') {
    $mk = array_values(arr_of(prop($q, 'marks', array()))); if (!$mk || !is_array($j)) return 0; $c = 0;
    foreach ($mk as $i => $m) { $m = arr_of($m); if (!empty($j[$i]) && norm_answer($j[$i]) === norm_answer(isset($m['label']) ? $m['label'] : '')) $c++; }
    return $c / count($mk);
  }
  return 0;
}
function grade($questions, $answers, $manual = array()) {
  $earned = 0; $total = 0; $needs = false; $detail = array();
  foreach ($questions as $q) {
    $type = prop($q, 'type');
    $ans = isset($answers[$q->id]) ? $answers[$q->id] : '';
    $f = grade_one($q, $ans);
    if ($f === false) { $detail[] = array('id' => $q->id, 'got' => 0, 'pts' => 0, 'status' => 'tidak dinilai', 'auto' => true); continue; }
    $pts = (float)prop($q, 'points', 0); if (!$pts) $pts = default_points($type); if (!$pts) $pts = 1;
    $total += $pts;
    $auto = $f !== null;
    if ($f === null) $got = $type === 'uraian' ? suggest_essay($ans, prop($q, 'answer'), $pts) : 0;
    else $got = round($f * $pts * 100) / 100;
    if (isset($manual[$q->id]) && $manual[$q->id] !== '' && $manual[$q->id] !== null) {
      $got = max(0, min($pts, (float)$manual[$q->id])); $auto = false; $status = 'dikoreksi';
    } elseif ($f === null) { $status = 'perlu koreksi'; if (is_answered($ans)) $needs = true; }
    else $status = $got >= $pts ? 'benar' : ($got > 0 ? 'sebagian' : 'salah');
    if (!is_answered($ans) && $status !== 'dikoreksi') $status = 'kosong';
    $earned += $got;
    $detail[] = array('id' => $q->id, 'got' => $got, 'pts' => $pts, 'status' => $status, 'auto' => $auto);
  }
  return array('score' => $total ? round($earned / $total * 10000) / 100 : 0, 'earned' => round($earned * 100) / 100, 'total' => $total, 'detail' => $detail, 'needsReview' => $needs);
}

/* ---------- versi soal untuk murid (tanpa kunci), sama dengan QT.publicView ---------- */
function seeded_shuffle($arr, $seed) {
  $h = crc32((string)$seed); $n = count($arr);
  for ($i = $n - 1; $i > 0; $i--) {
    $h = ($h * 1103515245 + 12345) & 0x7fffffff;
    $j = $h % ($i + 1);
    $t = $arr[$i]; $arr[$i] = $arr[$j]; $arr[$j] = $t;
  }
  return $arr;
}
function public_q($q, $seed = '', $shuffleOpt = false) {
  $t = prop($q, 'type'); $seed = $seed . $q->id;
  $v = array('id' => $q->id, 'type' => $t, 'text' => (string)prop($q, 'text', ''), 'image' => prop($q, 'image'), 'points' => prop($q, 'points'));
  $ps = prop($q, 'passage');
  if (is_object($ps) || is_array($ps)) { $ps = arr_of($ps); if (!empty($ps['text']) || !empty($ps['title']) || !empty($ps['image'])) $v['passage'] = array('id' => isset($ps['id']) ? (string)$ps['id'] : '', 'title' => isset($ps['title']) ? (string)$ps['title'] : '', 'text' => isset($ps['text']) ? (string)$ps['text'] : '', 'image' => isset($ps['image']) ? $ps['image'] : null); }
  if ($t === 'pg' || $t === 'pgk' || $t === 'polling') {
    $opts = array(); foreach (arr_of(prop($q, 'options', array())) as $o) { $o = arr_of($o); $opts[] = array('label' => $o['label'], 'text' => isset($o['text']) ? $o['text'] : ''); }
    $v['options'] = $shuffleOpt ? seeded_shuffle($opts, $seed . 'o') : $opts;
  }
  if ($t === 'pgk') $v['multi'] = true;
  if ($t === 'jodoh') {
    $l = array(); $r = array();
    foreach (array_values(arr_of(prop($q, 'pairs', array()))) as $i => $p) { $p = arr_of($p); $l[] = isset($p['l']) ? $p['l'] : ''; $r[] = array('id' => $i, 'text' => isset($p['r']) ? $p['r'] : ''); }
    $v['lefts'] = $l; $v['rights'] = seeded_shuffle($r, $seed . 'r');
  }
  if ($t === 'urut') { $it = array(); foreach (array_values(arr_of(prop($q, 'items', array()))) as $i => $x) $it[] = array('id' => $i, 'text' => $x); $sh = seeded_shuffle($it, $seed . 'u'); if (count($sh) > 1 && array_column($sh, 'id') === array_column($it, 'id')) $sh = array_reverse($sh); $v['items'] = $sh; }
  if ($t === 'kelompok') {
    $cats = array(); $it = array();
    foreach (array_values(arr_of(prop($q, 'cats', array()))) as $ci => $c) { $c = arr_of($c); $cats[] = isset($c['name']) ? $c['name'] : ''; foreach (array_values(arr_of(isset($c['items']) ? $c['items'] : array())) as $ii => $x) $it[] = array('id' => $ci . '-' . $ii, 'text' => $x); }
    $v['cats'] = $cats; $v['items'] = seeded_shuffle($it, $seed . 'k');
  }
  if ($t === 'seret' || $t === 'dropdown') {
    $bl = blanks_of($v['text']);
    $v['text'] = preg_replace('/\[\[(.+?)\]\]/u', '[[ ]]', $v['text']);
    if ($t === 'seret') {
      $chips = array(); foreach ($bl as $b) { $p = explode('/', $b); $chips[] = trim($p[0]); }
      foreach (explode(',', (string)prop($q, 'extra', '')) as $x) if (trim($x) !== '') $chips[] = trim($x);
      $v['chips'] = seeded_shuffle($chips, $seed . 's');
    } else {
      $drops = array(); foreach ($bl as $i => $b) $drops[] = seeded_shuffle(array_values(array_filter(array_map('trim', explode('|', $b)), 'strlen')), $seed . 'd' . $i);
      $v['drops'] = $drops;
    }
  }
  if ($t === 'label') {
    $marks = array(); $labels = array();
    foreach (arr_of(prop($q, 'marks', array())) as $m) { $m = arr_of($m); $marks[] = array('x' => $m['x'], 'y' => $m['y']); $labels[] = isset($m['label']) ? $m['label'] : ''; }
    $v['marks'] = $marks; $v['labels'] = seeded_shuffle($labels, $seed . 'l');
  }
  if ($t === 'suara') $v['maxSec'] = (int)prop($q, 'maxSec', 60) ?: 60;
  return $v;
}
/** Teks kunci jawaban untuk umpan balik di kuis. */
function key_text($q) {
  $t = prop($q, 'type'); $key = prop($q, 'answer');
  if ($t === 'pg' || $t === 'pgk') {
    $out = array();
    foreach (explode(',', (string)$key) as $l) { $txt = ''; foreach (arr_of(prop($q, 'options', array())) as $o) { $o = arr_of($o); if ($o['label'] === $l) $txt = isset($o['text']) ? $o['text'] : ''; } $out[] = $l . ($txt !== '' ? '. ' . $txt : ''); }
    return implode('; ', $out);
  }
  if ($t === 'bs') return norm_bs($key) === 'B' ? 'Benar' : 'Salah';
  if ($t === 'jodoh') { $o = array(); foreach (arr_of(prop($q, 'pairs', array())) as $p) { $p = arr_of($p); $o[] = $p['l'] . ' ↔ ' . $p['r']; } return implode('; ', $o); }
  if ($t === 'urut') { $o = array(); foreach (array_values(arr_of(prop($q, 'items', array()))) as $i => $x) $o[] = ($i + 1) . '. ' . $x; return implode('  ', $o); }
  if ($t === 'kelompok') { $o = array(); foreach (arr_of(prop($q, 'cats', array())) as $c) { $c = arr_of($c); $o[] = $c['name'] . ': ' . implode(', ', arr_of($c['items'])); } return implode(' | ', $o); }
  if ($t === 'seret') return implode(' · ', blanks_of(prop($q, 'text', '')));
  if ($t === 'dropdown') { $o = array(); foreach (blanks_of(prop($q, 'text', '')) as $b) { $p = explode('|', $b); $o[] = trim($p[0]); } return implode(' · ', $o); }
  if ($t === 'label') { $o = array(); foreach (array_values(arr_of(prop($q, 'marks', array()))) as $i => $m) { $m = arr_of($m); $o[] = ($i + 1) . '. ' . $m['label']; } return implode('  ', $o); }
  if ($t === 'titik') return 'bagian gambar yang ditandai guru';
  if ($t === 'angka') return (string)$key . ((float)prop($q, 'tol', 0) ? ' (±' . prop($q, 'tol') . ')' : '');
  return (string)$key;
}


/* ================= Kuis Seru (permainan live) ================= */
function now_ms() { return (int)round(microtime(true) * 1000); }
/** Nilai satu jawaban kuis: pecahan 0..1 (false = tidak dinilai). */
function game_check($q, $ans) {
  $f = grade_one($q, $ans);
  if ($f === false) return false;
  return $f === null ? 0 : (float)$f;
}
/** Simpan gambar/rekaman jawaban murid; kembalikan "media:ID". */
function store_media($tid, $data) {
  $data = (string)$data;
  if (!preg_match('#^data:(image/(jpeg|png|webp)|audio/(webm|ogg|mp4|mpeg|aac|x-m4a|wav))(;[a-z0-9=.+-]+)*;base64,[A-Za-z0-9+/=]+$#i', $data)) bad(400, 'Format berkas tidak didukung.');
  if (strlen($data) > 4000000) bad(413, 'Berkas terlalu besar (maks. ±3 MB). Rekam lebih singkat.');
  $id = bin2hex(random_bytes(12));
  q('INSERT INTO media (id, tenant_id, data) VALUES (?,?,?)', array($id, (int)$tid, $data));
  return 'media:' . $id;
}
/** Bersihkan satu jawaban dari murid: data gambar/suara dipindah ke tabel media. */
function clean_answer($tid, $v) {
  $v = is_scalar($v) ? (string)$v : '';
  if (strncmp($v, 'data:', 5) === 0) { try { return store_media($tid, $v); } catch (Exception $e) { return ''; } }
  return str_cut($v, 5000);
}
/** Poin: 500 dasar + bonus kecepatan s.d. 500 + bonus beruntun 100/soal (maks. 500). */
function game_points($ok, $elapsedMs, $limitMs, $streak, $speedBonus) {
  if (!$ok) return 0;
  $pts = 500;
  if ($speedBonus && $limitMs > 0) $pts += (int)round(500 * max(0, 1 - $elapsedMs / $limitMs));
  if ($streak > 1) $pts += min(500, ($streak - 1) * 100);
  return $pts;
}

/* ================= Mode Ujian ================= */
/** Nilai lembar ujian seorang pemain; mengembalikan hasil penilaian lengkap. */
function exam_grade_player($questionsArr, $p, $manual = null) {
  $qs = json_decode(json_encode($questionsArr));
  $ans = $p['answers'] ? json_decode($p['answers'], true) : array();
  $flat = array();
  foreach ((array)$ans as $k => $v) $flat[$k] = is_array($v) ? (string)(isset($v['a']) ? $v['a'] : '') : (string)$v;
  if ($manual === null) { $ex = $p['extra'] ? json_decode($p['extra'], true) : array(); $manual = isset($ex['manual']) ? $ex['manual'] : array(); }
  $r = grade($qs, $flat, $manual);
  return array($r, $manual, $flat);
}
function exam_finish_player($questionsArr, $p) {
  list($r, $manual) = exam_grade_player($questionsArr, $p);
  $correct = 0; foreach ($r['detail'] as $d) if ($d['status'] === 'benar') $correct++;
  q('UPDATE game_players SET exam_score = ?, correct = ?, extra = ?, finished_at = COALESCE(finished_at, NOW()), cur_open = 0 WHERE id = ?',
    array($r['score'], $correct, jenc(array('manual' => (object)$manual, 'result' => $r)), $p['id']));
  return $r;
}

/* ================= Email (lupa password & pemberitahuan) ================= */
/** Pengaturan pengiriman email; password SMTP tidak pernah dikirim ke browser. */
function mail_config() {
  $d = array('fromEmail' => '', 'fromName' => '', 'smtpHost' => '', 'smtpPort' => 465, 'smtpSecure' => 'ssl', 'smtpUser' => '', 'smtpPass' => '');
  $r = one('SELECT v FROM platform WHERE k = ?', array('mail'));
  if ($r) { $v = json_decode($r['v'], true); if (is_array($v)) $d = array_merge($d, $v); }
  return $d;
}
function mail_config_public() {
  $c = mail_config(); $c['hasPass'] = $c['smtpPass'] !== ''; unset($c['smtpPass']);
  $c['defaultFrom'] = default_from_email();
  return $c;
}
function site_host() {
  $h = isset($_SERVER['HTTP_HOST']) ? strtolower($_SERVER['HTTP_HOST']) : 'localhost';
  return preg_replace('/[^a-z0-9.\-]/', '', preg_replace('/:\d+$/', '', $h));
}
function default_from_email() { return 'no-reply@' . preg_replace('/^www\./', '', site_host()); }
/** URL folder aplikasi, mis. https://arahai.com/asesmen/ */
function app_base_url() {
  $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);
  $dir = dirname(dirname(isset($_SERVER['SCRIPT_NAME']) ? $_SERVER['SCRIPT_NAME'] : '/api/index.php'));
  $dir = rtrim(str_replace('\\', '/', $dir), '/') . '/';
  $port = isset($_SERVER['HTTP_HOST']) && preg_match('/:(\d+)$/', $_SERVER['HTTP_HOST'], $m) ? ':' . $m[1] : '';
  return ($https ? 'https' : 'http') . '://' . site_host() . $port . $dir;
}
function mime_header($s) { return preg_match('/[^\x20-\x7e]/', $s) ? '=?UTF-8?B?' . base64_encode($s) . '?=' : $s; }
function build_message($fromEmail, $fromName, $to, $subject, $text, $html) {
  $b = 'b' . bin2hex(random_bytes(8));
  $host = preg_replace('/^.*@/', '', $fromEmail);
  $h = array(
    'Date: ' . date('r'),
    'From: ' . mime_header($fromName) . ' <' . $fromEmail . '>',
    'To: <' . $to . '>',
    'Subject: ' . mime_header($subject),
    'Message-ID: <' . bin2hex(random_bytes(10)) . '@' . $host . '>',
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' . $b . '"'
  );
  $body = "--$b\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text)) .
    "--$b\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html)) . "--$b--\r\n";
  return array($h, $body);
}
function smtp_read($fp) {
  $out = '';
  while (($line = fgets($fp, 1024)) !== false) { $out .= $line; if (strlen($line) < 4 || $line[3] !== '-') break; }
  return $out;
}
function smtp_cmd($fp, $cmd, $expect) {
  if ($cmd !== null) fwrite($fp, $cmd . "\r\n");
  $r = smtp_read($fp);
  if (!in_array((int)substr($r, 0, 3), (array)$expect, true)) throw new Exception('SMTP: ' . trim($r ?: 'tidak ada jawaban') . ($cmd !== null && stripos($cmd, 'AUTH') === false && strpos($cmd, '=') === false ? ' (' . $cmd . ')' : ''));
  return $r;
}
function smtp_send($c, $to, $headers, $body) {
  $secure = $c['smtpSecure'];
  $ctx = stream_context_create(array('ssl' => array('verify_peer' => true, 'verify_peer_name' => true, 'SNI_enabled' => true, 'peer_name' => $c['smtpHost'])));
  $fp = @stream_socket_client(($secure === 'ssl' ? 'ssl://' : 'tcp://') . $c['smtpHost'] . ':' . (int)$c['smtpPort'], $no, $err, 15, STREAM_CLIENT_CONNECT, $ctx);
  if (!$fp) throw new Exception('Tidak bisa terhubung ke server SMTP ' . $c['smtpHost'] . ':' . $c['smtpPort'] . ' — ' . $err);
  stream_set_timeout($fp, 20);
  try {
    smtp_cmd($fp, null, 220);
    $ehlo = 'EHLO ' . (site_host() ?: 'localhost');
    smtp_cmd($fp, $ehlo, 250);
    if ($secure === 'tls') {
      smtp_cmd($fp, 'STARTTLS', 220);
      if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new Exception('SMTP: gagal memulai TLS.');
      smtp_cmd($fp, $ehlo, 250);
    }
    if ($c['smtpUser'] !== '') {
      smtp_cmd($fp, 'AUTH LOGIN', 334);
      smtp_cmd($fp, base64_encode($c['smtpUser']), 334);
      smtp_cmd($fp, base64_encode($c['smtpPass']), 235);
    }
    smtp_cmd($fp, 'MAIL FROM:<' . $c['fromEmail'] . '>', 250);
    smtp_cmd($fp, 'RCPT TO:<' . $to . '>', array(250, 251));
    smtp_cmd($fp, 'DATA', 354);
    $msg = implode("\r\n", $headers) . "\r\n\r\n" . $body;
    $msg = preg_replace('/^\./m', '..', str_replace("\n", "\r\n", str_replace("\r\n", "\n", $msg)));
    fwrite($fp, $msg . "\r\n.\r\n");
    smtp_cmd($fp, null, 250);
    fwrite($fp, "QUIT\r\n");
  } finally { fclose($fp); }
  return true;
}
/** Kirim email. Memakai SMTP bila diatur di Panel Pemilik, selain itu fungsi mail() bawaan hosting. */
function send_mail($to, $subject, $text, $html) {
  if (!valid_email($to)) throw new Exception('Alamat email tujuan tidak valid.');
  $c = mail_config();
  $p = platform();
  if ($c['fromEmail'] === '') $c['fromEmail'] = $c['smtpHost'] !== '' && valid_email($c['smtpUser']) ? $c['smtpUser'] : default_from_email();
  if ($c['fromName'] === '') $c['fromName'] = $p['brand'];
  list($headers, $body) = build_message($c['fromEmail'], $c['fromName'], $to, $subject, $text, $html);
  if ($c['smtpHost'] !== '') return smtp_send($c, $to, $headers, $body);
  if (!function_exists('mail')) throw new Exception('Fungsi mail() tidak tersedia di hosting ini. Atur SMTP di Panel Pemilik.');
  $hdr = array(); foreach ($headers as $line) if (stripos($line, 'To:') !== 0 && stripos($line, 'Subject:') !== 0) $hdr[] = $line;
  $ok = @mail($to, mime_header($subject), $body, implode("\r\n", $hdr), '-f' . $c['fromEmail']);
  if (!$ok) $ok = @mail($to, mime_header($subject), $body, implode("\r\n", $hdr));
  if (!$ok) throw new Exception('Hosting menolak mengirim email lewat mail(). Atur SMTP di Panel Pemilik.');
  return true;
}
/** Email berdesain sederhana (teks + HTML). */
function mail_layout($title, $paras, $button = null, $foot = '') {
  $brand = platform()['brand'];
  $e = function ($s) { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); };
  $html = '<div style="background:#f3f1ff;padding:24px 12px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;color:#1d1b3a">'
    . '<div style="font-weight:800;font-size:18px;color:#6d4aff;margin-bottom:14px">' . $e($brand) . '</div>'
    . '<h2 style="margin:0 0 12px;font-size:20px">' . $e($title) . '</h2>';
  foreach ($paras as $p) $html .= '<p style="line-height:1.6;margin:0 0 12px">' . $p . '</p>';
  if ($button) $html .= '<p style="margin:22px 0"><a href="' . $e($button[1]) . '" style="background:#6d4aff;color:#fff;text-decoration:none;padding:13px 22px;border-radius:12px;font-weight:700;display:inline-block">' . $e($button[0]) . '</a></p><p style="font-size:12px;color:#6b6889;word-break:break-all">Jika tombol tidak bisa diklik, salin tautan ini ke browser:<br>' . $e($button[1]) . '</p>';
  if ($foot) $html .= '<p style="font-size:12px;color:#6b6889;border-top:1px solid #eee;padding-top:12px;margin-top:18px">' . $foot . '</p>';
  $html .= '</div></div>';
  $text = $title . "\n\n" . implode("\n\n", array_map(function ($p) { return html_entity_decode(strip_tags($p), ENT_QUOTES, 'UTF-8'); }, $paras));
  if ($button) $text .= "\n\n" . $button[0] . ":\n" . $button[1];
  if ($foot) $text .= "\n\n--\n" . html_entity_decode(strip_tags($foot), ENT_QUOTES, 'UTF-8');
  return array($text, $html);
}
/** Alamat email akun: kolom email, atau username bila berbentuk email. */
function user_email($u) {
  if (!empty($u['email']) && valid_email($u['email'])) return $u['email'];
  return valid_email($u['username']) ? strtolower($u['username']) : null;
}
function mask_email($e) {
  list($a, $d) = explode('@', $e, 2);
  return substr($a, 0, 1) . str_repeat('*', max(2, min(6, strlen($a) - 1))) . '@' . $d;
}
/** Pemberitahuan bahwa password akun telah diubah (tidak menghentikan proses bila gagal). */
function notify_password_changed($u, $how) {
  $to = user_email($u); if (!$to) return;
  try {
    $e = function ($s) { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); };
    list($t, $h) = mail_layout('Password Anda telah diubah', array(
      'Halo ' . $e($u['name']) . ',',
      'Password akun <b>' . $e($u['username']) . '</b> baru saja diubah (' . $e($how) . ') pada ' . date('d-m-Y H:i') . ' dari alamat IP ' . $e(client_ip()) . '. Semua perangkat lain otomatis dikeluarkan.',
      'Jika ini bukan Anda, segera gunakan <b>Lupa password</b> di halaman masuk, atau hubungi admin sekolah.'
    ), array('Buka aplikasi', app_base_url() . 'app.html'));
    send_mail($to, 'Password akun Anda telah diubah', $t, $h);
  } catch (Exception $ex) { log_error('notify_password_changed: ' . $ex->getMessage()); }
}

/** Acak urutan soal, tetapi soal yang memakai teks bacaan yang sama tetap berurutan & berdekatan. */
function shuffle_keep_passages($items, $passageOf) {
  $groups = array(); $index = array();
  foreach ($items as $it) {
    $pid = $passageOf($it);
    if ($pid !== null && $pid !== '' && isset($index[$pid])) { $groups[$index[$pid]][] = $it; continue; }
    if ($pid !== null && $pid !== '') $index[$pid] = count($groups);
    $groups[] = array($it);
  }
  shuffle($groups);
  $out = array(); foreach ($groups as $g) foreach ($g as $it) $out[] = $it;
  return $out;
}
