<?php
/*
 * Asesmen Merdeka — API versi PHP + MySQL (untuk hosting biasa / cPanel tanpa Node.js)
 * Fungsinya sama dengan server Node.js (server/api.js). Butuh PHP 7.2+ dengan PDO MySQL.
 *
 * Semua permintaan ke /api/... diarahkan ke file ini oleh .htaccess.
 */
error_reporting(E_ALL);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

define('APP_VERSION', '3.2.0');
define('CONFIG_FILE', __DIR__ . '/config.php');
define('SESSION_DAYS', 30);

/* ================= util ================= */
function out($data, $code = 200) {
  http_response_code($code);
  echo is_string($data) ? $data : json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function bad($code, $msg) { out(array('error' => $msg), $code); }
function jenc($v) { return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); }
function prop($o, $k, $d = null) { return (is_object($o) && property_exists($o, $k)) ? $o->$k : $d; }
function clean_id($v) { return (is_string($v) && strlen($v) > 0 && strlen($v) <= 64) ? $v : null; }
function client_ip() { return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : ''; }
function log_error($msg) {
  @file_put_contents(__DIR__ . '/log-error.php', '<?php exit; ?> ' . date('c') . ' ' . $msg . "\n", FILE_APPEND);
}

/* ================= konfigurasi & database ================= */
$CFG = null;
if (is_file(CONFIG_FILE)) { $CFG = include CONFIG_FILE; if (!is_array($CFG)) $CFG = null; }

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
function q($sql, $params = array()) {
  $st = db()->prepare($sql);
  $st->execute($params);
  return $st;
}
function rows($sql, $params = array()) { return q($sql, $params)->fetchAll(); }

/** Pesan kesalahan database yang mudah dipahami. */
function explain_db($e) {
  $m = $e->getMessage();
  $code = 0;
  if (preg_match('/SQLSTATE\[\w+\]\s*\[(\d+)\]/', $m, $mm)) $code = (int)$mm[1];
  elseif (isset($e->errorInfo[1])) $code = (int)$e->errorInfo[1];
  if ($code === 1045 || $code === 1044) return 'Database menolak login: periksa nama user dan password database, dan pastikan user sudah ditambahkan ke database dengan ALL PRIVILEGES (cPanel → MySQL Databases).';
  if ($code === 1049) return 'Database tidak ditemukan: periksa nama database. Di cPanel nama database diawali nama akun, mis. akunanda_asesmen.';
  if ($code === 2002 || $code === 2005 || $code === 2006) return 'Tidak bisa menghubungi server database: periksa host database (biasanya localhost).';
  if ($code === 1142 || $code === 1227) return 'User database tidak punya izin yang cukup: beri ALL PRIVILEGES di cPanel → MySQL Databases.';
  return null;
}

function schema() {
  return array(
    "CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      pass_hash VARCHAR(255) NOT NULL,
      role VARCHAR(16) NOT NULL DEFAULT 'guru',
      theme TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    "CREATE TABLE IF NOT EXISTS sessions (
      token CHAR(64) NOT NULL PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      expires_at DATETIME NOT NULL,
      INDEX (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    "CREATE TABLE IF NOT EXISTS docs (
      kind VARCHAR(32) NOT NULL,
      id VARCHAR(64) NOT NULL,
      data LONGTEXT NOT NULL,
      exam_code VARCHAR(16) NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by INT UNSIGNED NULL,
      PRIMARY KEY (kind, id),
      INDEX (exam_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    "CREATE TABLE IF NOT EXISTS scores (
      assessment_id VARCHAR(64) NOT NULL,
      student_id VARCHAR(64) NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (assessment_id, student_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    "CREATE TABLE IF NOT EXISTS submissions (
      assessment_id VARCHAR(64) NOT NULL,
      student_id VARCHAR(64) NOT NULL,
      data LONGTEXT NOT NULL,
      submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (assessment_id, student_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    "CREATE TABLE IF NOT EXISTS login_fails (
      k VARCHAR(190) NOT NULL PRIMARY KEY,
      n INT NOT NULL DEFAULT 0,
      t INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  );
}
function migrate($pdo = null) {
  $pdo = $pdo ? $pdo : db();
  foreach (schema() as $sql) $pdo->exec($sql);
}

/* ================= pembatas percobaan login ================= */
function lock_key($u) { return substr(client_ip() . '|' . strtolower((string)$u), 0, 190); }
function is_locked($k) {
  $r = rows('SELECT n, t FROM login_fails WHERE k = ?', array($k));
  return $r && $r[0]['n'] >= 8 && time() - $r[0]['t'] < 600;
}
function add_fail($k) {
  $r = rows('SELECT n, t FROM login_fails WHERE k = ?', array($k));
  $n = ($r && time() - $r[0]['t'] < 600) ? $r[0]['n'] + 1 : 1;
  q('REPLACE INTO login_fails (k, n, t) VALUES (?,?,?)', array($k, $n, time()));
}
function clear_fail($k) { q('DELETE FROM login_fails WHERE k = ?', array($k)); }

/* ================= akun ================= */
function valid_password($p) { return is_string($p) && strlen($p) >= 6 && strlen($p) <= 200; }
function valid_username($u) { return is_string($u) && preg_match('/^[a-zA-Z0-9._-]{3,64}$/', $u); }
function public_user($u) { return array('id' => (int)$u['id'], 'username' => $u['username'], 'name' => $u['name'], 'role' => $u['role']); }
function new_session($uid) {
  $token = bin2hex(random_bytes(32));
  q('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)', array($token, $uid, date('Y-m-d H:i:s', time() + SESSION_DAYS * 86400)));
  q('DELETE FROM sessions WHERE expires_at < NOW()');
  return $token;
}
function bearer_token() {
  $h = '';
  if (!empty($_SERVER['HTTP_X_AUTH_TOKEN'])) return trim($_SERVER['HTTP_X_AUTH_TOKEN']);
  foreach (array('HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION') as $k) if (!empty($_SERVER[$k])) { $h = $_SERVER[$k]; break; }
  if (!$h && function_exists('apache_request_headers')) {
    $hs = apache_request_headers();
    foreach ($hs as $k => $v) if (strtolower($k) === 'authorization') $h = $v;
  }
  return stripos($h, 'Bearer ') === 0 ? trim(substr($h, 7)) : '';
}
function auth() {
  $t = bearer_token();
  if (!preg_match('/^[a-f0-9]{64}$/', $t)) bad(401, 'Silakan login.');
  $r = rows('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > NOW()', array($t));
  if (!$r) bad(401, 'Sesi berakhir, silakan login lagi.');
  $GLOBALS['TOKEN'] = $t;
  return $r[0];
}
function admin_only($u) { if ($u['role'] !== 'admin') bad(403, 'Hanya admin.'); }

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

/* ================= routing ================= */
$path = parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH);
$pos = strrpos($path, '/api/');
$route = $pos === false ? '' : substr($path, $pos + 5);
if ($route === 'index.php' || $route === false) $route = '';
if (isset($_GET['r'])) $route = $_GET['r'];
$route = trim($route, '/');
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
$raw = file_get_contents('php://input');
$body = $raw ? json_decode($raw) : null;
if (!is_object($body)) $body = new stdClass();
$seg = $route === '' ? array() : explode('/', $route);

try {
  /* ---- pemasangan: isi pengaturan database ---- */
  if ($route === 'health') {
    if (!$CFG) out(array('ok' => true, 'mode' => 'server', 'backend' => 'php', 'version' => APP_VERSION, 'needsConfig' => true));
    try {
      try { $n = (int)rows('SELECT COUNT(*) AS n FROM users')[0]['n']; }
      catch (PDOException $e) {
        if (strpos($e->getMessage(), '1146') === false && strpos($e->getMessage(), "doesn't exist") === false) throw $e;
        migrate(); $n = 0;
      }
      // tabel tambahan versi baru
      try { rows('SELECT 1 FROM login_fails LIMIT 1'); } catch (PDOException $e) { migrate(); }
      out(array('ok' => true, 'mode' => 'server', 'backend' => 'php', 'version' => APP_VERSION, 'needsSetup' => $n === 0));
    } catch (PDOException $e) {
      log_error($e->getMessage());
      out(array('ok' => false, 'mode' => 'server', 'backend' => 'php', 'version' => APP_VERSION, 'dbError' => explain_db($e) ?: ('Gagal terhubung ke database: ' . $e->getMessage())));
    }
  }

  if ($route === 'install' && $method === 'POST') {
    if ($CFG) bad(409, 'Pengaturan database sudah ada. Untuk mengubahnya, hapus file api/config.php lewat File Manager.');
    $c = array(
      'host' => trim((string)prop($body, 'host', 'localhost')) ?: 'localhost',
      'port' => (int)prop($body, 'port', 3306) ?: 3306,
      'name' => trim((string)prop($body, 'name', '')),
      'user' => trim((string)prop($body, 'user', '')),
      'pass' => (string)prop($body, 'pass', '')
    );
    if ($c['name'] === '' || $c['user'] === '') bad(400, 'Nama database dan user database wajib diisi.');
    try { $pdo = pdo_connect($c); migrate($pdo); }
    catch (PDOException $e) { bad(400, explain_db($e) ?: ('Gagal terhubung: ' . $e->getMessage())); }
    $php = "<?php\n// Pengaturan database Asesmen Merdeka (dibuat otomatis). Jangan bagikan file ini.\nreturn " . var_export($c, true) . ";\n";
    if (@file_put_contents(CONFIG_FILE, $php) === false) {
      bad(500, 'Koneksi berhasil, tetapi file api/config.php tidak bisa ditulis. Buat file itu lewat File Manager dengan isi: ' . $php);
    }
    @chmod(CONFIG_FILE, 0640);
    out(array('ok' => true));
  }

  if (!$CFG) bad(503, 'Database belum diatur. Buka halaman utama aplikasi untuk mengisi pengaturan database.');

  /* ---- autentikasi ---- */
  if ($route === 'setup' && $method === 'POST') {
    if ((int)rows('SELECT COUNT(*) AS n FROM users')[0]['n'] > 0) bad(409, 'Aplikasi sudah dipasang. Silakan login.');
    $username = prop($body, 'username'); $password = prop($body, 'password');
    $name = trim((string)prop($body, 'name', '')) ?: $username;
    if (!valid_username($username)) bad(400, 'Username 3–64 karakter (huruf, angka, titik, minus, garis bawah).');
    if (!valid_password($password)) bad(400, 'Password minimal 6 karakter.');
    q('INSERT INTO users (username, name, pass_hash, role) VALUES (?,?,?,?)', array($username, mb_substr($name, 0, 150), password_hash($password, PASSWORD_DEFAULT), 'admin'));
    $id = (int)db()->lastInsertId();
    $school = trim((string)prop($body, 'schoolName', ''));
    if ($school !== '') q('INSERT INTO docs (kind, id, data) VALUES (?,?,?) ON DUPLICATE KEY UPDATE data = VALUES(data)', array('settings', 'main', jenc(array('schoolName' => mb_substr($school, 0, 200), 'teacherName' => $name))));
    out(array('token' => new_session($id), 'user' => array('id' => $id, 'username' => $username, 'name' => $name, 'role' => 'admin')));
  }

  if ($route === 'login' && $method === 'POST') {
    $username = (string)prop($body, 'username', ''); $password = (string)prop($body, 'password', '');
    $k = lock_key($username);
    if (is_locked($k)) bad(429, 'Terlalu banyak percobaan. Coba lagi 10 menit lagi.');
    $r = rows('SELECT * FROM users WHERE username = ?', array($username));
    if (!$r || !password_verify($password, $r[0]['pass_hash'])) { add_fail($k); bad(401, 'Username atau password salah.'); }
    clear_fail($k);
    out(array('token' => new_session((int)$r[0]['id']), 'user' => public_user($r[0])));
  }

  if ($route === 'logout') { auth(); q('DELETE FROM sessions WHERE token = ?', array($GLOBALS['TOKEN'])); out(array('ok' => true)); }
  if ($route === 'me') { $u = auth(); out(array('user' => public_user($u))); }

  if ($route === 'me/password' && $method === 'PUT') {
    $u = auth();
    if (!password_verify((string)prop($body, 'oldPassword', ''), $u['pass_hash'])) bad(400, 'Password lama salah.');
    $np = prop($body, 'newPassword');
    if (!valid_password($np)) bad(400, 'Password baru minimal 6 karakter.');
    q('UPDATE users SET pass_hash = ? WHERE id = ?', array(password_hash($np, PASSWORD_DEFAULT), $u['id']));
    q('DELETE FROM sessions WHERE user_id = ? AND token <> ?', array($u['id'], $GLOBALS['TOKEN']));
    out(array('ok' => true));
  }

  /* ---- akun guru (admin) ---- */
  if ($seg && $seg[0] === 'users') {
    $u = auth(); admin_only($u);
    if (count($seg) === 1 && $method === 'GET') {
      $list = rows('SELECT id, username, name, role, created_at FROM users ORDER BY id');
      foreach ($list as &$x) $x['id'] = (int)$x['id'];
      out(array('users' => $list));
    }
    if (count($seg) === 1 && $method === 'POST') {
      $un = prop($body, 'username'); $pw = prop($body, 'password');
      if (!valid_username($un)) bad(400, 'Username 3–64 karakter (huruf, angka, titik, minus, garis bawah).');
      if (!valid_password($pw)) bad(400, 'Password minimal 6 karakter.');
      if (rows('SELECT id FROM users WHERE username = ?', array($un))) bad(409, 'Username sudah dipakai.');
      $nm = trim((string)prop($body, 'name', '')) ?: $un;
      q('INSERT INTO users (username, name, pass_hash, role) VALUES (?,?,?,?)', array($un, mb_substr($nm, 0, 150), password_hash($pw, PASSWORD_DEFAULT), prop($body, 'role') === 'admin' ? 'admin' : 'guru'));
      out(array('ok' => true));
    }
    $id = isset($seg[1]) ? (int)$seg[1] : 0;
    if (count($seg) === 3 && $seg[2] === 'password' && $method === 'PUT') {
      $pw = prop($body, 'password');
      if (!valid_password($pw)) bad(400, 'Password minimal 6 karakter.');
      q('UPDATE users SET pass_hash = ? WHERE id = ?', array(password_hash($pw, PASSWORD_DEFAULT), $id));
      q('DELETE FROM sessions WHERE user_id = ?', array($id));
      out(array('ok' => true));
    }
    if (count($seg) === 2 && $method === 'DELETE') {
      if ($id === (int)$u['id']) bad(400, 'Tidak bisa menghapus akun sendiri.');
      q('DELETE FROM sessions WHERE user_id = ?', array($id));
      q('DELETE FROM users WHERE id = ?', array($id));
      out(array('ok' => true));
    }
  }

  /* ---- data aplikasi ---- */
  $DOC_KINDS = array('settings', 'classes', 'subjects', 'assessments', 'questionSets');
  $exam_code_of = function ($kind, $data) {
    return ($kind === 'assessments' && prop($data, 'examOpen') && prop($data, 'examCode')) ? substr(strtoupper((string)$data->examCode), 0, 16) : null;
  };

  if ($route === 'state') {
    $u = auth();
    // Susun JSON langsung dari teks tersimpan agar objek kosong {} tetap utuh
    $settings = '{}'; $lists = array('classes' => array(), 'subjects' => array(), 'assessments' => array(), 'questionSets' => array());
    foreach (rows('SELECT kind, data FROM docs') as $d) {
      if ($d['kind'] === 'settings') $settings = $d['data'];
      elseif (isset($lists[$d['kind']])) $lists[$d['kind']][] = $d['data'];
    }
    $map = function ($sql, $col) {
      $g = array();
      foreach (rows($sql) as $r) $g[$r['a']][] = jenc((string)$r['s']) . ':' . $r[$col];
      $parts = array();
      foreach ($g as $a => $items) $parts[] = jenc((string)$a) . ':{' . implode(',', $items) . '}';
      return '{' . implode(',', $parts) . '}';
    };
    $theme = rows('SELECT theme FROM users WHERE id = ?', array($u['id']));
    $themeJson = ($theme && $theme[0]['theme']) ? $theme[0]['theme'] : 'null';
    $json = '{"state":{"settings":' . $settings;
    foreach ($lists as $k => $items) $json .= ',' . jenc($k) . ':[' . implode(',', $items) . ']';
    $json .= ',"scores":' . $map('SELECT assessment_id a, student_id s, value FROM scores', 'value');
    $json .= ',"submissions":' . $map('SELECT assessment_id a, student_id s, data FROM submissions', 'data');
    $json .= ',"theme":' . $themeJson . '},"user":' . jenc(public_user($u)) . '}';
    out($json);
  }

  if ($route === 'sync' && $method === 'POST') {
    $u = auth(); $uid = (int)$u['id']; $n = 0;
    $pdo = db(); $pdo->beginTransaction();
    try {
      foreach ((array)prop($body, 'docs', array()) as $d) {
        $kind = prop($d, 'kind'); $id = clean_id(prop($d, 'id')); $data = prop($d, 'data');
        if (!in_array($kind, $DOC_KINDS, true) || !$id || !is_object($data)) continue;
        q('INSERT INTO docs (kind, id, data, exam_code, updated_by) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE data = VALUES(data), exam_code = VALUES(exam_code), updated_by = VALUES(updated_by)',
          array($kind, $id, jenc($data), $exam_code_of($kind, $data), $uid));
        $n++;
      }
      foreach ((array)prop($body, 'delDocs', array()) as $d) {
        $kind = prop($d, 'kind'); $id = clean_id(prop($d, 'id'));
        if (!in_array($kind, $DOC_KINDS, true) || !$id) continue;
        q('DELETE FROM docs WHERE kind = ? AND id = ?', array($kind, $id)); $n++;
      }
      foreach ((array)prop($body, 'scores', array()) as $s) {
        $a = clean_id(prop($s, 'a')); $st = clean_id(prop($s, 's'));
        if (!$a || !$st) continue;
        q('INSERT INTO scores (assessment_id, student_id, value) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value = VALUES(value)', array($a, $st, jenc(prop($s, 'v')))); $n++;
      }
      foreach ((array)prop($body, 'delScores', array()) as $s) {
        $a = clean_id(prop($s, 'a')); $st = prop($s, 's');
        if (!$a) continue;
        if ($st === '*') q('DELETE FROM scores WHERE assessment_id = ?', array($a));
        elseif (clean_id($st)) q('DELETE FROM scores WHERE assessment_id = ? AND student_id = ?', array($a, $st));
        $n++;
      }
      foreach ((array)prop($body, 'subs', array()) as $s) {
        $a = clean_id(prop($s, 'a')); $st = clean_id(prop($s, 's'));
        if (!$a || !$st) continue;
        q('INSERT INTO submissions (assessment_id, student_id, data) VALUES (?,?,?) ON DUPLICATE KEY UPDATE data = VALUES(data)', array($a, $st, jenc(prop($s, 'd')))); $n++;
      }
      foreach ((array)prop($body, 'delSubs', array()) as $s) {
        $a = clean_id(prop($s, 'a')); $st = prop($s, 's');
        if (!$a) continue;
        if ($st === '*') q('DELETE FROM submissions WHERE assessment_id = ?', array($a));
        elseif (clean_id($st)) q('DELETE FROM submissions WHERE assessment_id = ? AND student_id = ?', array($a, $st));
        $n++;
      }
      $theme = prop($body, 'theme');
      if (is_object($theme)) { q('UPDATE users SET theme = ? WHERE id = ?', array(jenc($theme), $uid)); $n++; }
      $pdo->commit();
    } catch (Exception $e) { $pdo->rollBack(); throw $e; }
    out(array('ok' => true, 'applied' => $n));
  }

  if ($route === 'import' && $method === 'POST') {
    $u = auth(); admin_only($u);
    $d = prop($body, 'state');
    if (!is_object($d) || !is_array(prop($d, 'classes'))) bad(400, 'Format cadangan tidak dikenali.');
    $pdo = db(); $pdo->beginTransaction();
    try {
      $pdo->exec('DELETE FROM docs'); $pdo->exec('DELETE FROM scores'); $pdo->exec('DELETE FROM submissions');
      if (is_object(prop($d, 'settings'))) q('INSERT INTO docs (kind, id, data) VALUES (?,?,?)', array('settings', 'main', jenc($d->settings)));
      foreach (array('classes', 'subjects', 'assessments', 'questionSets') as $kind) {
        foreach ((array)prop($d, $kind, array()) as $it) {
          if (is_object($it) && clean_id(prop($it, 'id'))) q('INSERT INTO docs (kind, id, data, exam_code) VALUES (?,?,?,?)', array($kind, $it->id, jenc($it), $exam_code_of($kind, $it)));
        }
      }
      foreach (array('scores' => 'scores', 'submissions' => 'submissions') as $k => $table) {
        $m = prop($d, $k);
        if (!is_object($m)) continue;
        foreach (get_object_vars($m) as $a => $bys) {
          if (!clean_id($a) || !is_object($bys)) continue;
          foreach (get_object_vars($bys) as $s => $v) {
            if (!clean_id($s)) continue;
            if ($table === 'scores') q('INSERT INTO scores (assessment_id, student_id, value) VALUES (?,?,?)', array($a, $s, jenc($v)));
            else q('INSERT INTO submissions (assessment_id, student_id, data) VALUES (?,?,?)', array($a, $s, jenc($v)));
          }
        }
      }
      $pdo->commit();
    } catch (Exception $e) { $pdo->rollBack(); throw $e; }
    out(array('ok' => true));
  }

  /* ---- ujian online murid ---- */
  if ($seg && $seg[0] === 'exam' && isset($seg[1])) {
    $code = preg_replace('/[^A-Z0-9]/', '', strtoupper(urldecode($seg[1])));
    $ex = null;
    if ($code !== '') {
      $r = rows('SELECT data FROM docs WHERE kind = ? AND exam_code = ?', array('assessments', $code));
      if ($r) {
        $a = json_decode($r[0]['data']);
        if ($a && prop($a, 'examOpen') && prop($a, 'qsetId')) {
          $load = function ($kind, $id) { $x = rows('SELECT data FROM docs WHERE kind = ? AND id = ?', array($kind, (string)$id)); return $x ? json_decode($x[0]['data']) : null; };
          $qset = $load('questionSets', $a->qsetId); $cls = $load('classes', prop($a, 'classId'));
          if ($qset && $cls) $ex = array('a' => $a, 'qset' => $qset, 'cls' => $cls, 'subj' => $load('subjects', prop($a, 'subjectId')), 'settings' => $load('settings', 'main'));
        }
      }
    }
    if (!$ex) bad(404, 'Token ujian tidak ditemukan atau ujian sudah ditutup.');
    $a = $ex['a']; $students = (array)prop($ex['cls'], 'students', array()); $questions = (array)prop($ex['qset'], 'questions', array());
    $find_student = function ($sid, $nis) use ($students) {
      foreach ($students as $s) if (prop($s, 'id') === $sid) {
        $sn = trim((string)prop($s, 'nis', ''));
        if ($sn !== '' && strtolower($sn) !== strtolower(trim((string)$nis))) return array('err' => 'NIS tidak cocok. Tanyakan NIS kamu ke guru.');
        return array('st' => $s);
      }
      return array('err' => 'Nama murid tidak ditemukan.');
    };
    $action = isset($seg[2]) ? $seg[2] : '';

    if ($action === '' && $method === 'GET') {
      $done = array();
      foreach (rows('SELECT student_id FROM submissions WHERE assessment_id = ?', array($a->id)) as $r) $done[$r['student_id']] = true;
      $list = array();
      foreach ($students as $s) $list[] = array('id' => $s->id, 'name' => prop($s, 'name', ''), 'needNis' => trim((string)prop($s, 'nis', '')) !== '', 'done' => isset($done[$s->id]));
      out(array(
        'assessment' => array('title' => prop($a, 'title', ''), 'type' => prop($a, 'type'), 'duration' => (int)prop($a, 'duration', 0), 'questionCount' => count($questions)),
        'className' => prop($ex['cls'], 'name', ''), 'subjectName' => $ex['subj'] ? prop($ex['subj'], 'name', '') : '',
        'schoolName' => $ex['settings'] ? prop($ex['settings'], 'schoolName', '') : '',
        'students' => $list
      ));
    }

    if ($action === 'start' && $method === 'POST') {
      $sid = (string)prop($body, 'studentId', '');
      $k = lock_key('exam:' . $sid);
      if (is_locked($k)) bad(429, 'Terlalu banyak percobaan. Tunggu 10 menit.');
      $chk = $find_student($sid, prop($body, 'nis', ''));
      if (isset($chk['err'])) { add_fail($k); bad(401, $chk['err']); }
      $sub = rows('SELECT data FROM submissions WHERE assessment_id = ? AND student_id = ?', array($a->id, $sid));
      if ($sub) {
        $d = json_decode($sub[0]['data'], true);
        out(array('submitted' => true, 'result' => prop($a, 'hideScore') ? null : array('score' => isset($d['result']['score']) ? $d['result']['score'] : null, 'needsReview' => !empty($d['result']['needsReview']))));
      }
      $qs = array();
      foreach ($questions as $qq) {
        $opts = array();
        if (prop($qq, 'type') === 'pg') foreach ((array)prop($qq, 'options', array()) as $o) $opts[] = array('label' => prop($o, 'label'), 'text' => prop($o, 'text'));
        $qs[] = array('id' => $qq->id, 'type' => prop($qq, 'type'), 'text' => prop($qq, 'text', ''), 'image' => prop($qq, 'image'), 'points' => prop($qq, 'points'), 'options' => $opts);
      }
      if (prop($a, 'shuffle')) { mt_srand(crc32($a->id . $sid)); shuffle($qs); mt_srand(); }
      out(array('submitted' => false, 'student' => array('id' => $chk['st']->id, 'name' => prop($chk['st'], 'name', '')), 'questions' => $qs, 'duration' => (int)prop($a, 'duration', 0), 'serverTime' => round(microtime(true) * 1000)));
    }

    if ($action === 'submit' && $method === 'POST') {
      $sid = (string)prop($body, 'studentId', '');
      $chk = $find_student($sid, prop($body, 'nis', ''));
      if (isset($chk['err'])) bad(401, $chk['err']);
      $ids = array(); foreach ($questions as $qq) $ids[$qq->id] = true;
      $clean = array(); $given = prop($body, 'answers');
      if (is_object($given)) foreach (get_object_vars($given) as $k => $v) if (isset($ids[$k])) $clean[$k] = mb_substr(is_scalar($v) ? (string)$v : '', 0, 5000);
      $result = grade($questions, $clean);
      $kktp = $ex['settings'] && prop($ex['settings'], 'kktp') ? (float)$ex['settings']->kktp : 75;
      $cap = ($ex['settings'] && prop($ex['settings'], 'remedialCap') === false) ? 100 : $kktp;
      $pdo = db(); $pdo->beginTransaction();
      try {
        if (rows('SELECT 1 FROM submissions WHERE assessment_id = ? AND student_id = ? FOR UPDATE', array($a->id, $sid))) { $pdo->rollBack(); bad(409, 'Jawaban kamu sudah pernah dikumpulkan.'); }
        $started = (float)prop($body, 'startedAt', 0);
        $sub = array('answers' => $clean ? $clean : new stdClass(), 'manual' => new stdClass(), 'result' => $result, 'at' => round(microtime(true) * 1000),
          'duration' => $started ? max(0, (int)round((microtime(true) * 1000 - $started) / 1000)) : null, 'online' => true);
        q('INSERT INTO submissions (assessment_id, student_id, data) VALUES (?,?,?)', array($a->id, $sid, jenc($sub)));
        $prev = rows('SELECT value FROM scores WHERE assessment_id = ? AND student_id = ? FOR UPDATE', array($a->id, $sid));
        $val = $result['score'];
        $pv = $prev ? json_decode($prev[0]['value']) : null;
        if (is_object($pv)) {
          $pv->score = $result['score'];
          if (is_numeric(prop($pv, 'remedial')) && $result['score'] < $kktp) $pv->final = max($result['score'], min((float)$pv->remedial, $cap));
          else { unset($pv->remedial); unset($pv->final); }
          $val = $pv;
        }
        q('INSERT INTO scores (assessment_id, student_id, value) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value = VALUES(value)', array($a->id, $sid, jenc($val)));
        $pdo->commit();
      } catch (Exception $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
      out(array('ok' => true, 'result' => prop($a, 'hideScore') ? null : array('score' => $result['score'], 'earned' => $result['earned'], 'total' => $result['total'], 'needsReview' => $result['needsReview'])));
    }
  }

  bad(404, 'Tidak ditemukan.');
} catch (PDOException $e) {
  log_error($route . ' ' . $e->getMessage());
  bad(500, explain_db($e) ?: 'Terjadi kesalahan database.');
} catch (Exception $e) {
  log_error($route . ' ' . $e->getMessage());
  bad(500, 'Terjadi kesalahan di server.');
}
