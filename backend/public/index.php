<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/bootstrap.php';

use LinkLearn\Http;
use LinkLearn\Auth;
use LinkLearn\Db;

Http::cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// Static uploads are served by web server. For PHP built-in server, we map /uploads here.
if (str_starts_with($path, '/uploads/')) {
  $file = realpath(__DIR__ . '/../uploads' . substr($path, strlen('/uploads')));
  $uploadsRoot = realpath(__DIR__ . '/../uploads');
  if (!$file || !$uploadsRoot || !str_starts_with($file, $uploadsRoot) || !is_file($file)) {
    Http::json(['error' => 'Not found'], 404);
  }
  Http::sendFile($file);
}

// Health
if ($path === '/api/health') {
  Http::json(['ok' => true]);
}

// --- AUTH ---
if ($path === '/api/auth/signup' && $method === 'POST') {
  $body = Http::jsonBody();
  $email = trim((string)($body['email'] ?? ''));
  $password = (string)($body['password'] ?? '');
  $role = (string)($body['role'] ?? 'student');
  $name = (string)($body['name'] ?? '');
  Auth::signup($email, $password, $role, $name);
  Http::json(['ok' => true, 'user' => Auth::me()]);
}

if ($path === '/api/auth/login' && $method === 'POST') {
  $body = Http::jsonBody();
  $email = trim((string)($body['email'] ?? ''));
  $password = (string)($body['password'] ?? '');
  Auth::login($email, $password);
  Http::json(['ok' => true, 'user' => Auth::me()]);
}

if ($path === '/api/auth/logout' && $method === 'POST') {
  Auth::logout();
  Http::json(['ok' => true]);
}

if ($path === '/api/auth/me' && $method === 'GET') {
  $me = Auth::me();
  Http::json(['user' => $me]);
}

// --- USERS ---
if ($path === '/api/users/me' && $method === 'GET') {
  $me = Auth::requireUser();
  Http::json(['user' => $me]);
}

if ($path === '/api/users/me' && $method === 'PATCH') {
  $me = Auth::requireUser();
  $body = Http::jsonBody();
  $updated = Auth::updateMe($me['id'], $body);
  Http::json(['user' => $updated]);
}

if ($path === '/api/users/me/catalogue' && $method === 'PATCH') {
  $me = Auth::requireUser();
  $body = Http::jsonBody();
  $catalogue = $body['catalogue'] ?? null;
  if (!is_array($catalogue)) Http::json(['error' => 'catalogue must be array'], 400);
  $updated = Auth::updateMe($me['id'], ['catalogue' => $catalogue]);
  Http::json(['user' => $updated]);
}

if ($path === '/api/users/search' && $method === 'GET') {
  Auth::requireUser();
  $q = trim((string)($_GET['q'] ?? ''));
  if (strlen($q) < 2) Http::json(['users' => []]);
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("SELECT id, name, email, role, avatar_url AS avatar FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY name ASC LIMIT 50");
  $like = '%' . $q . '%';
  $stmt->execute([$like, $like]);
  Http::json(['users' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

// --- UPLOADS ---
if ($path === '/api/uploads/avatar' && $method === 'POST') {
  $me = Auth::requireUser();
  $url = Http::handleUpload('file', 'avatars/' . $me['id']);
  $updated = Auth::updateMe($me['id'], ['avatar_url' => $url]);
  Http::json(['url' => $url, 'user' => $updated]);
}

if ($path === '/api/uploads/certificate' && $method === 'POST') {
  $me = Auth::requireUser();
  $degree = trim((string)($_POST['degree'] ?? ''));
  if ($degree === '') Http::json(['error' => 'degree required'], 400);
  $url = Http::handleUpload('file', 'certificates/' . $me['id']);
  $updated = Auth::appendCertificate($me['id'], [
    'degree' => $degree,
    'fileUrl' => $url,
    'fileName' => Http::uploadedOriginalName('file'),
    'status' => 'pending',
    'uploadedAt' => gmdate('c'),
  ]);
  Http::json(['url' => $url, 'user' => $updated]);
}

// --- POSTS ---
if ($path === '/api/posts' && $method === 'GET') {
  $me = Auth::requireUser();
  $limit = (int)($_GET['limit'] ?? 50);
  $limit = max(1, min(100, $limit));
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("SELECT p.* FROM posts p ORDER BY p.created_at DESC LIMIT ?");
  $stmt->bindValue(1, $limit, PDO::PARAM_INT);
  $stmt->execute();
  $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // Attach likes + comments counts + list (to match existing UI shape)
  $postIds = array_map(fn($p) => (int)$p['id'], $posts);
  $likesByPost = [];
  $commentsByPost = [];
  if (count($postIds) > 0) {
    $in = implode(',', array_fill(0, count($postIds), '?'));
    $ls = $pdo->prepare("SELECT post_id, user_id FROM post_likes WHERE post_id IN ($in)");
    $ls->execute($postIds);
    foreach ($ls->fetchAll(PDO::FETCH_ASSOC) as $row) {
      $likesByPost[(int)$row['post_id']][] = (string)$row['user_id'];
    }
    $cs = $pdo->prepare("SELECT post_id, user_id, author_name, text, created_at FROM post_comments WHERE post_id IN ($in) ORDER BY created_at ASC");
    $cs->execute($postIds);
    foreach ($cs->fetchAll(PDO::FETCH_ASSOC) as $row) {
      $commentsByPost[(int)$row['post_id']][] = [
        'uid' => (string)$row['user_id'],
        'authorName' => $row['author_name'],
        'text' => $row['text'],
        'createdAt' => gmdate('c', strtotime($row['created_at'])),
      ];
    }
  }

  $out = array_map(function($p) use ($likesByPost, $commentsByPost) {
    $pid = (int)$p['id'];
    return [
      'id' => (string)$p['id'],
      'uid' => (string)$p['user_id'],
      'authorName' => $p['author_name'],
      'authorRole' => $p['author_role'],
      'authorAvatar' => $p['author_avatar'] ?? '',
      'content' => $p['content'],
      'imageUrl' => $p['image_url'] ?? '',
      'likes' => $likesByPost[$pid] ?? [],
      'comments' => $commentsByPost[$pid] ?? [],
      'createdAt' => gmdate('c', strtotime($p['created_at'])),
    ];
  }, $posts);
  Http::json(['posts' => $out]);
}

if ($path === '/api/posts' && $method === 'POST') {
  $me = Auth::requireUser();
  $content = trim((string)($_POST['content'] ?? ''));
  if ($content === '') Http::json(['error' => 'content required'], 400);
  $imageUrl = '';
  if (isset($_FILES['image']) && is_uploaded_file($_FILES['image']['tmp_name'])) {
    $imageUrl = Http::handleUpload('image', 'posts/' . $me['id']);
  }
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("INSERT INTO posts (user_id, author_name, author_role, author_avatar, content, image_url) VALUES (?,?,?,?,?,?)");
  $stmt->execute([(int)$me['id'], $me['name'], $me['role'], $me['avatar'] ?? '', $content, $imageUrl]);
  Http::json(['ok' => true, 'id' => (string)$pdo->lastInsertId()]);
}

if (preg_match('#^/api/posts/(\\d+)/like$#', $path, $m) && $method === 'POST') {
  $me = Auth::requireUser();
  $postId = (int)$m[1];
  $pdo = Db::pdo();
  // Toggle
  $check = $pdo->prepare("SELECT 1 FROM post_likes WHERE post_id=? AND user_id=?");
  $check->execute([$postId, (int)$me['id']]);
  if ($check->fetchColumn()) {
    $pdo->prepare("DELETE FROM post_likes WHERE post_id=? AND user_id=?")->execute([$postId, (int)$me['id']]);
  } else {
    $pdo->prepare("INSERT IGNORE INTO post_likes (post_id, user_id) VALUES (?,?)")->execute([$postId, (int)$me['id']]);
  }
  Http::json(['ok' => true]);
}

if (preg_match('#^/api/posts/(\\d+)/comments$#', $path, $m) && $method === 'POST') {
  $me = Auth::requireUser();
  $postId = (int)$m[1];
  $body = Http::jsonBody();
  $text = trim((string)($body['text'] ?? ''));
  if ($text === '') Http::json(['error' => 'text required'], 400);
  $pdo = Db::pdo();
  $pdo->prepare("INSERT INTO post_comments (post_id, user_id, author_name, text) VALUES (?,?,?,?)")
    ->execute([$postId, (int)$me['id'], $me['name'], $text]);
  Http::json(['ok' => true]);
}

if (preg_match('#^/api/posts/(\\d+)$#', $path, $m) && $method === 'DELETE') {
  $me = Auth::requireUser();
  $postId = (int)$m[1];
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("DELETE FROM posts WHERE id=? AND user_id=?");
  $stmt->execute([$postId, (int)$me['id']]);
  Http::json(['ok' => true]);
}

// --- ARTICLES ---
if ($path === '/api/articles' && $method === 'GET') {
  Auth::requireUser();
  $status = (string)($_GET['status'] ?? 'published');
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("SELECT * FROM articles WHERE status=? ORDER BY created_at DESC LIMIT 200");
  $stmt->execute([$status]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  Http::json(['articles' => array_map('LinkLearn\\Transform::article', $rows)]);
}

if ($path === '/api/articles' && $method === 'POST') {
  $me = Auth::requireUser();
  $body = Http::jsonBody();
  $title = trim((string)($body['title'] ?? ''));
  $content = (string)($body['content'] ?? '');
  $category = (string)($body['category'] ?? '');
  $tags = $body['tags'] ?? [];
  if ($title === '' || trim($content) === '') Http::json(['error' => 'title/content required'], 400);
  if (!is_array($tags)) $tags = [];
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("INSERT INTO articles (user_id, author_name, author_role, title, content, category, tags_json, status) VALUES (?,?,?,?,?,?,?, 'pending')");
  $stmt->execute([(int)$me['id'], $me['name'], $me['role'], $title, $content, $category, json_encode($tags)]);
  Http::json(['ok' => true, 'id' => (string)$pdo->lastInsertId()]);
}

if ($path === '/api/articles/mine' && $method === 'GET') {
  $me = Auth::requireUser();
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("SELECT * FROM articles WHERE user_id=? ORDER BY created_at DESC LIMIT 200");
  $stmt->execute([(int)$me['id']]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  Http::json(['articles' => array_map('LinkLearn\\Transform::article', $rows)]);
}

if (preg_match('#^/api/articles/(\\d+)$#', $path, $m) && $method === 'DELETE') {
  $me = Auth::requireUser();
  $id = (int)$m[1];
  $pdo = Db::pdo();
  $pdo->prepare("DELETE FROM articles WHERE id=? AND user_id=?")->execute([$id, (int)$me['id']]);
  Http::json(['ok' => true]);
}

if (preg_match('#^/api/admin/articles/(\\d+)/status$#', $path, $m) && $method === 'PATCH') {
  $me = Auth::requireRole(['admin']);
  $id = (int)$m[1];
  $body = Http::jsonBody();
  $status = (string)($body['status'] ?? '');
  $reason = (string)($body['reason'] ?? '');
  if (!in_array($status, ['pending','published','flagged','rejected'], true)) Http::json(['error' => 'invalid status'], 400);
  $pdo = Db::pdo();
  $pdo->prepare("UPDATE articles SET status=?, admin_note=? WHERE id=?")->execute([$status, $reason, $id]);
  Http::json(['ok' => true]);
}

// --- EVENTS ---
if ($path === '/api/events' && $method === 'GET') {
  Auth::requireUser();
  $pdo = Db::pdo();
  $stmt = $pdo->query("SELECT * FROM events ORDER BY created_at DESC LIMIT 200");
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  Http::json(['events' => array_map('LinkLearn\\Transform::event', $rows)]);
}

if ($path === '/api/events' && $method === 'POST') {
  $me = Auth::requireUser();
  $body = Http::jsonBody();
  $title = trim((string)($body['title'] ?? ''));
  if ($title === '') Http::json(['error' => 'title required'], 400);
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("INSERT INTO events (user_id, organizer_name, title, description, category, location, date_time, capacity, status) VALUES (?,?,?,?,?,?,?,?, 'upcoming')");
  $dt = $body['dateTime'] ?? null;
  $dateTime = $dt ? date('Y-m-d H:i:s', strtotime((string)$dt)) : null;
  $stmt->execute([
    (int)$me['id'],
    $me['name'],
    $title,
    (string)($body['description'] ?? ''),
    (string)($body['category'] ?? ''),
    (string)($body['location'] ?? ''),
    $dateTime,
    (int)($body['capacity'] ?? 0),
  ]);
  Http::json(['ok' => true, 'id' => (string)$pdo->lastInsertId()]);
}

if (preg_match('#^/api/events/(\\d+)/register$#', $path, $m) && $method === 'POST') {
  $me = Auth::requireUser();
  $eventId = (int)$m[1];
  $pdo = Db::pdo();
  $event = $pdo->prepare("SELECT * FROM events WHERE id=?");
  $event->execute([$eventId]);
  $row = $event->fetch(PDO::FETCH_ASSOC);
  if (!$row) Http::json(['error' => 'Event not found'], 404);
  if ((int)$row['registered_count'] >= (int)$row['capacity']) Http::json(['error' => 'Event is full'], 400);
  $existing = $pdo->prepare("SELECT 1 FROM event_attendees WHERE event_id=? AND user_id=?");
  $existing->execute([$eventId, (int)$me['id']]);
  if ($existing->fetchColumn()) Http::json(['error' => 'Already registered'], 400);
  $ticketId = 'TKT-' . strtoupper(substr((string)$eventId, 0, 6)) . '-' . strtoupper(substr((string)$me['id'], 0, 4));
  $pdo->beginTransaction();
  $pdo->prepare("INSERT INTO event_attendees (event_id, user_id, name, email, ticket_id) VALUES (?,?,?,?,?)")
    ->execute([$eventId, (int)$me['id'], $me['name'], $me['email'], $ticketId]);
  $pdo->prepare("UPDATE events SET registered_count = registered_count + 1 WHERE id=?")->execute([$eventId]);
  $pdo->commit();
  Http::json(['ok' => true, 'ticketId' => $ticketId]);
}

if ($path === '/api/events/mine' && $method === 'GET') {
  $me = Auth::requireUser();
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("SELECT * FROM events WHERE user_id=? ORDER BY created_at DESC LIMIT 200");
  $stmt->execute([(int)$me['id']]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  Http::json(['events' => array_map('LinkLearn\\Transform::event', $rows)]);
}

if ($path === '/api/events/registrations/mine' && $method === 'GET') {
  $me = Auth::requireUser();
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("SELECT e.* FROM events e JOIN event_attendees a ON a.event_id=e.id WHERE a.user_id=? ORDER BY e.created_at DESC LIMIT 200");
  $stmt->execute([(int)$me['id']]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  Http::json(['events' => array_map('LinkLearn\\Transform::event', $rows)]);
}

if (preg_match('#^/api/events/(\\d+)/attendance/(\\d+)$#', $path, $m) && $method === 'PATCH') {
  Auth::requireRole(['admin']);
  $eventId = (int)$m[1];
  $uid = (int)$m[2];
  $pdo = Db::pdo();
  $pdo->prepare("UPDATE event_attendees SET attended=1 WHERE event_id=? AND user_id=?")->execute([$eventId, $uid]);
  Http::json(['ok' => true]);
}

// --- VACANCIES ---
if ($path === '/api/vacancies' && $method === 'GET') {
  Auth::requireUser();
  $status = (string)($_GET['status'] ?? 'open');
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("SELECT * FROM vacancies WHERE status=? ORDER BY created_at DESC LIMIT 200");
  $stmt->execute([$status]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  // attach applicants
  $vacIds = array_map(fn($v) => (int)$v['id'], $rows);
  $appsBy = [];
  if (count($vacIds) > 0) {
    $in = implode(',', array_fill(0, count($vacIds), '?'));
    $st = $pdo->prepare("SELECT * FROM vacancy_applicants WHERE vacancy_id IN ($in) ORDER BY applied_at DESC");
    $st->execute($vacIds);
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $a) {
      $appsBy[(int)$a['vacancy_id']][] = [
        'uid' => (string)$a['user_id'],
        'name' => $a['name'],
        'email' => $a['email'],
        'role' => $a['role'],
        'status' => $a['status'],
        'appliedAt' => gmdate('c', strtotime($a['applied_at'])),
      ];
    }
  }
  $out = array_map(function($v) use ($appsBy) {
    return [
      'id' => (string)$v['id'],
      'uid' => (string)$v['user_id'],
      'institutionName' => $v['institution_name'],
      'role' => $v['role'],
      'roleType' => $v['role_type'],
      'department' => $v['department'],
      'eligibility' => $v['eligibility'],
      'description' => $v['description'],
      'deadline' => $v['deadline'],
      'status' => $v['status'],
      'applicants' => $appsBy[(int)$v['id']] ?? [],
      'createdAt' => gmdate('c', strtotime($v['created_at'])),
    ];
  }, $rows);
  Http::json(['vacancies' => $out]);
}

if ($path === '/api/vacancies' && $method === 'POST') {
  $me = Auth::requireUser();
  $body = Http::jsonBody();
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("INSERT INTO vacancies (user_id, institution_name, role, role_type, department, eligibility, description, deadline, status) VALUES (?,?,?,?,?,?,?,?,'open')");
  $stmt->execute([
    (int)$me['id'],
    $me['name'],
    (string)($body['role'] ?? ''),
    (string)($body['roleType'] ?? ''),
    (string)($body['department'] ?? ''),
    (string)($body['eligibility'] ?? ''),
    (string)($body['description'] ?? ''),
    (string)($body['deadline'] ?? ''),
  ]);
  Http::json(['ok' => true, 'id' => (string)$pdo->lastInsertId()]);
}

if ($path === '/api/vacancies/mine' && $method === 'GET') {
  $me = Auth::requireUser();
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("SELECT * FROM vacancies WHERE user_id=? ORDER BY created_at DESC LIMIT 200");
  $stmt->execute([(int)$me['id']]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  Http::json(['vacancies' => array_map('LinkLearn\\Transform::vacancy', $rows)]);
}

if (preg_match('#^/api/vacancies/(\\d+)/apply$#', $path, $m) && $method === 'POST') {
  $me = Auth::requireUser();
  $vacId = (int)$m[1];
  $pdo = Db::pdo();
  $pdo->prepare("INSERT INTO vacancy_applicants (vacancy_id, user_id, name, email, role, status) VALUES (?,?,?,?,?, 'applied')
    ON DUPLICATE KEY UPDATE status='applied'")
    ->execute([$vacId, (int)$me['id'], $me['name'], $me['email'], $me['role']]);
  Http::json(['ok' => true]);
}

if (preg_match('#^/api/vacancies/(\\d+)/applicants/(\\d+)/status$#', $path, $m) && $method === 'PATCH') {
  $me = Auth::requireUser();
  $vacId = (int)$m[1];
  $appUid = (int)$m[2];
  $body = Http::jsonBody();
  $newStatus = (string)($body['status'] ?? '');
  if ($newStatus === '') Http::json(['error' => 'status required'], 400);
  $pdo = Db::pdo();
  // owner check
  $own = $pdo->prepare("SELECT 1 FROM vacancies WHERE id=? AND user_id=?");
  $own->execute([$vacId, (int)$me['id']]);
  if (!$own->fetchColumn() && $me['role'] !== 'admin') Http::json(['error' => 'forbidden'], 403);
  $pdo->prepare("UPDATE vacancy_applicants SET status=? WHERE vacancy_id=? AND user_id=?")
    ->execute([$newStatus, $vacId, $appUid]);
  Http::json(['ok' => true]);
}

// --- REQUIREMENTS ---
if ($path === '/api/requirements' && $method === 'GET') {
  Auth::requireUser();
  $status = (string)($_GET['status'] ?? 'open');
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("SELECT * FROM requirements WHERE status=? ORDER BY created_at DESC LIMIT 200");
  $stmt->execute([$status]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  // attach quotes
  $ids = array_map(fn($r) => (int)$r['id'], $rows);
  $quotesBy = [];
  if (count($ids) > 0) {
    $in = implode(',', array_fill(0, count($ids), '?'));
    $st = $pdo->prepare("SELECT * FROM requirement_quotes WHERE requirement_id IN ($in) ORDER BY submitted_at DESC");
    $st->execute($ids);
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $q) {
      $quotesBy[(int)$q['requirement_id']][] = [
        'vendorUid' => (string)$q['vendor_user_id'],
        'vendorName' => $q['vendor_name'],
        'price' => $q['price'],
        'timeline' => $q['timeline'],
        'terms' => $q['terms'],
        'submittedAt' => gmdate('c', strtotime($q['submitted_at'])),
        'status' => $q['status'],
      ];
    }
  }
  $out = array_map(function($r) use ($quotesBy) {
    return [
      'id' => (string)$r['id'],
      'uid' => (string)$r['user_id'],
      'institutionName' => $r['institution_name'],
      'itemType' => $r['item_type'],
      'description' => $r['description'],
      'quantity' => $r['quantity'],
      'budgetMin' => $r['budget_min'],
      'budgetMax' => $r['budget_max'],
      'deadline' => $r['deadline'],
      'location' => $r['location'],
      'status' => $r['status'],
      'quotes' => $quotesBy[(int)$r['id']] ?? [],
      'createdAt' => gmdate('c', strtotime($r['created_at'])),
    ];
  }, $rows);
  Http::json(['requirements' => $out]);
}

if ($path === '/api/requirements' && $method === 'POST') {
  $me = Auth::requireUser();
  $body = Http::jsonBody();
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("INSERT INTO requirements (user_id, institution_name, item_type, description, quantity, budget_min, budget_max, deadline, location, status) VALUES (?,?,?,?,?,?,?,?,?, 'open')");
  $stmt->execute([
    (int)$me['id'],
    $me['name'],
    (string)($body['itemType'] ?? ''),
    (string)($body['description'] ?? ''),
    (string)($body['quantity'] ?? ''),
    (string)($body['budgetMin'] ?? ''),
    (string)($body['budgetMax'] ?? ''),
    (string)($body['deadline'] ?? ''),
    (string)($body['location'] ?? ''),
  ]);
  Http::json(['ok' => true, 'id' => (string)$pdo->lastInsertId()]);
}

if ($path === '/api/requirements/mine' && $method === 'GET') {
  $me = Auth::requireUser();
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("SELECT * FROM requirements WHERE user_id=? ORDER BY created_at DESC LIMIT 200");
  $stmt->execute([(int)$me['id']]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  Http::json(['requirements' => array_map('LinkLearn\\Transform::requirement', $rows)]);
}

if (preg_match('#^/api/requirements/(\\d+)/quotes$#', $path, $m) && $method === 'POST') {
  $me = Auth::requireUser();
  $reqId = (int)$m[1];
  $body = Http::jsonBody();
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("INSERT INTO requirement_quotes (requirement_id, vendor_user_id, vendor_name, price, timeline, terms, status) VALUES (?,?,?,?,?,?, 'pending')
    ON DUPLICATE KEY UPDATE price=VALUES(price), timeline=VALUES(timeline), terms=VALUES(terms), status='pending'");
  $stmt->execute([$reqId, (int)$me['id'], $me['name'], (string)($body['price'] ?? ''), (string)($body['timeline'] ?? ''), (string)($body['terms'] ?? '')]);
  Http::json(['ok' => true]);
}

if (preg_match('#^/api/requirements/(\\d+)/award$#', $path, $m) && $method === 'POST') {
  $me = Auth::requireUser();
  $reqId = (int)$m[1];
  $body = Http::jsonBody();
  $vendorUid = (int)($body['vendorUid'] ?? 0);
  if ($vendorUid <= 0) Http::json(['error' => 'vendorUid required'], 400);
  $pdo = Db::pdo();
  // owner check
  $own = $pdo->prepare("SELECT 1 FROM requirements WHERE id=? AND user_id=?");
  $own->execute([$reqId, (int)$me['id']]);
  if (!$own->fetchColumn() && $me['role'] !== 'admin') Http::json(['error' => 'forbidden'], 403);
  $pdo->beginTransaction();
  $pdo->prepare("UPDATE requirement_quotes SET status = CASE WHEN vendor_user_id=? THEN 'awarded' ELSE 'rejected' END WHERE requirement_id=?")
    ->execute([$vendorUid, $reqId]);
  $pdo->prepare("UPDATE requirements SET status='awarded' WHERE id=?")->execute([$reqId]);
  $pdo->commit();
  Http::json(['ok' => true]);
}

// --- MESSAGING ---
if ($path === '/api/conversations' && $method === 'GET') {
  $me = Auth::requireUser();
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("SELECT * FROM conversations WHERE user1_id=? OR user2_id=? ORDER BY COALESCE(last_message_at, created_at) DESC LIMIT 200");
  $stmt->execute([(int)$me['id'], (int)$me['id']]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $out = array_map(function($c) {
    return [
      'id' => (string)$c['id'],
      'participants' => [(string)$c['user1_id'], (string)$c['user2_id']],
      'lastMessage' => $c['last_message'] ?? '',
      'lastMessageAt' => $c['last_message_at'] ? gmdate('c', strtotime($c['last_message_at'])) : null,
      'createdAt' => gmdate('c', strtotime($c['created_at'])),
    ];
  }, $rows);
  Http::json(['conversations' => $out]);
}

if (preg_match('#^/api/conversations/(\\d+)/messages$#', $path, $m) && $method === 'GET') {
  $me = Auth::requireUser();
  $otherId = (int)$m[1];
  $pdo = Db::pdo();
  $convId = Auth::ensureConversation((int)$me['id'], $otherId);
  $stmt = $pdo->prepare("SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC LIMIT 500");
  $stmt->execute([$convId]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $out = array_map(function($msg) {
    return [
      'id' => (string)$msg['id'],
      'senderId' => (string)$msg['sender_id'],
      'text' => $msg['text'],
      'createdAt' => gmdate('c', strtotime($msg['created_at'])),
      'read' => (bool)$msg['is_read'],
    ];
  }, $rows);
  Http::json(['messages' => $out, 'conversationId' => (string)$convId]);
}

if (preg_match('#^/api/conversations/(\\d+)/messages$#', $path, $m) && $method === 'POST') {
  $me = Auth::requireUser();
  $otherId = (int)$m[1];
  $body = Http::jsonBody();
  $text = trim((string)($body['text'] ?? ''));
  if ($text === '') Http::json(['error' => 'text required'], 400);
  $pdo = Db::pdo();
  $convId = Auth::ensureConversation((int)$me['id'], $otherId);
  $pdo->prepare("INSERT INTO messages (conversation_id, sender_id, text) VALUES (?,?,?)")
    ->execute([$convId, (int)$me['id'], $text]);
  $pdo->prepare("UPDATE conversations SET last_message=?, last_message_at=NOW() WHERE id=?")->execute([$text, $convId]);
  Http::json(['ok' => true]);
}

// --- ADMIN USERS ---
if ($path === '/api/admin/users' && $method === 'GET') {
  Auth::requireRole(['admin']);
  $pdo = Db::pdo();
  $stmt = $pdo->query("SELECT id, email, name, role, login_type AS loginType, account_status AS accountStatus, profile_completed AS profileCompleted, avatar_url AS avatar, verified_badge AS verifiedBadge, certificates_json AS certificatesJson, created_at AS createdAt, updated_at AS updatedAt FROM users ORDER BY created_at DESC LIMIT 500");
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $out = array_map('LinkLearn\\Transform::adminUser', $rows);
  Http::json(['users' => $out]);
}

if (preg_match('#^/api/admin/users/(\\d+)/account-status$#', $path, $m) && $method === 'PATCH') {
  Auth::requireRole(['admin']);
  $uid = (int)$m[1];
  $body = Http::jsonBody();
  $status = (string)($body['status'] ?? '');
  if (!in_array($status, ['active','pending','rejected','suspended'], true)) Http::json(['error' => 'invalid status'], 400);
  $pdo = Db::pdo();
  $pdo->prepare("UPDATE users SET account_status=? WHERE id=?")->execute([$status, $uid]);
  Http::json(['ok' => true]);
}

if (preg_match('#^/api/admin/users/(\\d+)/certificates/(\\d+)$#', $path, $m) && $method === 'PATCH') {
  Auth::requireRole(['admin']);
  $uid = (int)$m[1];
  $certIndex = (int)$m[2];
  $body = Http::jsonBody();
  $status = (string)($body['status'] ?? '');
  if (!in_array($status, ['pending','verified','rejected'], true)) Http::json(['error' => 'invalid status'], 400);
  $updated = Auth::updateCertificateStatus($uid, $certIndex, $status);
  Http::json(['ok' => true, 'user' => $updated]);
}

Http::json(['error' => 'Not found'], 404);

