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

define('APP_VERSION', '4.0.0');
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
      if (!has_table(db(), 'users') || !has_table(db(), 'tenants') || !has_table(db(), 'payments') || !has_column(db(), 'users', 'tenant_id')) migrate();
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

  if ($route === 'logout') { auth(); q('DELETE FROM sessions WHERE token = ?', array($GLOBALS['TOKEN'])); out(array('ok' => true)); }
  if ($route === 'me') { $u = auth(); out(array('user' => public_user($u), 'subscription' => tenant_info(tenant_of($u)))); }

  if ($route === 'me/password' && $method === 'PUT') {
    $u = auth();
    if (!password_verify((string)prop($body, 'oldPassword', ''), $u['pass_hash'])) bad(400, 'Password lama salah.');
    $np = prop($body, 'newPassword');
    if (!valid_password($np)) bad(400, 'Password baru minimal 6 karakter.');
    q('UPDATE users SET pass_hash = ? WHERE id = ?', array(password_hash($np, PASSWORD_DEFAULT), $u['id']));
    q('DELETE FROM sessions WHERE user_id = ? AND token <> ?', array($u['id'], $GLOBALS['TOKEN']));
    out(array('ok' => true));
  }

  /* ---------- akun guru dalam sekolah (admin sekolah) ---------- */
  if ($seg && $seg[0] === 'users') {
    $u = auth(); admin_only($u); $tid = tenant_of($u);
    if (count($seg) === 1 && $method === 'GET') {
      $list = rows('SELECT id, username, name, role, created_at FROM users WHERE tenant_id = ? ORDER BY id', array($tid));
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
      q('INSERT INTO users (tenant_id, username, name, pass_hash, role) VALUES (?,?,?,?,?)', array($tid, $un, $nm, password_hash($pw, PASSWORD_DEFAULT), prop($body, 'role') === 'admin' ? 'admin' : 'guru'));
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
    $u = auth(); $uid = (int)$u['id']; $tid = tenant_of($u); $n = 0;
    $theme = prop($body, 'theme');
    $onlyTheme = !prop($body, 'docs') && !prop($body, 'delDocs') && !prop($body, 'scores') && !prop($body, 'delScores') && !prop($body, 'subs') && !prop($body, 'delSubs');
    if (!$onlyTheme) require_active($u);
    $pdo = db(); $pdo->beginTransaction();
    try {
      foreach ((array)prop($body, 'docs', array()) as $d) {
        $kind = prop($d, 'kind'); $id = clean_id(prop($d, 'id')); $data = prop($d, 'data');
        if (!in_array($kind, $DOC_KINDS, true) || !$id || !is_object($data)) continue;
        q('INSERT INTO docs (tenant_id, kind, id, data, exam_code, updated_by) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE data = VALUES(data), exam_code = VALUES(exam_code), updated_by = VALUES(updated_by)',
          array($tid, $kind, $id, jenc($data), $exam_code_of($kind, $data), $uid));
        $n++;
      }
      foreach ((array)prop($body, 'delDocs', array()) as $d) {
        $kind = prop($d, 'kind'); $id = clean_id(prop($d, 'id'));
        if (!in_array($kind, $DOC_KINDS, true) || !$id) continue;
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
    out(array('ok' => true, 'applied' => $n));
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
      out(array('tenants' => $list, 'pending' => $pending, 'revenue' => $revenue, 'revenueMonth' => $month, 'platform' => platform()));
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
      if (is_object($given)) foreach (get_object_vars($given) as $k => $v) if (isset($ids[$k])) $clean[$k] = str_cut(is_scalar($v) ? (string)$v : '', 5000);
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
