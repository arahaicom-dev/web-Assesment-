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
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (tenant_id)
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
  $hadTenants = has_table($pdo, 'tenants');
  foreach (schema() as $sql) $pdo->exec($sql);
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
  return array('id' => (int)$u['id'], 'username' => $u['username'], 'name' => $u['name'], 'role' => $u['role'], 'super' => !empty($u['is_super']), 'tenantId' => $u['tenant_id'] === null ? null : (int)$u['tenant_id']);
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
function default_points($t) { $d = array('pg' => 1, 'bs' => 1, 'isian' => 2, 'uraian' => 4); return isset($d[$t]) ? $d[$t] : 1; }
function grade($questions, $answers) {
  $earned = 0; $total = 0; $needs = false; $detail = array();
  foreach ($questions as $q) {
    $type = prop($q, 'type'); $pts = (float)prop($q, 'points', 0); if (!$pts) $pts = default_points($type);
    $total += $pts;
    $ans = isset($answers[$q->id]) ? $answers[$q->id] : '';
    $key = prop($q, 'answer');
    $got = 0; $status = 'salah'; $auto = true;
    if ($type === 'pg') $got = ($ans !== '' && $key !== null && strtoupper($ans) === strtoupper((string)$key)) ? $pts : 0;
    elseif ($type === 'bs') $got = ($ans !== '' && $key !== null && norm_bs($ans) !== null && norm_bs($ans) === norm_bs($key)) ? $pts : 0;
    elseif ($type === 'isian') $got = match_short($ans, $key) ? $pts : 0;
    else { $auto = false; $got = suggest_essay($ans, $key, $pts); }
    if ($type === 'uraian') { $status = 'perlu koreksi'; if (trim($ans) !== '') $needs = true; }
    else $status = $got >= $pts ? 'benar' : ($got > 0 ? 'sebagian' : 'salah');
    if (trim($ans) === '') $status = 'kosong';
    $earned += $got;
    $detail[] = array('id' => $q->id, 'got' => $got, 'pts' => $pts, 'status' => $status, 'auto' => $auto);
  }
  return array('score' => $total ? round($earned / $total * 10000) / 100 : 0, 'earned' => $earned, 'total' => $total, 'detail' => $detail, 'needsReview' => $needs);
}

