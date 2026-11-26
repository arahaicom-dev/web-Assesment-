<?php
/*
 * Asesmen Merdeka — API versi PHP + MySQL, multi-sekolah (SaaS)
 * - Tiap sekolah (tenant) punya data terpisah, masa coba gratis, dan langganan berbayar.
 * - Pemilik platform (akun pertama) mengelola sekolah, pembayaran, harga, dan rekening.
 * Semua permintaan ke /api/... diarahkan ke file ini oleh .htaccess. Butuh PHP 7.2+ (PDO MySQL).
 */
error_reporting(E_ALL);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

define('APP_VERSION', '5.6.0');
define('CONFIG_FILE', __DIR__ . '/config.php');
define('SESSION_DAYS', 30);
require __DIR__ . '/lib.php';

$CFG = null;
if (is_file(CONFIG_FILE)) { $CFG = include CONFIG_FILE; if (!is_array($CFG)) $CFG = null; }

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
  /* ---------- status & pemasangan ---------- */
  if ($route === 'health') {
    $base = array('ok' => true, 'mode' => 'server', 'backend' => 'php', 'saas' => true, 'version' => APP_VERSION);
    if (!$CFG) out(array_merge($base, array('needsConfig' => true)));
    try {
      if (!has_table(db(), 'users') || !has_table(db(), 'tenants') || !has_table(db(), 'payments') || !has_table(db(), 'game_players') || !has_column(db(), 'game_players', 'violations') || !has_column(db(), 'users', 'tenant_id') || !has_table(db(), 'media') || !has_table(db(), 'pw_resets') || !has_column(db(), 'users', 'email')) migrate();
      $n = (int)one('SELECT COUNT(*) AS n FROM users')['n'];
      out(array_merge($base, array('needsSetup' => $n === 0)));
    } catch (PDOException $e) {
      log_error($e->getMessage());
      out(array_merge($base, array('ok' => false, 'dbError' => explain_db($e) ?: ('Gagal terhubung ke database: ' . $e->getMessage()))));
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
    if (@file_put_contents(CONFIG_FILE, $php) === false) bad(500, 'Koneksi berhasil, tetapi file api/config.php tidak bisa ditulis. Buat file itu lewat File Manager dengan isi: ' . $php);
    @chmod(CONFIG_FILE, 0640);
    out(array('ok' => true));
  }

  if (!$CFG) bad(503, 'Database belum diatur. Buka halaman aplikasi untuk mengisi pengaturan database.');

  /* ---------- publik: harga untuk halaman utama ---------- */
  if ($route === 'public/plans') out(public_platform());

  /* ---------- pemasangan pertama: akun pemilik platform ---------- */
  if ($route === 'setup' && $method === 'POST') {
    migrate();
    if ((int)one('SELECT COUNT(*) AS n FROM users')['n'] > 0) bad(409, 'Aplikasi sudah dipasang. Silakan login.');
    $username = trim((string)prop($body, 'username', '')); $password = prop($body, 'password');
    $name = str_cut(prop($body, 'name', ''), 150) ?: $username;
    if (!valid_username($username)) bad(400, 'Username/email 3–150 karakter tanpa spasi.');
    if (!valid_password($password)) bad(400, 'Password minimal 6 karakter.');
    $school = str_cut(prop($body, 'schoolName', ''), 200) ?: 'Sekolah Saya';
    q('INSERT INTO tenants (name, plan, paid_until, contact_name, contact_email) VALUES (?,?,NULL,?,?)', array($school, 'unlimited', $name, valid_email($username) ? $username : null));
    $tid = (int)db()->lastInsertId();
    q('INSERT INTO users (tenant_id, username, name, pass_hash, role, is_super) VALUES (?,?,?,?,?,1)', array($tid, $username, $name, password_hash($password, PASSWORD_DEFAULT), 'admin'));
    $id = (int)db()->lastInsertId();
    q('INSERT INTO docs (tenant_id, kind, id, data) VALUES (?,?,?,?)', array($tid, 'settings', 'main', jenc(array('schoolName' => $school, 'teacherName' => $name))));
    $p = platform(); $p['brand'] = $p['brand'] ?: 'Asesmen Merdeka';
    out(array('token' => new_session($id), 'user' => public_user(one('SELECT * FROM users WHERE id = ?', array($id)))));
  }

  /* ---------- pendaftaran sekolah baru (masa coba gratis) ---------- */
  if ($route === 'register' && $method === 'POST') {
    if ((int)one('SELECT COUNT(*) AS n FROM users')['n'] === 0) bad(409, 'Aplikasi belum dipasang oleh pemilik.');
    $k = lock_key('register');
    if (is_locked($k, 5)) bad(429, 'Terlalu banyak pendaftaran dari jaringan ini. Coba lagi 10 menit lagi.');
    $school = str_cut(prop($body, 'schoolName', ''), 200);
    $name = str_cut(prop($body, 'name', ''), 150);
    $email = strtolower(trim((string)prop($body, 'email', '')));
    $phone = str_cut(preg_replace('/[^0-9+]/', '', (string)prop($body, 'phone', '')), 40);
    $password = prop($body, 'password');
    if (strlen($school) < 3) bad(400, 'Nama sekolah wajib diisi.');
    if ($name === '') bad(400, 'Nama Anda wajib diisi.');
    if (!valid_email($email)) bad(400, 'Alamat email tidak valid.');
    if (!valid_password($password)) bad(400, 'Password minimal 6 karakter.');
    if (one('SELECT id FROM users WHERE username = ?', array($email))) bad(409, 'Email ini sudah terdaftar. Silakan masuk.');
    add_fail($k);
    $days = max(0, (int)platform()['trialDays']);
    q('INSERT INTO tenants (name, plan, paid_until, contact_name, contact_email, contact_phone) VALUES (?,?,?,?,?,?)',
      array($school, 'trial', date('Y-m-d H:i:s', time() + $days * 86400), $name, $email, $phone));
    $tid = (int)db()->lastInsertId();
    q('INSERT INTO users (tenant_id, username, name, pass_hash, role) VALUES (?,?,?,?,?)', array($tid, $email, $name, password_hash($password, PASSWORD_DEFAULT), 'admin'));
    $id = (int)db()->lastInsertId();
    q('INSERT INTO docs (tenant_id, kind, id, data) VALUES (?,?,?,?)', array($tid, 'settings', 'main', jenc(array('schoolName' => $school, 'teacherName' => $name))));
    out(array('token' => new_session($id), 'user' => public_user(one('SELECT * FROM users WHERE id = ?', array($id)))));
  }

  /* ---------- login ---------- */
  if ($route === 'login' && $method === 'POST') {
    $username = trim((string)prop($body, 'username', '')); $password = (string)prop($body, 'password', '');
    $k = lock_key($username);
    if (is_locked($k)) bad(429, 'Terlalu banyak percobaan. Coba lagi 10 menit lagi.');
    $u = one('SELECT * FROM users WHERE username = ?', array($username));
    if (!$u && strpos($username, '@') !== false) $u = one('SELECT * FROM users WHERE LOWER(username) = ?', array(strtolower($username)));
    if (!$u || !password_verify($password, $u['pass_hash'])) { add_fail($k); bad(401, 'Email/username atau password salah.'); }
    clear_fail($k);
    out(array('token' => new_session((int)$u['id']), 'user' => public_user($u)));
  }

  /* ---------- lupa password: tautan atur ulang lewat email ---------- */
  if ($route === 'password/forgot' && $method === 'POST') {
    $login = trim((string)prop($body, 'login', ''));
    $generic = array('ok' => true, 'message' => 'Jika akun tersebut terdaftar dan memiliki email, tautan untuk mengatur ulang password sudah kami kirim. Periksa kotak masuk dan folder Spam. Tautan berlaku 60 menit.');
    if ($login === '' || strlen($login) > 150) bad(400, 'Isi email atau username akun Anda.');
    $kip = lock_key('forgot-ip'); $kac = lock_key('forgot:' . strtolower($login));
    if (is_locked($kip, 10) || is_locked($kac, 3)) bad(429, 'Terlalu banyak permintaan. Coba lagi 10 menit lagi.');
    add_fail($kip); add_fail($kac);
    $u = one('SELECT * FROM users WHERE LOWER(username) = ?', array(strtolower($login)));
    if (!$u && valid_email($login)) $u = one('SELECT * FROM users WHERE LOWER(email) = ? ORDER BY id LIMIT 1', array(strtolower($login)));
    if (!$u) out($generic);
    $to = user_email($u);
    if (!$to) out(array_merge($generic, array('noEmail' => true, 'message' => 'Akun ini belum memiliki email, jadi tautan tidak bisa dikirim. Minta admin sekolah mengatur ulang password Anda di menu Akun Guru, lalu tambahkan email di menu Akun Guru agar fitur ini bisa dipakai.')));
    $tok = bin2hex(random_bytes(32));
    q('DELETE FROM pw_resets WHERE user_id = ? OR expires < ?', array($u['id'], time() - 86400));
    q('INSERT INTO pw_resets (token_hash, user_id, expires) VALUES (?,?,?)', array(hash('sha256', $tok), $u['id'], time() + 3600));
    $link = app_base_url() . 'app.html#reset=' . $tok;
    $e = function ($x) { return htmlspecialchars($x, ENT_QUOTES, 'UTF-8'); };
    list($t, $h) = mail_layout('Atur ulang password', array(
      'Halo ' . $e($u['name']) . ',',
      'Kami menerima permintaan untuk mengatur ulang password akun <b>' . $e($u['username']) . '</b>. Klik tombol di bawah untuk membuat password baru. Tautan ini hanya berlaku <b>60 menit</b> dan hanya bisa dipakai sekali.'
    ), array('Buat Password Baru', $link), 'Jika Anda tidak meminta ini, abaikan email ini — password Anda tidak berubah. Permintaan dari IP ' . $e(client_ip()) . '.');
    try { send_mail($to, 'Atur ulang password ' . platform()['brand'], $t, $h); }
    catch (Exception $ex) { log_error('forgot: ' . $ex->getMessage()); bad(500, 'Email gagal dikirim. Hubungi admin sekolah atau pengelola layanan.'); }
    out(array_merge($generic, array('sentTo' => mask_email($to))));
  }
  if ($route === 'password/check' && $method === 'POST') {
    $r = one('SELECT r.*, u.name, u.username FROM pw_resets r JOIN users u ON u.id = r.user_id WHERE r.token_hash = ?', array(hash('sha256', (string)prop($body, 'token', ''))));
    if (!$r || $r['used'] || $r['expires'] < time()) bad(410, 'Tautan sudah kedaluwarsa atau sudah dipakai. Silakan minta tautan baru lewat "Lupa password".');
    out(array('ok' => true, 'name' => $r['name'], 'username' => $r['username']));
  }
  if ($route === 'password/reset' && $method === 'POST') {
    $k = lock_key('reset');
    if (is_locked($k, 10)) bad(429, 'Terlalu banyak percobaan. Coba lagi 10 menit lagi.');
    $th = hash('sha256', (string)prop($body, 'token', ''));
    $r = one('SELECT * FROM pw_resets WHERE token_hash = ?', array($th));
    if (!$r || $r['used'] || $r['expires'] < time()) { add_fail($k); bad(410, 'Tautan sudah kedaluwarsa atau sudah dipakai. Silakan minta tautan baru lewat "Lupa password".'); }
    $np = prop($body, 'password');
    if (!valid_password($np)) bad(400, 'Password baru minimal 6 karakter.');
    if (!q('UPDATE pw_resets SET used = 1 WHERE token_hash = ? AND used = 0', array($th))->rowCount()) bad(410, 'Tautan ini sudah dipakai.');
    q('UPDATE users SET pass_hash = ? WHERE id = ?', array(password_hash($np, PASSWORD_DEFAULT), $r['user_id']));
    q('DELETE FROM pw_resets WHERE user_id = ?', array($r['user_id']));
    q('DELETE FROM sessions WHERE user_id = ?', array($r['user_id']));
    $u = one('SELECT * FROM users WHERE id = ?', array($r['user_id']));
    notify_password_changed($u, 'lewat tautan lupa password');
    out(array('ok' => true, 'username' => $u['username']));
  }

  if ($route === 'logout') { auth(); q('DELETE FROM sessions WHERE token = ?', array($GLOBALS['TOKEN'])); out(array('ok' => true)); }
  if ($route === 'me') { $u = auth(); out(array('user' => public_user($u), 'subscription' => tenant_info(tenant_of($u)))); }

  if ($route === 'me/password' && $method === 'PUT') {
    $u = auth();
    if (!password_verify((string)prop($body, 'oldPassword', ''), $u['pass_hash'])) bad(400, 'Password lama salah.');
    $np = prop($body, 'newPassword');
    if (!valid_password($np)) bad(400, 'Password baru minimal 6 karakter.');
    q('UPDATE users SET pass_hash = ? WHERE id = ?', array(password_hash($np, PASSWORD_DEFAULT), $u['id']));
    q('DELETE FROM sessions WHERE user_id = ? AND token <> ?', array($u['id'], $GLOBALS['TOKEN']));
    notify_password_changed($u, 'dari menu Akun Guru');
    out(array('ok' => true));
  }
  if ($route === 'me/email' && $method === 'PUT') {
    $u = auth();
    if (!password_verify((string)prop($body, 'password', ''), $u['pass_hash'])) bad(400, 'Password salah.');
    $em = strtolower(trim((string)prop($body, 'email', '')));
    if ($em !== '' && !valid_email($em)) bad(400, 'Alamat email tidak valid.');
    q('UPDATE users SET email = ? WHERE id = ?', array($em === '' ? null : $em, $u['id']));
    out(array('ok' => true, 'user' => public_user(one('SELECT * FROM users WHERE id = ?', array($u['id'])))));
  }

  /* ---------- akun guru dalam sekolah (admin sekolah) ---------- */
  if ($seg && $seg[0] === 'users') {
    $u = auth(); admin_only($u); $tid = tenant_of($u);
    if (count($seg) === 1 && $method === 'GET') {
      $list = rows('SELECT id, username, name, role, email, created_at FROM users WHERE tenant_id = ? ORDER BY id', array($tid));
      foreach ($list as &$x) $x['id'] = (int)$x['id'];
      out(array('users' => $list));
    }
    require_active($u);
    if (count($seg) === 1 && $method === 'POST') {
      $un = trim((string)prop($body, 'username', '')); $pw = prop($body, 'password');
      if (!valid_username($un)) bad(400, 'Username/email 3–150 karakter tanpa spasi.');
      if (!valid_password($pw)) bad(400, 'Password minimal 6 karakter.');
      if (one('SELECT id FROM users WHERE username = ?', array($un))) bad(409, 'Username sudah dipakai.');
      $nm = str_cut(prop($body, 'name', ''), 150) ?: $un;
      $em = strtolower(trim((string)prop($body, 'email', '')));
      if ($em !== '' && !valid_email($em)) bad(400, 'Alamat email tidak valid.');
      q('INSERT INTO users (tenant_id, username, name, pass_hash, role, email) VALUES (?,?,?,?,?,?)', array($tid, $un, $nm, password_hash($pw, PASSWORD_DEFAULT), prop($body, 'role') === 'admin' ? 'admin' : 'guru', $em === '' ? null : $em));
      out(array('ok' => true));
    }
    $id = isset($seg[1]) ? (int)$seg[1] : 0;
    if (!one('SELECT id FROM users WHERE id = ? AND tenant_id = ?', array($id, $tid))) bad(404, 'Akun tidak ditemukan.');
    if (count($seg) === 3 && $seg[2] === 'password' && $method === 'PUT') {
      $pw = prop($body, 'password');
      if (!valid_password($pw)) bad(400, 'Password minimal 6 karakter.');
      q('UPDATE users SET pass_hash = ? WHERE id = ?', array(password_hash($pw, PASSWORD_DEFAULT), $id));
      q('DELETE FROM sessions WHERE user_id = ?', array($id));
      out(array('ok' => true));
    }
    if (count($seg) === 3 && $seg[2] === 'email' && $method === 'PUT') {
      $em = strtolower(trim((string)prop($body, 'email', '')));
      if ($em !== '' && !valid_email($em)) bad(400, 'Alamat email tidak valid.');
      q('UPDATE users SET email = ? WHERE id = ? AND tenant_id = ?', array($em === '' ? null : $em, $id, $tid));
      out(array('ok' => true));
    }
    if (count($seg) === 2 && $method === 'DELETE') {
      if ($id === (int)$u['id']) bad(400, 'Tidak bisa menghapus akun sendiri.');
      q('DELETE FROM sessions WHERE user_id = ?', array($id));
      q('DELETE FROM users WHERE id = ? AND tenant_id = ?', array($id, $tid));
      out(array('ok' => true));
    }
  }

  /* ---------- data aplikasi per sekolah ---------- */
  $DOC_KINDS = array('settings', 'classes', 'subjects', 'assessments', 'questionSets');
  $exam_code_of = function ($kind, $data) {
    return ($kind === 'assessments' && prop($data, 'examOpen') && prop($data, 'examCode')) ? substr(strtoupper((string)$data->examCode), 0, 16) : null;
  };

  if ($route === 'state') {
    $u = auth(); $tid = tenant_of($u);
    $settings = '{}'; $lists = array('classes' => array(), 'subjects' => array(), 'assessments' => array(), 'questionSets' => array());
    foreach (rows('SELECT kind, data FROM docs WHERE tenant_id = ?', array($tid)) as $d) {
      if ($d['kind'] === 'settings') $settings = $d['data'];
      elseif (isset($lists[$d['kind']])) $lists[$d['kind']][] = $d['data'];
    }
    $map = function ($sql, $col) use ($tid) {
      $g = array();
      foreach (rows($sql, array($tid)) as $r) $g[$r['a']][] = jenc((string)$r['s']) . ':' . $r[$col];
      $parts = array();
      foreach ($g as $a => $items) $parts[] = jenc((string)$a) . ':{' . implode(',', $items) . '}';
      return '{' . implode(',', $parts) . '}';
    };
    $themeJson = $u['theme'] ? $u['theme'] : 'null';
    $json = '{"state":{"settings":' . $settings;
    foreach ($lists as $k => $items) $json .= ',' . jenc($k) . ':[' . implode(',', $items) . ']';
    $json .= ',"scores":' . $map('SELECT assessment_id a, student_id s, value FROM scores WHERE tenant_id = ?', 'value');
    $json .= ',"submissions":' . $map('SELECT assessment_id a, student_id s, data FROM submissions WHERE tenant_id = ?', 'data');
    $json .= ',"theme":' . $themeJson . '},"user":' . jenc(public_user($u)) . ',"subscription":' . jenc(tenant_info($tid)) . '}';
    out($json);
  }

  if ($route === 'sync' && $method === 'POST') {
    $u = auth(); $uid = (int)$u['id']; $tid = tenant_of($u); $n = 0; $rejected = 0;
    $isAdmin = $u['role'] === 'admin';
    // Paket soal: guru hanya boleh mengubah/menghapus miliknya sendiri; admin sekolah boleh semuanya
    $qsOwner = function ($id) use ($tid) { $r = one('SELECT data FROM docs WHERE tenant_id = ? AND kind = ? AND id = ?', array($tid, 'questionSets', $id)); if (!$r) return false; $d = json_decode($r['data']); return $d ? prop($d, 'ownerId') : null; };
    $theme = prop($body, 'theme');
    $onlyTheme = !prop($body, 'docs') && !prop($body, 'delDocs') && !prop($body, 'scores') && !prop($body, 'delScores') && !prop($body, 'subs') && !prop($body, 'delSubs');
    if (!$onlyTheme) require_active($u);
    $pdo = db(); $pdo->beginTransaction();
    try {
      foreach ((array)prop($body, 'docs', array()) as $d) {
        $kind = prop($d, 'kind'); $id = clean_id(prop($d, 'id')); $data = prop($d, 'data');
        if (!in_array($kind, $DOC_KINDS, true) || !$id || !is_object($data)) continue;
        if ($kind === 'questionSets') {
          $owner = $qsOwner($id);
          if ($owner === false) { if (!prop($data, 'ownerId') || !$isAdmin) { $data->ownerId = $uid; $data->ownerName = $u['name']; } }
          elseif (!$isAdmin && (int)$owner !== $uid) { $rejected++; continue; }
          else { $data->ownerId = $owner === null ? ($isAdmin ? prop($data, 'ownerId') : $uid) : $owner; }
        }
        q('INSERT INTO docs (tenant_id, kind, id, data, exam_code, updated_by) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE data = VALUES(data), exam_code = VALUES(exam_code), updated_by = VALUES(updated_by)',
          array($tid, $kind, $id, jenc($data), $exam_code_of($kind, $data), $uid));
        $n++;
      }
      foreach ((array)prop($body, 'delDocs', array()) as $d) {
        $kind = prop($d, 'kind'); $id = clean_id(prop($d, 'id'));
        if (!in_array($kind, $DOC_KINDS, true) || !$id) continue;
        if ($kind === 'questionSets' && !$isAdmin) { $owner = $qsOwner($id); if ($owner !== false && (int)$owner !== $uid) { $rejected++; continue; } }
        q('DELETE FROM docs WHERE tenant_id = ? AND kind = ? AND id = ?', array($tid, $kind, $id)); $n++;
      }
      foreach ((array)prop($body, 'scores', array()) as $s) {
        $a = clean_id(prop($s, 'a')); $st = clean_id(prop($s, 's'));
        if (!$a || !$st) continue;
        q('INSERT INTO scores (tenant_id, assessment_id, student_id, value) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE value = VALUES(value)', array($tid, $a, $st, jenc(prop($s, 'v')))); $n++;
      }
      foreach ((array)prop($body, 'delScores', array()) as $s) {
        $a = clean_id(prop($s, 'a')); $st = prop($s, 's');
        if (!$a) continue;
        if ($st === '*') q('DELETE FROM scores WHERE tenant_id = ? AND assessment_id = ?', array($tid, $a));
        elseif (clean_id($st)) q('DELETE FROM scores WHERE tenant_id = ? AND assessment_id = ? AND student_id = ?', array($tid, $a, $st));
        $n++;
      }
      foreach ((array)prop($body, 'subs', array()) as $s) {
        $a = clean_id(prop($s, 'a')); $st = clean_id(prop($s, 's'));
        if (!$a || !$st) continue;
        q('INSERT INTO submissions (tenant_id, assessment_id, student_id, data) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE data = VALUES(data)', array($tid, $a, $st, jenc(prop($s, 'd')))); $n++;
      }
      foreach ((array)prop($body, 'delSubs', array()) as $s) {
        $a = clean_id(prop($s, 'a')); $st = prop($s, 's');
        if (!$a) continue;
        if ($st === '*') q('DELETE FROM submissions WHERE tenant_id = ? AND assessment_id = ?', array($tid, $a));
        elseif (clean_id($st)) q('DELETE FROM submissions WHERE tenant_id = ? AND assessment_id = ? AND student_id = ?', array($tid, $a, $st));
        $n++;
      }
      if (is_object($theme)) { q('UPDATE users SET theme = ? WHERE id = ?', array(jenc($theme), $uid)); $n++; }
      $pdo->commit();
    } catch (Exception $e) { $pdo->rollBack(); throw $e; }
    out(array('ok' => true, 'applied' => $n, 'rejected' => $rejected));
  }

  if ($route === 'import' && $method === 'POST') {
    $u = auth(); admin_only($u); require_active($u); $tid = tenant_of($u);
    $d = prop($body, 'state');
    if (!is_object($d) || !is_array(prop($d, 'classes'))) bad(400, 'Format cadangan tidak dikenali.');
    $pdo = db(); $pdo->beginTransaction();
    try {
      foreach (array('docs', 'scores', 'submissions') as $t) q("DELETE FROM `$t` WHERE tenant_id = ?", array($tid));
      if (is_object(prop($d, 'settings'))) q('INSERT INTO docs (tenant_id, kind, id, data) VALUES (?,?,?,?)', array($tid, 'settings', 'main', jenc($d->settings)));
      foreach (array('classes', 'subjects', 'assessments', 'questionSets') as $kind) {
        foreach ((array)prop($d, $kind, array()) as $it) {
          if (is_object($it) && clean_id(prop($it, 'id'))) q('INSERT INTO docs (tenant_id, kind, id, data, exam_code) VALUES (?,?,?,?,?)', array($tid, $kind, $it->id, jenc($it), $exam_code_of($kind, $it)));
        }
      }
      foreach (array('scores', 'submissions') as $k) {
        $m = prop($d, $k);
        if (!is_object($m)) continue;
        foreach (get_object_vars($m) as $a => $bys) {
          if (!clean_id($a) || !is_object($bys)) continue;
          foreach (get_object_vars($bys) as $s => $v) {
            if (!clean_id($s)) continue;
            if ($k === 'scores') q('INSERT INTO scores (tenant_id, assessment_id, student_id, value) VALUES (?,?,?,?)', array($tid, $a, $s, jenc($v)));
            else q('INSERT INTO submissions (tenant_id, assessment_id, student_id, data) VALUES (?,?,?,?)', array($tid, $a, $s, jenc($v)));
          }
        }
      }
      $pdo->commit();
    } catch (Exception $e) { $pdo->rollBack(); throw $e; }
    out(array('ok' => true));
  }

  /* ---------- langganan sekolah ---------- */
  if ($route === 'billing' && $method === 'GET') {
    $u = auth(); $tid = tenant_of($u); $p = platform();
    $pays = rows('SELECT id, plan_id, plan_name, months, amount, note, status, admin_note, created_at, decided_at, (proof IS NOT NULL AND proof <> \'\') AS has_proof FROM payments WHERE tenant_id = ? ORDER BY id DESC LIMIT 50', array($tid));
    foreach ($pays as &$x) { $x['id'] = (int)$x['id']; $x['months'] = (int)$x['months']; $x['amount'] = (int)$x['amount']; $x['has_proof'] = (bool)$x['has_proof']; }
    out(array('subscription' => tenant_info($tid), 'plans' => $p['plans'], 'bankInfo' => $p['bankInfo'], 'whatsapp' => $p['whatsapp'], 'email' => $p['email'], 'payments' => $pays, 'isAdmin' => $u['role'] === 'admin'));
  }
  if ($route === 'billing/pay' && $method === 'POST') {
    $u = auth(); admin_only($u); $tid = tenant_of($u);
    $plan = find_plan((string)prop($body, 'planId', ''));
    if (!$plan) bad(400, 'Paket tidak ditemukan.');
    $proof = (string)prop($body, 'proof', '');
    if ($proof !== '' && !preg_match('#^data:image/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$#', $proof)) bad(400, 'Bukti transfer harus berupa gambar.');
    if (strlen($proof) > 3 * 1024 * 1024) bad(400, 'Gambar bukti transfer terlalu besar.');
    if ($proof === '') bad(400, 'Unggah foto/screenshot bukti transfer.');
    if ((int)one("SELECT COUNT(*) AS n FROM payments WHERE tenant_id = ? AND status = 'pending'", array($tid))['n'] >= 3) bad(429, 'Masih ada pembayaran yang menunggu verifikasi.');
    $info = tenant_info($tid);
    $amount = (int)$plan['price'] + $info['uniqueCode'];
    q('INSERT INTO payments (tenant_id, user_id, plan_id, plan_name, months, amount, proof, note) VALUES (?,?,?,?,?,?,?,?)',
      array($tid, $u['id'], $plan['id'], $plan['name'], (int)$plan['months'], $amount, $proof, str_cut(prop($body, 'note', ''), 500)));
    out(array('ok' => true));
  }

  /* ---------- panel pemilik platform ---------- */
  if ($seg && $seg[0] === 'owner') {
    $u = auth(); super_only($u);
    $sub = isset($seg[1]) ? $seg[1] : '';

    if ($sub === 'overview' && $method === 'GET') {
      $ts = rows('SELECT * FROM tenants ORDER BY id DESC');
      $users = array(); foreach (rows('SELECT tenant_id, COUNT(*) n FROM users GROUP BY tenant_id') as $r) $users[(int)$r['tenant_id']] = (int)$r['n'];
      $students = array(); $asm = array();
      foreach (rows("SELECT tenant_id, kind, data FROM docs WHERE kind IN ('classes','assessments')") as $r) {
        $t = (int)$r['tenant_id'];
        if ($r['kind'] === 'classes') { $c = json_decode($r['data']); $students[$t] = (isset($students[$t]) ? $students[$t] : 0) + count((array)prop($c, 'students', array())); }
        else $asm[$t] = (isset($asm[$t]) ? $asm[$t] : 0) + 1;
      }
      $paid = array(); foreach (rows("SELECT tenant_id, SUM(amount) s FROM payments WHERE status = 'approved' GROUP BY tenant_id") as $r) $paid[(int)$r['tenant_id']] = (int)$r['s'];
      $list = array();
      foreach ($ts as $t) {
        $id = (int)$t['id'];
        $admin = one("SELECT id, username FROM users WHERE tenant_id = ? AND role = 'admin' ORDER BY id LIMIT 1", array($id));
        $list[] = array_merge(tenant_info($t), array(
          'contactName' => $t['contact_name'], 'contactEmail' => $t['contact_email'], 'contactPhone' => $t['contact_phone'], 'createdAt' => $t['created_at'],
          'users' => isset($users[$id]) ? $users[$id] : 0, 'students' => isset($students[$id]) ? $students[$id] : 0, 'assessments' => isset($asm[$id]) ? $asm[$id] : 0,
          'revenue' => isset($paid[$id]) ? $paid[$id] : 0, 'adminId' => $admin ? (int)$admin['id'] : null, 'adminUser' => $admin ? $admin['username'] : null
        ));
      }
      $pending = (int)one("SELECT COUNT(*) n FROM payments WHERE status = 'pending'")['n'];
      $revenue = (int)one("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE status = 'approved'")['s'];
      $month = (int)one("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE status = 'approved' AND decided_at >= ?", array(date('Y-m-01 00:00:00')))['s'];
      out(array('tenants' => $list, 'pending' => $pending, 'revenue' => $revenue, 'revenueMonth' => $month, 'platform' => platform(), 'mail' => mail_config_public()));
    }

    if ($sub === 'tenants' && isset($seg[2]) && $method === 'PUT') {
      $id = (int)$seg[2];
      $t = one('SELECT * FROM tenants WHERE id = ?', array($id));
      if (!$t) bad(404, 'Sekolah tidak ditemukan.');
      if (property_exists($body, 'suspended')) q('UPDATE tenants SET suspended = ? WHERE id = ?', array($body->suspended ? 1 : 0, $id));
      if (property_exists($body, 'name') && str_cut($body->name, 200) !== '') q('UPDATE tenants SET name = ? WHERE id = ?', array(str_cut($body->name, 200), $id));
      if (property_exists($body, 'unlimited') && $body->unlimited) q("UPDATE tenants SET paid_until = NULL, plan = 'unlimited' WHERE id = ?", array($id));
      if (property_exists($body, 'addDays') && (int)$body->addDays !== 0) {
        $base = ($t['paid_until'] !== null && strtotime($t['paid_until']) > time()) ? strtotime($t['paid_until']) : time();
        q('UPDATE tenants SET paid_until = ?, plan = IF(plan = \'unlimited\', \'manual\', plan) WHERE id = ?', array(date('Y-m-d H:i:s', $base + (int)$body->addDays * 86400), $id));
      }
      if (property_exists($body, 'setUntil') && is_string($body->setUntil) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $body->setUntil)) {
        q('UPDATE tenants SET paid_until = ?, plan = IF(plan = \'unlimited\', \'manual\', plan) WHERE id = ?', array($body->setUntil . ' 23:59:59', $id));
      }
      out(array('ok' => true, 'tenant' => tenant_info($id)));
    }

    if ($sub === 'payments' && !isset($seg[2]) && $method === 'GET') {
      $status = isset($_GET['status']) ? $_GET['status'] : 'pending';
      $sql = 'SELECT p.*, t.name AS tenant_name FROM payments p JOIN tenants t ON t.id = p.tenant_id' . ($status === 'all' ? '' : ' WHERE p.status = ?') . ' ORDER BY p.id DESC LIMIT 100';
      $list = rows($sql, $status === 'all' ? array() : array($status));
      foreach ($list as &$x) { $x['id'] = (int)$x['id']; $x['amount'] = (int)$x['amount']; $x['months'] = (int)$x['months']; $x['tenant_id'] = (int)$x['tenant_id']; }
      out(array('payments' => $list));
    }

    if ($sub === 'payments' && isset($seg[2]) && $method === 'POST') {
      $id = (int)$seg[2];
      $p = one('SELECT * FROM payments WHERE id = ?', array($id));
      if (!$p) bad(404, 'Pembayaran tidak ditemukan.');
      if ($p['status'] !== 'pending') bad(409, 'Pembayaran ini sudah diproses.');
      $action = prop($body, 'action'); $note = str_cut(prop($body, 'note', ''), 500);
      $pdo = db(); $pdo->beginTransaction();
      try {
        if ($action === 'approve') {
          $t = one('SELECT * FROM tenants WHERE id = ? FOR UPDATE', array($p['tenant_id']));
          if ($t['paid_until'] !== null) {
            $base = strtotime($t['paid_until']) > time() ? strtotime($t['paid_until']) : time();
            $until = date('Y-m-d H:i:s', strtotime('+' . (int)$p['months'] . ' months', $base));
            q('UPDATE tenants SET paid_until = ?, plan = ? WHERE id = ?', array($until, $p['plan_id'], $p['tenant_id']));
          }
          q("UPDATE payments SET status = 'approved', admin_note = ?, decided_at = NOW() WHERE id = ?", array($note, $id));
        } elseif ($action === 'reject') {
          q("UPDATE payments SET status = 'rejected', admin_note = ?, decided_at = NOW() WHERE id = ?", array($note, $id));
        } else { $pdo->rollBack(); bad(400, 'Aksi tidak dikenali.'); }
        $pdo->commit();
      } catch (Exception $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
      out(array('ok' => true, 'tenant' => tenant_info((int)$p['tenant_id'])));
    }

    if ($sub === 'mail' && $method === 'PUT') {
      $cur = mail_config();
      $sec = (string)prop($body, 'smtpSecure', 'ssl');
      $new = array(
        'fromEmail' => strtolower(trim((string)prop($body, 'fromEmail', ''))),
        'fromName' => str_cut(prop($body, 'fromName', ''), 80),
        'smtpHost' => preg_replace('/[^a-z0-9.\-]/', '', strtolower(trim((string)prop($body, 'smtpHost', '')))),
        'smtpPort' => max(1, min(65535, (int)prop($body, 'smtpPort', 465))),
        'smtpSecure' => in_array($sec, array('ssl', 'tls', 'none'), true) ? $sec : 'ssl',
        'smtpUser' => str_cut(prop($body, 'smtpUser', ''), 150),
        'smtpPass' => prop($body, 'smtpPass', '') !== '' ? (string)prop($body, 'smtpPass') : ($cur['smtpHost'] !== '' ? $cur['smtpPass'] : '')
      );
      if (prop($body, 'clearPass')) $new['smtpPass'] = '';
      if ($new['fromEmail'] !== '' && !valid_email($new['fromEmail'])) bad(400, 'Email pengirim tidak valid.');
      q('REPLACE INTO platform (k, v) VALUES (?,?)', array('mail', jenc($new)));
      out(array('ok' => true, 'mail' => mail_config_public()));
    }
    if ($sub === 'mail-test' && $method === 'POST') {
      $to = strtolower(trim((string)prop($body, 'to', '')));
      if (!valid_email($to)) bad(400, 'Isi alamat email tujuan uji.');
      list($t, $h) = mail_layout('Email uji berhasil 🎉', array('Pengiriman email dari ' . htmlspecialchars(platform()['brand']) . ' sudah berfungsi. Fitur <b>Lupa password</b> siap dipakai.'));
      try { send_mail($to, 'Email uji ' . platform()['brand'], $t, $h); } catch (Exception $ex) { bad(500, $ex->getMessage()); }
      out(array('ok' => true));
    }

    if ($sub === 'config' && $method === 'PUT') {
      $cur = platform();
      $new = array(
        'brand' => str_cut(prop($body, 'brand', $cur['brand']), 80) ?: 'Asesmen Merdeka',
        'tagline' => str_cut(prop($body, 'tagline', $cur['tagline']), 300),
        'trialDays' => max(0, min(365, (int)prop($body, 'trialDays', $cur['trialDays']))),
        'bankInfo' => str_cut(prop($body, 'bankInfo', $cur['bankInfo']), 1000),
        'whatsapp' => str_cut(preg_replace('/[^0-9]/', '', (string)prop($body, 'whatsapp', $cur['whatsapp'])), 20),
        'email' => str_cut(prop($body, 'email', $cur['email']), 150),
        'plans' => array()
      );
      foreach ((array)prop($body, 'plans', array()) as $pl) {
        $pid = preg_replace('/[^a-z0-9_-]/', '', strtolower((string)prop($pl, 'id', '')));
        $name = str_cut(prop($pl, 'name', ''), 60);
        if ($pid === '' || $name === '' || $pid === 'trial' || $pid === 'unlimited' || $pid === 'manual') continue;
        $new['plans'][] = array('id' => $pid, 'name' => $name, 'price' => max(0, (int)prop($pl, 'price', 0)), 'months' => max(1, min(36, (int)prop($pl, 'months', 1))), 'desc' => str_cut(prop($pl, 'desc', ''), 120));
      }
      if (!$new['plans']) bad(400, 'Minimal harus ada satu paket.');
      q('REPLACE INTO platform (k, v) VALUES (?,?)', array('config', jenc($new)));
      out(array('ok' => true, 'platform' => $new));
    }

    if ($sub === 'users' && isset($seg[2]) && isset($seg[3]) && $seg[3] === 'password' && $method === 'PUT') {
      $pw = prop($body, 'password');
      if (!valid_password($pw)) bad(400, 'Password minimal 6 karakter.');
      q('UPDATE users SET pass_hash = ? WHERE id = ?', array(password_hash($pw, PASSWORD_DEFAULT), (int)$seg[2]));
      q('DELETE FROM sessions WHERE user_id = ?', array((int)$seg[2]));
      out(array('ok' => true));
    }
  }

  /* ---------- berkas jawaban (gambar/rekaman) untuk koreksi guru ---------- */
  if ($seg && $seg[0] === 'media' && isset($seg[1]) && $method === 'GET') {
    $u = auth(); $tid = tenant_of($u);
    $m = one('SELECT data FROM media WHERE id = ? AND tenant_id = ?', array(preg_replace('/[^a-f0-9]/', '', $seg[1]), $tid));
    if (!$m) bad(404, 'Berkas tidak ditemukan.');
    out(array('data' => $m['data']));
  }

  /* ---------- Kuis Seru: guru ---------- */
  if ($seg && $seg[0] === 'games') {
    $u = auth(); $tid = tenant_of($u);
    $load_game = function ($id) use ($tid) { $g = one('SELECT * FROM games WHERE id = ? AND tenant_id = ?', array((int)$id, $tid)); if (!$g) bad(404, 'Kuis tidak ditemukan.'); return $g; };

    if (count($seg) === 1 && $method === 'GET') {
      $list = rows('SELECT g.id, g.code, g.title, g.status, g.class_id, g.created_at, g.ended_at, (g.data LIKE \'%"mode":"exam"%\') AS is_exam, COUNT(p.id) AS players, COALESCE(SUM(p.correct),0) AS correct, COALESCE(SUM(p.answered),0) AS answered
        FROM games g LEFT JOIN game_players p ON p.game_id = g.id WHERE g.tenant_id = ? GROUP BY g.id ORDER BY g.id DESC LIMIT 100', array($tid));
      foreach ($list as &$x) { foreach (array('id', 'players', 'correct', 'answered') as $k) $x[$k] = (int)$x[$k]; $x['is_exam'] = (bool)$x['is_exam']; }
      out(array('games' => $list));
    }

    require_active($u);
    if (count($seg) === 1 && $method === 'POST') {
      $qs = one('SELECT data FROM docs WHERE tenant_id = ? AND kind = ? AND id = ?', array($tid, 'questionSets', (string)prop($body, 'qsetId', '')));
      if (!$qs) bad(400, 'Paket soal tidak ditemukan.');
      $set = json_decode($qs['data']);
      $mode = prop($body, 'mode') === 'exam' ? 'exam' : 'game';
      $questions = array(); $skipped = 0;
      foreach ((array)prop($set, 'questions', array()) as $q) {
        $t = prop($q, 'type');
        $okType = in_array($t, q_types(), true) && ($mode === 'exam' || game_type($t));
        $needOpts = in_array($t, array('pg', 'pgk', 'polling'), true) && count((array)prop($q, 'options', array())) < 2;
        if (!$okType || !has_key($q) || $needOpts) { $skipped++; continue; }
        $qa = json_decode(json_encode($q), true);
        unset($qa['num'], $qa['line'], $qa['ownerId']);
        $qa['id'] = (string)$q->id; $qa['text'] = (string)prop($q, 'text', ''); $qa['image'] = prop($q, 'image');
        if (!isset($qa['options'])) $qa['options'] = array();
        $qa['points'] = ungraded_type($t) ? 0 : ((float)prop($q, 'points', 0) ?: default_points($t));
        $questions[] = $qa;
      }
      if (!$questions) bad(400, $mode === 'exam' ? 'Paket soal ini belum punya soal yang bisa dipakai (periksa kunci jawabannya).' : 'Paket soal ini tidak punya soal yang bisa dipakai untuk kuis permainan (soal harus sudah lengkap kuncinya; uraian, menggambar dan rekam suara hanya untuk mode Ujian).');
      $settings = array(
        'mode' => $mode,
        'music' => substr(preg_replace('/[^a-z]/', '', (string)prop($body, 'music', '')), 0, 16),
        'duration' => max(0, min(600, (int)prop($body, 'duration', 60))),
        'showResult' => (bool)prop($body, 'showResult', true),
        'maxViolations' => max(0, min(20, (int)prop($body, 'maxViolations', 0))),
        'time' => max(5, min(300, (int)prop($body, 'time', 20))),
        'shuffleQ' => (bool)prop($body, 'shuffleQ', true), 'shuffleOpt' => (bool)prop($body, 'shuffleOpt', true),
        'showAnswer' => (bool)prop($body, 'showAnswer', true), 'speedBonus' => (bool)prop($body, 'speedBonus', true),
        'qsetId' => (string)$set->id
      );
      do { $code = (string)random_int(100000, 999999); } while (one("SELECT id FROM games WHERE code = ? AND status <> 'ended'", array($code)));
      $title = str_cut(prop($body, 'title', '') ?: prop($set, 'title', 'Kuis'), 200);
      $cls = clean_id(prop($body, 'classId')); $subj = clean_id(prop($body, 'subjectId'));
      q('INSERT INTO games (tenant_id, code, title, data, class_id, subject_id, created_by) VALUES (?,?,?,?,?,?,?)',
        array($tid, $code, $title, jenc(array('questions' => $questions, 'settings' => $settings)), $cls, $subj, $u['id']));
      out(array('ok' => true, 'id' => (int)db()->lastInsertId(), 'code' => $code, 'skipped' => $skipped, 'count' => count($questions)));
    }

    $g = $load_game(isset($seg[1]) ? $seg[1] : 0);
    $act = isset($seg[2]) ? $seg[2] : '';
    if ($act === '' && $method === 'GET') {
      $data = json_decode($g['data'], true);
      $isExam = isset($data['settings']['mode']) && $data['settings']['mode'] === 'exam';
      $players = rows('SELECT id, nickname, avatar, student_id, score, correct, answered, streak, best_streak, answers, finished_at, joined_at, exam_score, violations, started_ms, flags, extra FROM game_players WHERE game_id = ? ORDER BY ' . ($isExam ? 'id' : 'score DESC, correct DESC, id'), array($g['id']));
      $qstat = array(); foreach ($data['questions'] as $q) $qstat[$q['id']] = array('ok' => 0, 'n' => 0);
      foreach ($players as &$p) {
        foreach (array('id', 'score', 'correct', 'answered', 'streak', 'best_streak', 'violations', 'started_ms') as $k) $p[$k] = (int)$p[$k];
        $p['exam_score'] = $p['exam_score'] === null ? null : (float)$p['exam_score'];
        $ans = $p['answers'] ? json_decode($p['answers'], true) : array();
        if (!is_array($ans)) $ans = array();
        $p['finished'] = $p['finished_at'] !== null;
        $ex = $p['extra'] ? json_decode($p['extra'], true) : null;
        if ($isExam) {
          $p['answeredCount'] = count(array_filter($ans, function ($v) { return trim(is_array($v) ? (string)(isset($v['a']) ? $v['a'] : '') : (string)$v) !== ''; }));
          $p['flagCount'] = count(array_filter((array)json_decode($p['flags'] ?: '{}', true)));
          $p['remainingMs'] = ($p['started_ms'] && $data['settings']['duration']) ? max(0, $data['settings']['duration'] * 60000 - (now_ms() - $p['started_ms'])) : null;
          $p['result'] = $ex && isset($ex['result']) ? $ex['result'] : null;
          $p['manual'] = $ex && isset($ex['manual']) ? $ex['manual'] : new stdClass();
          if ($p['result']) foreach ($p['result']['detail'] as $d) if (isset($qstat[$d['id']])) { if ($d['status'] !== 'kosong') $qstat[$d['id']]['n']++; if ($d['got'] >= $d['pts'] && $d['pts'] > 0) $qstat[$d['id']]['ok']++; }
        } else {
          foreach ($ans as $qid => $a) if (isset($qstat[$qid])) { $qstat[$qid]['n']++; if (!empty($a['ok'])) $qstat[$qid]['ok']++; }
        }
        $p['answers'] = $ans;
        unset($p['extra'], $p['flags']);
      }
      $qs = array();
      foreach ($data['questions'] as $i => $q) $qs[] = array_merge(array('answer' => null, 'options' => array(), 'points' => 1), $q, array('no' => $i + 1, 'ok' => $qstat[$q['id']]['ok'], 'n' => $qstat[$q['id']]['n']));
      out(array('game' => array('id' => (int)$g['id'], 'code' => $g['code'], 'title' => $g['title'], 'status' => $g['status'], 'classId' => $g['class_id'], 'subjectId' => $g['subject_id'],
        'settings' => $data['settings'], 'createdAt' => $g['created_at'], 'startedAt' => $g['started_at'], 'endedAt' => $g['ended_at']), 'questions' => $qs, 'players' => $players));
    }
    if ($act === 'start' && $method === 'POST') { q("UPDATE games SET status = 'running', started_at = NOW() WHERE id = ? AND status = 'lobby'", array($g['id'])); out(array('ok' => true)); }
    if ($act === 'end' && $method === 'POST') {
      q("UPDATE games SET status = 'ended', ended_at = NOW() WHERE id = ? AND status <> 'ended'", array($g['id']));
      $data = json_decode($g['data'], true);
      if (isset($data['settings']['mode']) && $data['settings']['mode'] === 'exam') {
        // Kumpulkan otomatis lembar murid yang belum menekan Selesai
        foreach (rows('SELECT * FROM game_players WHERE game_id = ? AND finished_at IS NULL', array($g['id'])) as $p) exam_finish_player($data['questions'], $p);
      }
      out(array('ok' => true));
    }
    if ($act === 'reset' && $method === 'POST') {
      q("UPDATE game_players SET answers = '{}', flags = NULL, extra = NULL, exam_score = NULL, correct = 0, violations = 0, started_ms = 0, finished_at = NULL WHERE id = ? AND game_id = ?", array((int)prop($body, 'playerId', 0), $g['id']));
      out(array('ok' => true));
    }
    if ($act === 'grade' && $method === 'POST') {
      $p = one('SELECT * FROM game_players WHERE id = ? AND game_id = ?', array((int)prop($body, 'playerId', 0), $g['id']));
      if (!$p) bad(404, 'Peserta tidak ditemukan.');
      $data = json_decode($g['data'], true);
      $manual = array(); foreach ((array)prop($body, 'manual', array()) as $k => $v) if ($v !== '' && $v !== null) $manual[$k] = (float)$v;
      list($r) = exam_grade_player($data['questions'], $p, $manual);
      $correct = 0; foreach ($r['detail'] as $d) if ($d['status'] === 'benar') $correct++;
      $r['needsReview'] = false;
      q('UPDATE game_players SET exam_score = ?, correct = ?, extra = ? WHERE id = ?', array($r['score'], $correct, jenc(array('manual' => (object)$manual, 'result' => $r)), $p['id']));
      out(array('ok' => true, 'score' => $r['score']));
    }
    if ($act === 'kick' && $method === 'POST') { q('DELETE FROM game_players WHERE id = ? AND game_id = ?', array((int)prop($body, 'playerId', 0), $g['id'])); out(array('ok' => true)); }
    if ($act === '' && $method === 'DELETE') { q('DELETE FROM game_players WHERE game_id = ?', array($g['id'])); q('DELETE FROM games WHERE id = ?', array($g['id'])); out(array('ok' => true)); }
  }

  /* ---------- Kuis Seru: pemain (murid) ---------- */
  if ($seg && $seg[0] === 'play' && isset($seg[1])) {
    $code = preg_replace('/\D/', '', $seg[1]);
    $g = $code !== '' ? one("SELECT * FROM games WHERE code = ? ORDER BY (status = 'ended'), id DESC LIMIT 1", array($code)) : null;
    if (!$g) bad(404, 'Kode kuis tidak ditemukan. Periksa lagi kodenya.');
    $ti = tenant_info((int)$g['tenant_id']);
    if (!$ti || !$ti['active']) bad(404, 'Kuis tidak tersedia: langganan sekolah sedang tidak aktif.');
    $data = json_decode($g['data'], true); $qsAll = $data['questions']; $set = $data['settings'];
    $act = isset($seg[2]) ? $seg[2] : '';
    $tok = preg_replace('/[^a-f0-9]/', '', (string)(prop($body, 'token') ?: (isset($_GET['token']) ? $_GET['token'] : '')));
    $me = $tok ? one('SELECT * FROM game_players WHERE token = ? AND game_id = ?', array($tok, $g['id'])) : null;
    $rank_of = function ($p) use ($g) { return 1 + (int)one('SELECT COUNT(*) n FROM game_players WHERE game_id = ? AND (score > ? OR (score = ? AND correct > ?))', array($g['id'], $p['score'], $p['score'], $p['correct']))['n']; };
    $count = function () use ($g) { return (int)one('SELECT COUNT(*) n FROM game_players WHERE game_id = ?', array($g['id']))['n']; };
    $roster = function () use ($g) {
      if (!$g['class_id']) return null;
      $c = one('SELECT data FROM docs WHERE tenant_id = ? AND kind = ? AND id = ?', array($g['tenant_id'], 'classes', $g['class_id']));
      return $c ? (array)prop(json_decode($c['data']), 'students', array()) : array();
    };
    $isExam = isset($set['mode']) && $set['mode'] === 'exam';
    $meOut = function ($p) use ($rank_of, $qsAll, $isExam, $set) {
      if ($isExam) {
        $ex = $p['extra'] ? json_decode($p['extra'], true) : null;
        return array('id' => (int)$p['id'], 'nickname' => $p['nickname'], 'avatar' => $p['avatar'], 'total' => count($qsAll), 'finished' => $p['finished_at'] !== null,
          'started' => (int)$p['started_ms'] > 0, 'violations' => (int)$p['violations'],
          'remainingMs' => ((int)$p['started_ms'] && $set['duration']) ? max(0, $set['duration'] * 60000 - (now_ms() - (int)$p['started_ms'])) : null,
          'result' => ($p['finished_at'] !== null && !empty($set['showResult']) && $ex && isset($ex['result'])) ? array('score' => $ex['result']['score'], 'needsReview' => !empty($ex['result']['needsReview'])) : null);
      }
      $graded = 0; foreach ($qsAll as $x) if (!ungraded_type($x['type'])) $graded++;
      return array('id' => (int)$p['id'], 'nickname' => $p['nickname'], 'avatar' => $p['avatar'], 'score' => (int)$p['score'], 'correct' => (int)$p['correct'], 'answered' => (int)$p['answered'],
        'streak' => (int)$p['streak'], 'bestStreak' => (int)$p['best_streak'], 'rank' => $rank_of($p), 'finished' => $p['finished_at'] !== null, 'total' => $graded);
    };

    if ($act === '' && $method === 'GET') {
      $info = array('title' => $g['title'], 'status' => $g['status'], 'count' => count($qsAll), 'time' => $set['time'], 'players' => $count(), 'needName' => !$g['class_id'],
        'mode' => isset($set['mode']) ? $set['mode'] : 'game', 'music' => isset($set['music']) ? $set['music'] : '', 'duration' => isset($set['duration']) ? (int)$set['duration'] : 0, 'maxViolations' => isset($set['maxViolations']) ? (int)$set['maxViolations'] : 0);
      $st = one('SELECT data FROM docs WHERE tenant_id = ? AND kind = ? AND id = ?', array($g['tenant_id'], 'settings', 'main'));
      $info['schoolName'] = $st ? prop(json_decode($st['data']), 'schoolName', '') : '';
      $r = $roster();
      if ($r !== null) {
        $taken = array(); foreach (rows('SELECT student_id FROM game_players WHERE game_id = ? AND student_id IS NOT NULL', array($g['id'])) as $x) $taken[$x['student_id']] = true;
        $info['students'] = array(); foreach ($r as $s) $info['students'][] = array('id' => $s->id, 'name' => prop($s, 'name', ''), 'needNis' => trim((string)prop($s, 'nis', '')) !== '', 'taken' => isset($taken[$s->id]));
      }
      out($info);
    }

    if ($act === 'join' && $method === 'POST') {
      if ($g['status'] === 'ended') bad(409, 'Kuis ini sudah selesai.');
      $avatar = str_cut(prop($body, 'avatar', ''), 8);
      $r = $roster();
      if ($r !== null) {
        $sid = (string)prop($body, 'studentId', ''); $found = null;
        foreach ($r as $s) if ($s->id === $sid) $found = $s;
        if (!$found) bad(400, 'Pilih nama kamu dari daftar.');
        $k = lock_key('game:' . $g['id'] . ':' . $sid);
        if (is_locked($k)) bad(429, 'Terlalu banyak percobaan. Tunggu 10 menit.');
        $nis = trim((string)prop($found, 'nis', ''));
        if ($nis !== '' && strtolower($nis) !== strtolower(trim((string)prop($body, 'nis', '')))) { add_fail($k); bad(401, 'NIS tidak cocok.'); }
        $ex = one('SELECT * FROM game_players WHERE game_id = ? AND student_id = ?', array($g['id'], $sid));
        if ($ex) out(array('token' => $ex['token'], 'me' => $meOut($ex), 'rejoin' => true));
        $nick = str_cut(prop($found, 'name', 'Murid'), 60);
      } else {
        $nick = str_cut(preg_replace('/\s+/', ' ', (string)prop($body, 'nickname', '')), 30);
        if (str_len($nick) < 2) bad(400, 'Tulis nama panggilan minimal 2 huruf.');
        if (one('SELECT id FROM game_players WHERE game_id = ? AND LOWER(nickname) = ?', array($g['id'], lower($nick)))) bad(409, 'Nama itu sudah dipakai teman. Coba nama lain.');
        $sid = null;
      }
      if ($count() >= 300) bad(429, 'Kuis sudah penuh.');
      $order = range(0, count($qsAll) - 1);
      if ($set['shuffleQ']) shuffle($order);
      $token = bin2hex(random_bytes(16));
      q('INSERT INTO game_players (game_id, token, nickname, avatar, student_id, qorder, answers) VALUES (?,?,?,?,?,?,?)', array($g['id'], $token, $nick, $avatar, $sid, jenc($order), '{}'));
      $p = one('SELECT * FROM game_players WHERE token = ?', array($token));
      out(array('token' => $token, 'me' => $meOut($p)));
    }

    if (!$me) bad(401, 'Kamu belum bergabung di kuis ini.');

    if ($act === 'state') {
      $out = array('status' => $g['status'], 'players' => $count(), 'me' => $meOut($me));
      if ($g['status'] === 'lobby') $out['lobby'] = rows('SELECT nickname, avatar FROM game_players WHERE game_id = ? ORDER BY id DESC LIMIT 60', array($g['id']));
      if ($g['status'] === 'ended') $out['top'] = rows('SELECT nickname, avatar, score, correct FROM game_players WHERE game_id = ? ORDER BY score DESC, correct DESC, id LIMIT 3', array($g['id']));
      out($out);
    }

    if ($act === 'media' && $method === 'POST') {
      if ($me['finished_at'] !== null) bad(409, 'Jawaban sudah dikumpulkan.');
      $n = (int)one("SELECT COUNT(*) n FROM media WHERE tenant_id = ? AND created_at > (NOW() - INTERVAL 1 HOUR)", array($g['tenant_id']))['n'];
      if ($n > 5000) bad(429, 'Terlalu banyak unggahan. Coba lagi nanti.');
      $ref = store_media($g['tenant_id'], prop($body, 'data', ''));
      out(array('id' => substr($ref, 6)));
    }

    /* ----- mode ujian ----- */
    if ($isExam && in_array($act, array('exam-start', 'save', 'violation', 'submit'), true)) {
      if ($g['status'] === 'lobby') bad(409, 'Ujian belum dimulai guru.');
      if ($me['finished_at'] !== null) out(array('finished' => true, 'me' => $meOut($me)));
      if ($g['status'] === 'ended') { exam_finish_player($qsAll, $me); $me = one('SELECT * FROM game_players WHERE id = ?', array($me['id'])); out(array('finished' => true, 'me' => $meOut($me))); }
      $limitMs = $set['duration'] ? $set['duration'] * 60000 : 0;
      $started = (int)$me['started_ms'];
      $expired = $started && $limitMs && now_ms() - $started > $limitMs + 60000;
      $merge = function () use ($body, $me, $qsAll, $g) {
        $ans = $me['answers'] ? json_decode($me['answers'], true) : array(); if (!is_array($ans)) $ans = array();
        $flags = $me['flags'] ? json_decode($me['flags'], true) : array(); if (!is_array($flags)) $flags = array();
        $ids = array(); foreach ($qsAll as $q) $ids[$q['id']] = true;
        $in = prop($body, 'answers'); if (is_object($in)) foreach (get_object_vars($in) as $k => $v) if (isset($ids[$k])) $ans[$k] = clean_answer($g['tenant_id'], $v);
        $fl = prop($body, 'flags'); if (is_object($fl)) { $flags = array(); foreach (get_object_vars($fl) as $k => $v) if (isset($ids[$k]) && $v) $flags[$k] = true; }
        return array($ans, $flags);
      };
      if ($act === 'exam-start') {
        if (!$started) { q('UPDATE game_players SET started_ms = ? WHERE id = ? AND started_ms = 0', array(now_ms(), $me['id'])); $me = one('SELECT * FROM game_players WHERE id = ?', array($me['id'])); }
        $order = json_decode($me['qorder'], true); $list = array();
        foreach ($order as $i) $list[] = public_q(json_decode(json_encode($qsAll[$i])), $me['token'], !empty($set['shuffleOpt']));
        out(array('questions' => $list, 'answers' => (object)($me['answers'] ? json_decode($me['answers'], true) : array()), 'flags' => (object)($me['flags'] ? json_decode($me['flags'], true) : array()), 'me' => $meOut($me)));
      }
      if ($act === 'save') {
        if ($expired) { exam_finish_player($qsAll, $me); $me = one('SELECT * FROM game_players WHERE id = ?', array($me['id'])); out(array('finished' => true, 'me' => $meOut($me))); }
        list($ans, $flags) = $merge();
        q('UPDATE game_players SET answers = ?, flags = ?, answered = ? WHERE id = ? AND finished_at IS NULL', array(jenc((object)$ans), jenc((object)$flags), count(array_filter($ans, 'is_answered')), $me['id']));
        out(array('ok' => true, 'savedAt' => now_ms()));
      }
      if ($act === 'violation') {
        q('UPDATE game_players SET violations = violations + 1 WHERE id = ?', array($me['id']));
        $me = one('SELECT * FROM game_players WHERE id = ?', array($me['id']));
        $max = (int)$set['maxViolations'];
        if ($max > 0 && (int)$me['violations'] >= $max) { exam_finish_player($qsAll, $me); $me = one('SELECT * FROM game_players WHERE id = ?', array($me['id'])); out(array('locked' => true, 'violations' => (int)$me['violations'], 'me' => $meOut($me))); }
        out(array('locked' => false, 'violations' => (int)$me['violations'], 'max' => $max));
      }
      if ($act === 'submit') {
        if (!$expired) { list($ans, $flags) = $merge(); q('UPDATE game_players SET answers = ?, flags = ?, answered = ? WHERE id = ?', array(jenc((object)$ans), jenc((object)$flags), count(array_filter($ans, 'is_answered')), $me['id'])); }
        $me = one('SELECT * FROM game_players WHERE id = ?', array($me['id']));
        exam_finish_player($qsAll, $me);
        $me = one('SELECT * FROM game_players WHERE id = ?', array($me['id']));
        out(array('finished' => true, 'me' => $meOut($me)));
      }
    }

    if ($act === 'next' && $method === 'POST') {
      if ($g['status'] === 'lobby') out(array('waiting' => true));
      if ($g['status'] === 'ended') out(array('ended' => true, 'me' => $meOut($me)));
      $order = json_decode($me['qorder'], true);
      $idx = (int)$me['cur'];
      if (!(int)$me['cur_open']) {
        $idx = $idx + 1;
        if ($idx >= count($order)) {
          if ($me['finished_at'] === null) q('UPDATE game_players SET finished_at = NOW() WHERE id = ?', array($me['id']));
          $me = one('SELECT * FROM game_players WHERE id = ?', array($me['id']));
          out(array('finished' => true, 'me' => $meOut($me)));
        }
        q('UPDATE game_players SET cur = ?, cur_started = ?, cur_open = 1 WHERE id = ?', array($idx, now_ms(), $me['id']));
        $me['cur_started'] = now_ms();
      }
      $q = $qsAll[$order[$idx]];
      $elapsed = now_ms() - (int)$me['cur_started'];
      out(array('question' => public_q(json_decode(json_encode($q)), $me['token'], !empty($set['shuffleOpt'])),
        'index' => $idx + 1, 'total' => count($order), 'time' => $set['time'], 'remainingMs' => max(0, $set['time'] * 1000 - $elapsed), 'me' => $meOut($me)));
    }

    if ($act === 'answer' && $method === 'POST') {
      if ($g['status'] !== 'running') bad(409, $g['status'] === 'ended' ? 'Kuis sudah diakhiri guru.' : 'Kuis belum dimulai.');
      if (!(int)$me['cur_open']) bad(409, 'Soal ini sudah dijawab.');
      $order = json_decode($me['qorder'], true);
      $q = $qsAll[$order[(int)$me['cur']]];
      if ((string)prop($body, 'qid', '') !== $q['id']) bad(409, 'Soal tidak sesuai, muat ulang halaman.');
      $limit = $set['time'] * 1000;
      $elapsed = now_ms() - (int)$me['cur_started'];
      $ans = str_cut((string)prop($body, 'answer', ''), 5000);
      $late = $elapsed > $limit + 1500;
      $qo = json_decode(json_encode($q));
      if (ungraded_type($q['type'])) {
        $answers = $me['answers'] ? json_decode($me['answers'], true) : array(); if (!is_array($answers)) $answers = array();
        $answers[$q['id']] = array('a' => $late ? '' : $ans, 'ok' => null, 'pts' => 0, 'ms' => min($elapsed, $limit + 1500), 'info' => true);
        q('UPDATE game_players SET cur_open = 0, answers = ? WHERE id = ? AND cur_open = 1', array(jenc((object)$answers), $me['id']));
        $me = one('SELECT * FROM game_players WHERE id = ?', array($me['id']));
        out(array('info' => true, 'correct' => null, 'points' => 0, 'me' => $meOut($me), 'players' => $count()));
      }
      $frac = $late ? 0 : game_check($qo, $ans);
      $ok = $frac >= 1;
      $streak = $ok ? (int)$me['streak'] + 1 : 0;
      $pts = $ok ? game_points(true, min($elapsed, $limit), $limit, $streak, $set['speedBonus']) : (int)round(500 * $frac);
      $answers = $me['answers'] ? json_decode($me['answers'], true) : array();
      if (!is_array($answers)) $answers = array();
      $answers[$q['id']] = array('a' => $ans, 'ok' => $ok, 'f' => round($frac, 4), 'pts' => $pts, 'ms' => min($elapsed, $limit + 1500));
      q('UPDATE game_players SET cur_open = 0, score = score + ?, correct = correct + ?, answered = answered + 1, streak = ?, best_streak = GREATEST(best_streak, ?), answers = ? WHERE id = ? AND cur_open = 1',
        array($pts, $ok ? 1 : 0, $streak, $streak, jenc((object)$answers), $me['id']));
      $me = one('SELECT * FROM game_players WHERE id = ?', array($me['id']));
      $key = $set['showAnswer'] ? key_text($qo) : null;
      out(array('correct' => $ok, 'partial' => (!$ok && $frac > 0) ? round($frac, 2) : 0, 'late' => $late, 'points' => $pts, 'streak' => $streak, 'correctLabel' => ($set['showAnswer'] && $q['type'] === 'pg') ? $q['answer'] : null, 'correctText' => $key, 'me' => $meOut($me), 'players' => $count()));
    }
  }

  /* ---------- ujian online murid ---------- */
  if ($seg && $seg[0] === 'exam' && isset($seg[1])) {
    $code = preg_replace('/[^A-Z0-9]/', '', strtoupper(urldecode($seg[1])));
    $ex = null; $closedBySub = false;
    if ($code !== '') {
      foreach (rows('SELECT tenant_id, data FROM docs WHERE kind = ? AND exam_code = ?', array('assessments', $code)) as $r) {
        $a = json_decode($r['data']);
        if (!$a || !prop($a, 'examOpen') || !prop($a, 'qsetId')) continue;
        $tid = (int)$r['tenant_id'];
        $ti = tenant_info($tid);
        if (!$ti || !$ti['active']) { $closedBySub = true; continue; }
        $load = function ($kind, $id) use ($tid) { $x = one('SELECT data FROM docs WHERE tenant_id = ? AND kind = ? AND id = ?', array($tid, $kind, (string)$id)); return $x ? json_decode($x['data']) : null; };
        $qset = $load('questionSets', $a->qsetId); $cls = $load('classes', prop($a, 'classId'));
        if ($qset && $cls) { $ex = array('tid' => $tid, 'a' => $a, 'qset' => $qset, 'cls' => $cls, 'subj' => $load('subjects', prop($a, 'subjectId')), 'settings' => $load('settings', 'main')); break; }
      }
    }
    if (!$ex) bad(404, $closedBySub ? 'Ujian tidak tersedia: langganan sekolah sedang tidak aktif. Hubungi guru.' : 'Token ujian tidak ditemukan atau ujian sudah ditutup.');
    $tid = $ex['tid'];
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
      foreach (rows('SELECT student_id FROM submissions WHERE tenant_id = ? AND assessment_id = ?', array($tid, $a->id)) as $r) $done[$r['student_id']] = true;
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
      $k = lock_key('exam:' . $tid . ':' . $sid);
      if (is_locked($k)) bad(429, 'Terlalu banyak percobaan. Tunggu 10 menit.');
      $chk = $find_student($sid, prop($body, 'nis', ''));
      if (isset($chk['err'])) { add_fail($k); bad(401, $chk['err']); }
      $sub = one('SELECT data FROM submissions WHERE tenant_id = ? AND assessment_id = ? AND student_id = ?', array($tid, $a->id, $sid));
      if ($sub) {
        $d = json_decode($sub['data'], true);
        out(array('submitted' => true, 'result' => prop($a, 'hideScore') ? null : array('score' => isset($d['result']['score']) ? $d['result']['score'] : null, 'needsReview' => !empty($d['result']['needsReview']))));
      }
      $qs = array();
      foreach ($questions as $qq) if (in_array(prop($qq, 'type'), q_types(), true)) $qs[] = public_q($qq, $a->id . $sid, false);
      if (prop($a, 'shuffle')) { mt_srand(crc32($a->id . $sid)); shuffle($qs); mt_srand(); }
      out(array('submitted' => false, 'student' => array('id' => $chk['st']->id, 'name' => prop($chk['st'], 'name', '')), 'questions' => $qs, 'duration' => (int)prop($a, 'duration', 0), 'serverTime' => round(microtime(true) * 1000)));
    }

    if ($action === 'media' && $method === 'POST') {
      $sid = (string)prop($body, 'studentId', '');
      $chk = $find_student($sid, prop($body, 'nis', ''));
      if (isset($chk['err'])) bad(401, $chk['err']);
      if (one('SELECT 1 AS x FROM submissions WHERE tenant_id = ? AND assessment_id = ? AND student_id = ?', array($tid, $a->id, $sid))) bad(409, 'Jawaban sudah dikumpulkan.');
      $ref = store_media($tid, prop($body, 'data', ''));
      out(array('id' => substr($ref, 6)));
    }

    if ($action === 'submit' && $method === 'POST') {
      $sid = (string)prop($body, 'studentId', '');
      $chk = $find_student($sid, prop($body, 'nis', ''));
      if (isset($chk['err'])) bad(401, $chk['err']);
      $ids = array(); foreach ($questions as $qq) $ids[$qq->id] = true;
      $clean = array(); $given = prop($body, 'answers');
      if (is_object($given)) foreach (get_object_vars($given) as $k => $v) if (isset($ids[$k])) $clean[$k] = clean_answer($tid, $v);
      $result = grade($questions, $clean);
      $kktp = $ex['settings'] && prop($ex['settings'], 'kktp') ? (float)$ex['settings']->kktp : 75;
      $cap = ($ex['settings'] && prop($ex['settings'], 'remedialCap') === false) ? 100 : $kktp;
      $pdo = db(); $pdo->beginTransaction();
      try {
        if (one('SELECT 1 AS x FROM submissions WHERE tenant_id = ? AND assessment_id = ? AND student_id = ? FOR UPDATE', array($tid, $a->id, $sid))) { $pdo->rollBack(); bad(409, 'Jawaban kamu sudah pernah dikumpulkan.'); }
        $started = (float)prop($body, 'startedAt', 0);
        $sub = array('answers' => $clean ? $clean : new stdClass(), 'manual' => new stdClass(), 'result' => $result, 'at' => round(microtime(true) * 1000),
          'duration' => $started ? max(0, (int)round((microtime(true) * 1000 - $started) / 1000)) : null, 'online' => true);
        q('INSERT INTO submissions (tenant_id, assessment_id, student_id, data) VALUES (?,?,?,?)', array($tid, $a->id, $sid, jenc($sub)));
        $prev = one('SELECT value FROM scores WHERE tenant_id = ? AND assessment_id = ? AND student_id = ? FOR UPDATE', array($tid, $a->id, $sid));
        $val = $result['score'];
        $pv = $prev ? json_decode($prev['value']) : null;
        if (is_object($pv)) {
          $pv->score = $result['score'];
          if (is_numeric(prop($pv, 'remedial')) && $result['score'] < $kktp) $pv->final = max($result['score'], min((float)$pv->remedial, $cap));
          else { unset($pv->remedial); unset($pv->final); }
          $val = $pv;
        }
        q('INSERT INTO scores (tenant_id, assessment_id, student_id, value) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE value = VALUES(value)', array($tid, $a->id, $sid, jenc($val)));
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
