<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/bootstrap.php';

use LinkLearn\Http;
use LinkLearn\Auth;
use LinkLearn\Db;
use LinkLearn\Env;
use LinkLearn\PushNotification;

Http::cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

function ll_json_decode_array($value): array {
  if ($value === null) return [];
  if (is_array($value)) return $value;
  $decoded = json_decode((string)$value, true);
  return is_array($decoded) ? $decoded : [];
}

function ll_match_score(array $candidate, string $roleType, string $department, string $description, string $eligibility): int {
  $roleType = strtolower($roleType);
  $haystack = strtolower(trim($department . ' ' . $description . ' ' . $eligibility));
  $score = 0;
  $candidateRole = strtolower((string)($candidate['role'] ?? ''));

  if (in_array($candidateRole, ['student', 'researcher'], true)) {
    $score += 1;
  }
  if ($candidateRole === 'researcher' && in_array($roleType, ['faculty', 'research'], true)) {
    $score += 3;
  }
  if ($candidateRole === 'student' && in_array($roleType, ['phd', 'internship'], true)) {
    $score += 3;
  }

  $keywords = array_filter(array_map(
    static fn($v) => strtolower(trim((string)$v)),
    array_merge(
      ll_json_decode_array($candidate['skills_json'] ?? '[]'),
      array_column(ll_json_decode_array($candidate['education_json'] ?? '[]'), 'degree'),
      array_column(ll_json_decode_array($candidate['publications_json'] ?? '[]'), 'title')
    )
  ));

  foreach ($keywords as $keyword) {
    if ($keyword !== '' && str_contains($haystack, $keyword)) {
      $score += 2;
    }
  }

  $bio = strtolower((string)($candidate['bio'] ?? ''));
  if ($bio !== '') {
    foreach (array_filter(explode(' ', $bio)) as $token) {
      $token = trim($token);
      if (strlen($token) > 4 && str_contains($haystack, $token)) {
        $score += 1;
      }
    }
  }

  return $score;
}

function ll_send_matching_notifications(string $kind, array $actor, array $payload): void {
  $pdo = Db::pdo();

  if ($kind === 'vacancy') {
    $stmt = $pdo->query("SELECT id, role, bio, skills_json, education_json, publications_json FROM users WHERE account_status='active' AND role IN ('student','researcher')");
    $candidates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($candidates as $candidate) {
      $score = ll_match_score($candidate, (string)$payload['roleType'], (string)$payload['department'], (string)$payload['description'], (string)$payload['eligibility']);
      if ($score >= 3) {
        LinkLearn\Notification::send((int)$candidate['id'], (int)$actor['id'], 'recruitment_match', "matched a {$payload['roleType']} opportunity: {$payload['role']}", (int)$payload['id']);
      }
    }
  }

  if ($kind === 'event') {
    $stmt = $pdo->query("SELECT id FROM users WHERE account_status='active'");
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $user) {
      if ((int)$user['id'] === (int)$actor['id']) continue;
      LinkLearn\Notification::send((int)$user['id'], (int)$actor['id'], 'event_alert', "posted a new event: {$payload['title']}", (int)$payload['id']);
    }
  }

  if ($kind === 'requirement') {
    $stmt = $pdo->query("SELECT id FROM users WHERE account_status='active' AND role='vendor'");
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $vendor) {
      LinkLearn\Notification::send((int)$vendor['id'], (int)$actor['id'], 'vendor_requirement', "posted a procurement request for {$payload['itemType']}", (int)$payload['id']);
    }
  }
}

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

if ($path === '/api/push/config' && $method === 'GET') {
  Http::json([
    'provider' => 'onesignal',
    'enabled' => PushNotification::isConfigured(),
    'appId' => Env::get('ONESIGNAL_APP_ID', ''),
  ]);
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

if ($path === '/api/users/me' && $method === 'DELETE') {
  $me = Auth::requireUser();
  $pdo = LinkLearn\Db::pdo();
  $pdo->prepare("DELETE FROM users WHERE id=?")->execute([(int)$me['id']]);
  Auth::logout();
  Http::json(['ok' => true]);
}

if ($path === '/api/users/me' && $method === 'PATCH') {
  $me = Auth::requireUser();
  $body = Http::jsonBody();
  $updated = Auth::updateMe((int)$me['id'], $body);
  Http::json(['user' => $updated]);
}

if ($path === '/api/users/me/catalogue' && $method === 'PATCH') {
  $me = Auth::requireUser();
  $body = Http::jsonBody();
  $catalogue = $body['catalogue'] ?? null;
  if (!is_array($catalogue)) Http::json(['error' => 'catalogue must be array'], 400);
  $updated = Auth::updateMe((int)$me['id'], ['catalogue' => $catalogue]);
  Http::json(['user' => $updated]);
}

if ($path === '/api/users/search' && $method === 'GET') {
  Auth::requireUser();
  $q = trim((string)($_GET['q'] ?? ''));
  if (strlen($q) < 2) Http::json(['users' => []]);
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("SELECT id, name, email, role, avatar_url AS avatar FROM users WHERE (name LIKE ? OR email LIKE ?) AND account_status='active' ORDER BY name ASC LIMIT 50");
  $like = '%' . $q . '%';
  $stmt->execute([$like, $like]);
  Http::json(['users' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

if ($path === '/api/institutions' && $method === 'GET') {
  Auth::requireUser();
  $pdo = Db::pdo();
  $stmt = $pdo->query("SELECT id, name, email, role, avatar_url AS avatar, bio, departments_json, catalogue_json, org_type FROM users WHERE login_type='institutional' AND role<>'admin' AND account_status='active' ORDER BY name ASC LIMIT 200");
  $institutions = array_map(static function($row) {
    return [
      'id' => (string)$row['id'],
      'name' => $row['name'],
      'email' => $row['email'],
      'role' => $row['role'],
      'avatar' => $row['avatar'] ?? '',
      'bio' => $row['bio'] ?? '',
      'departments' => ll_json_decode_array($row['departments_json'] ?? '[]'),
      'catalogue' => ll_json_decode_array($row['catalogue_json'] ?? '[]'),
      'orgType' => $row['org_type'] ?? '',
    ];
  }, $stmt->fetchAll(PDO::FETCH_ASSOC));
  Http::json(['institutions' => $institutions]);
}

if ($path === '/api/institution-links' && $method === 'GET') {
  $me = Auth::requireUser();
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("
    SELECT l.*, u.name, u.email, u.role, u.avatar_url AS avatar
    FROM institution_links l
    JOIN users u ON u.id = l.institution_id
    WHERE l.user_id=?
    ORDER BY l.created_at DESC
  ");
  $stmt->execute([(int)$me['id']]);
  $links = array_map(static fn($row) => [
    'id' => (string)$row['institution_id'],
    'name' => $row['name'],
    'email' => $row['email'],
    'role' => $row['role'],
    'avatar' => $row['avatar'] ?? '',
    'status' => $row['status'],
    'createdAt' => gmdate('c', strtotime($row['created_at'])),
  ], $stmt->fetchAll(PDO::FETCH_ASSOC));
  Http::json(['links' => $links]);
}

if ($path === '/api/institution-links' && $method === 'POST') {
  $me = Auth::requireUser();
  $body = Http::jsonBody();
  $institutionId = (int)($body['institutionId'] ?? 0);
  if ($institutionId <= 0) Http::json(['error' => 'institutionId required'], 400);
  $pdo = Db::pdo();
  $check = $pdo->prepare("SELECT 1 FROM users WHERE id=? AND login_type='institutional' AND account_status='active'");
  $check->execute([$institutionId]);
  if (!$check->fetchColumn()) Http::json(['error' => 'Institution not found or not active'], 404);
  $pdo->prepare("INSERT INTO institution_links (user_id, institution_id, status) VALUES (?, ?, 'linked') ON DUPLICATE KEY UPDATE status='linked'")
    ->execute([(int)$me['id'], $institutionId]);
  LinkLearn\Notification::send($institutionId, (int)$me['id'], 'institution_link', 'linked with your institution profile');
  Http::json(['ok' => true]);
}

if (preg_match('#^/api/institution-links/(\\d+)$#', $path, $m) && $method === 'DELETE') {
  $me = Auth::requireUser();
  $pdo = Db::pdo();
  $pdo->prepare("DELETE FROM institution_links WHERE user_id=? AND institution_id=?")->execute([(int)$me['id'], (int)$m[1]]);
  Http::json(['ok' => true]);
}

if (preg_match('#^/api/users/(\\d+)$#', $path, $m) && $method === 'GET') {
  $me = Auth::requireUser();
  $uid = (int)$m[1];
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("SELECT id, name, email, role, avatar_url AS avatar, bio, skills_json, education_json, experience_json, publications_json, certificates_json, departments_json, catalogue_json, org_type, verified_badge FROM users WHERE id=?");
  $stmt->execute([$uid]);
  $u = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$u) Http::json(['error' => 'User not found'], 404);
  
  // Transform JSON fields
  $u['skills'] = json_decode($u['skills_json'] ?? '[]', true);
  $u['education'] = json_decode($u['education_json'] ?? '[]', true);
  $u['experience'] = json_decode($u['experience_json'] ?? '[]', true);
  $u['publications'] = json_decode($u['publications_json'] ?? '[]', true);
  $u['certificates'] = json_decode($u['certificates_json'] ?? '[]', true);
  $u['departments'] = json_decode($u['departments_json'] ?? '[]', true);
  $u['catalogue'] = json_decode($u['catalogue_json'] ?? '[]', true);
  $u['orgType'] = $u['org_type'] ?? '';
  $u['verifiedBadge'] = (bool)($u['verified_badge'] ?? false);

  $links = $pdo->prepare("
    SELECT i.id, i.name, i.role, i.avatar_url AS avatar
    FROM institution_links l
    JOIN users i ON i.id = l.institution_id
    WHERE l.user_id=?
    ORDER BY i.name ASC
  ");
  $links->execute([$uid]);
  $u['institutions'] = array_map(static fn($row) => [
    'id' => (string)$row['id'],
    'name' => $row['name'],
    'role' => $row['role'],
    'avatar' => $row['avatar'] ?? '',
  ], $links->fetchAll(PDO::FETCH_ASSOC));
  
  // NOTIFICATION: Profile View
  if ($uid !== (int)$me['id']) {
    LinkLearn\Notification::send($uid, (int)$me['id'], 'profile_view', "viewed your profile");
  }

  Http::json(['user' => $u]);
}

if (preg_match('#^/api/users/(\\d+)/endorsements$#', $path, $m) && $method === 'GET') {
  Auth::requireUser();
  $uid = (int)$m[1];
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("
    SELECT e.*, u.name AS endorser_name, u.avatar_url AS endorser_avatar, u.role AS endorser_role
    FROM user_endorsements e
    JOIN users u ON u.id = e.endorser_user_id
    WHERE e.target_user_id=?
    ORDER BY e.created_at DESC
    LIMIT 100
  ");
  $stmt->execute([$uid]);
  $out = array_map(static fn($row) => [
    'id' => (string)$row['id'],
    'skill' => $row['skill'],
    'comment' => $row['comment'] ?? '',
    'endorser' => [
      'id' => (string)$row['endorser_user_id'],
      'name' => $row['endorser_name'],
      'avatar' => $row['endorser_avatar'] ?? '',
      'role' => $row['endorser_role'],
    ],
    'createdAt' => gmdate('c', strtotime($row['created_at'])),
  ], $stmt->fetchAll(PDO::FETCH_ASSOC));
  Http::json(['endorsements' => $out]);
}

if (preg_match('#^/api/users/(\\d+)/endorsements$#', $path, $m) && $method === 'POST') {
  $me = Auth::requireUser();
  $targetId = (int)$m[1];
  if ($targetId === (int)$me['id']) Http::json(['error' => 'Cannot endorse yourself'], 400);
  if (!Auth::areConnected((int)$me['id'], $targetId) && ($me['role'] ?? '') !== 'admin') {
    Http::json(['error' => 'Only accepted connections can endorse this profile'], 403);
  }
  $body = Http::jsonBody();
  $skill = trim((string)($body['skill'] ?? ''));
  $comment = trim((string)($body['comment'] ?? ''));
  if ($skill === '') Http::json(['error' => 'skill required'], 400);
  $pdo = Db::pdo();
  $pdo->prepare("INSERT INTO user_endorsements (target_user_id, endorser_user_id, skill, comment) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE comment=VALUES(comment), created_at=NOW()")
    ->execute([$targetId, (int)$me['id'], $skill, $comment]);
  LinkLearn\Notification::send($targetId, (int)$me['id'], 'endorsement', "endorsed you for {$skill}");
  Http::json(['ok' => true]);
}

// --- UPLOADS ---
if ($path === '/api/uploads/avatar' && $method === 'POST') {
  $me = Auth::requireUser();
  $url = Http::handleUpload('file', 'avatars/' . $me['id']);
  $updated = Auth::updateMe((int)$me['id'], ['avatar_url' => $url]);
  Http::json(['url' => $url, 'user' => $updated]);
}

if ($path === '/api/uploads/certificate' && $method === 'POST') {
  $me = Auth::requireUser();
  $degree = trim((string)($_POST['degree'] ?? ''));
  if ($degree === '') Http::json(['error' => 'degree required'], 400);
  $url = Http::handleUpload('file', 'certificates/' . $me['id']);
  $updated = Auth::appendCertificate((int)$me['id'], [
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
    // NOTIFICATION: Like
    $post = $pdo->prepare("SELECT user_id FROM posts WHERE id=?");
    $post->execute([$postId]);
    $authorId = (int)$post->fetchColumn();
    if ($authorId && $authorId !== (int)$me['id']) {
      LinkLearn\Notification::send($authorId, (int)$me['id'], 'post_like', "liked your post", $postId);
    }
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
  
  // NOTIFICATION: Comment
  $post = $pdo->prepare("SELECT user_id FROM posts WHERE id=?");
  $post->execute([$postId]);
  $authorId = (int)$post->fetchColumn();
  if ($authorId && $authorId !== (int)$me['id']) {
    LinkLearn\Notification::send($authorId, (int)$me['id'], 'post_comment', "commented on your post", $postId);
  }

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
  $me = Auth::requireUser();
  $status = (string)($_GET['status'] ?? 'published');
  if ($status !== 'published' && ($me['role'] ?? '') !== 'admin') {
    Http::json(['error' => 'forbidden'], 403);
  }
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("SELECT * FROM articles WHERE status=? ORDER BY created_at DESC LIMIT 200");
  $stmt->execute([$status]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  Http::json(['articles' => array_map('LinkLearn\\Transform::article', $rows)]);
}

if ($path === '/api/articles' && $method === 'POST') {
  $me = Auth::requireRole(['researcher', 'institution', 'govt_body', 'ngo', 'admin']);
  $body = Http::jsonBody();
  $title = trim((string)($body['title'] ?? ''));
  $content = (string)($body['content'] ?? '');
  $category = (string)($body['category'] ?? '');
  $tags = $body['tags'] ?? [];
  if ($title === '' || trim($content) === '') Http::json(['error' => 'title/content required'], 400);
  if (!is_array($tags)) $tags = [];

  // Hugging Face AI Content Detection
  $hfToken = LinkLearn\Env::get('HF_API_TOKEN', '');
  $aiScore = null;
  $aiCategory = null;
  $plagiarismScore = null;
  $fakeProfileScore = null;

  if ($hfToken) {
    $ch = curl_init('https://api-inference.huggingface.co/models/roberta-base-openai-detector');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    // Limit content length to prevent token limits
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['inputs' => substr($content, 0, 1000)]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $hfToken,
        'Content-Type: application/json'
    ]);
    
    $res = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status === 200 && $res) {
        $data = json_decode($res, true);
        if (is_array($data) && isset($data[0])) {
            $isFake = false;
            foreach ($data[0] as $pred) {
                // Models typically return 'Fake' and 'Real' labels
                if ($pred['label'] === 'Fake') {
                    $aiScore = $pred['score'];
                    $isFake = true;
                }
            }
            $aiCategory = $isFake && $aiScore > 0.5 ? 'AI-Generated' : 'Human-Written';
        }
    }
  } else {
    // Demo Mock: Assign random high AI score if text contains specific keywords, else human
    $lowerContent = strtolower($content);
    if (str_contains($lowerContent, 'delve') || str_contains($lowerContent, 'test ai')) {
        $aiScore = 0.92;
        $aiCategory = 'AI-Generated (Mock)';
    } else {
        $aiScore = 0.12;
        $aiCategory = 'Human-Written (Mock)';
    }
  }

  $normalizedContent = preg_replace('/\s+/', ' ', strtolower(trim($content)));
  $tokens = array_values(array_filter(explode(' ', $normalizedContent), static fn($token) => strlen($token) > 3));
  $uniqueTokens = array_unique($tokens);
  $plagiarismScore = count($tokens) > 0 ? round(1 - (count($uniqueTokens) / count($tokens)), 2) : 0.0;

  $profileSignals = 0;
  if (trim((string)($me['bio'] ?? '')) === '') $profileSignals += 0.35;
  if (count((array)($me['skills'] ?? [])) === 0) $profileSignals += 0.2;
  if (count((array)($me['education'] ?? [])) === 0) $profileSignals += 0.2;
  if (count((array)($me['publications'] ?? [])) === 0 && in_array((string)$me['role'], ['researcher', 'govt_body'], true)) $profileSignals += 0.25;
  $fakeProfileScore = min(1, round($profileSignals, 2));

  $pdo = Db::pdo();
  $stmt = $pdo->prepare("INSERT INTO articles (user_id, author_name, author_role, title, content, category, tags_json, status, ai_score, ai_category, plagiarism_score, fake_profile_score) VALUES (?,?,?,?,?,?,?, 'pending', ?, ?, ?, ?)");
  $stmt->execute([
    (int)$me['id'], 
    $me['name'], 
    $me['role'], 
    $title, 
    $content, 
    $category, 
    json_encode($tags),
    $aiScore,
    $aiCategory,
    $plagiarismScore,
    $fakeProfileScore
  ]);
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
  $stmt = $pdo->query("SELECT e.* FROM events e ORDER BY e.created_at DESC LIMIT 200");
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $eventIds = array_map(static fn($event) => (int)$event['id'], $rows);
  $attendeesByEvent = [];
  if (count($eventIds) > 0) {
    $in = implode(',', array_fill(0, count($eventIds), '?'));
    $attendeeStmt = $pdo->prepare("SELECT event_id, user_id, name, email, ticket_id, attended, registered_at FROM event_attendees WHERE event_id IN ($in) ORDER BY registered_at ASC");
    $attendeeStmt->execute($eventIds);
    foreach ($attendeeStmt->fetchAll(PDO::FETCH_ASSOC) as $attendee) {
      $attendeesByEvent[(int)$attendee['event_id']][] = [
        'uid' => (string)$attendee['user_id'],
        'name' => $attendee['name'],
        'email' => $attendee['email'],
        'ticketId' => $attendee['ticket_id'],
        'attended' => (bool)$attendee['attended'],
        'registeredAt' => gmdate('c', strtotime($attendee['registered_at'])),
      ];
    }
  }
  foreach ($rows as &$row) {
    $row['attendees_json'] = json_encode($attendeesByEvent[(int)$row['id']] ?? []);
  }
  unset($row);
  Http::json(['events' => array_map('LinkLearn\\Transform::event', $rows)]);
}

if ($path === '/api/events' && $method === 'POST') {
  $me = Auth::requireRole(['institution', 'govt_body', 'ngo', 'researcher', 'admin']);
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
  $eventId = (int)$pdo->lastInsertId();
  ll_send_matching_notifications('event', $me, [
    'id' => $eventId,
    'title' => $title,
  ]);
  Http::json(['ok' => true, 'id' => (string)$eventId]);
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
  $stmt = $pdo->prepare("SELECT e.* FROM events e WHERE e.user_id=? ORDER BY e.created_at DESC LIMIT 200");
  $stmt->execute([(int)$me['id']]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $eventIds = array_map(static fn($event) => (int)$event['id'], $rows);
  $attendeesByEvent = [];
  if (count($eventIds) > 0) {
    $in = implode(',', array_fill(0, count($eventIds), '?'));
    $attendeeStmt = $pdo->prepare("SELECT event_id, user_id, name, email, ticket_id, attended, registered_at FROM event_attendees WHERE event_id IN ($in) ORDER BY registered_at ASC");
    $attendeeStmt->execute($eventIds);
    foreach ($attendeeStmt->fetchAll(PDO::FETCH_ASSOC) as $attendee) {
      $attendeesByEvent[(int)$attendee['event_id']][] = [
        'uid' => (string)$attendee['user_id'],
        'name' => $attendee['name'],
        'email' => $attendee['email'],
        'ticketId' => $attendee['ticket_id'],
        'attended' => (bool)$attendee['attended'],
        'registeredAt' => gmdate('c', strtotime($attendee['registered_at'])),
      ];
    }
  }
  foreach ($rows as &$row) {
    $row['attendees_json'] = json_encode($attendeesByEvent[(int)$row['id']] ?? []);
  }
  unset($row);
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
  $me = Auth::requireUser();
  $eventId = (int)$m[1];
  $uid = (int)$m[2];
  $pdo = Db::pdo();
  $own = $pdo->prepare("SELECT 1 FROM events WHERE id=? AND user_id=?");
  $own->execute([$eventId, (int)$me['id']]);
  if (!$own->fetchColumn() && ($me['role'] ?? '') !== 'admin') Http::json(['error' => 'forbidden'], 403);
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
  $me = Auth::requireRole(['institution', 'govt_body', 'ngo', 'admin']);
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
  $vacancyId = (int)$pdo->lastInsertId();
  ll_send_matching_notifications('vacancy', $me, [
    'id' => $vacancyId,
    'role' => (string)($body['role'] ?? ''),
    'roleType' => (string)($body['roleType'] ?? ''),
    'department' => (string)($body['department'] ?? ''),
    'description' => (string)($body['description'] ?? ''),
    'eligibility' => (string)($body['eligibility'] ?? ''),
  ]);
  Http::json(['ok' => true, 'id' => (string)$vacancyId]);
}

if ($path === '/api/vacancies/mine' && $method === 'GET') {
  $me = Auth::requireUser();
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("
    SELECT v.*,
      COALESCE((
        SELECT JSON_ARRAYAGG(JSON_OBJECT(
          'uid', CAST(a.user_id AS CHAR),
          'name', a.name,
          'email', a.email,
          'role', a.role,
          'status', a.status,
          'appliedAt', DATE_FORMAT(a.applied_at, '%Y-%m-%dT%H:%i:%sZ')
        ))
        FROM vacancy_applicants a
        WHERE a.vacancy_id = v.id
      ), JSON_ARRAY()) AS applicants_json
    FROM vacancies v
    WHERE v.user_id=?
    ORDER BY v.created_at DESC
    LIMIT 200
  ");
  $stmt->execute([(int)$me['id']]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  Http::json(['vacancies' => array_map('LinkLearn\\Transform::vacancy', $rows)]);
}

if (preg_match('#^/api/vacancies/(\\d+)/apply$#', $path, $m) && $method === 'POST') {
  $me = Auth::requireRole(['student', 'researcher', 'admin']);
  $vacId = (int)$m[1];
  $pdo = Db::pdo();
  $pdo->prepare("INSERT INTO vacancy_applicants (vacancy_id, user_id, name, email, role, status) VALUES (?,?,?,?,?, 'applied')
    ON DUPLICATE KEY UPDATE status='applied'")
    ->execute([$vacId, (int)$me['id'], $me['name'], $me['email'], $me['role']]);
  $owner = $pdo->prepare("SELECT user_id, role FROM vacancies WHERE id=?");
  $owner->execute([$vacId]);
  $vacancy = $owner->fetch(PDO::FETCH_ASSOC);
  if ($vacancy && (int)$vacancy['user_id'] !== (int)$me['id']) {
    LinkLearn\Notification::send((int)$vacancy['user_id'], (int)$me['id'], 'job_application', "applied to your {$vacancy['role']} posting", $vacId);
  }
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
if ($path === '/api/vendors' && $method === 'GET') {
  Auth::requireUser();
  $pdo = Db::pdo();
  $stmt = $pdo->query("SELECT id, name, email, role, avatar_url AS avatar, bio, catalogue_json, org_type, verified_badge FROM users WHERE role='vendor' AND account_status='active' ORDER BY name ASC LIMIT 200");
  $vendors = array_map(static fn($row) => [
    'id' => (string)$row['id'],
    'name' => $row['name'],
    'email' => $row['email'],
    'role' => $row['role'],
    'avatar' => $row['avatar'] ?? '',
    'bio' => $row['bio'] ?? '',
    'catalogue' => ll_json_decode_array($row['catalogue_json'] ?? '[]'),
    'orgType' => $row['org_type'] ?? '',
    'verifiedBadge' => (bool)($row['verified_badge'] ?? false),
  ], $stmt->fetchAll(PDO::FETCH_ASSOC));
  Http::json(['vendors' => $vendors]);
}

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
  $me = Auth::requireRole(['institution', 'govt_body', 'ngo', 'admin']);
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
  $requirementId = (int)$pdo->lastInsertId();
  ll_send_matching_notifications('requirement', $me, [
    'id' => $requirementId,
    'itemType' => (string)($body['itemType'] ?? ''),
  ]);
  Http::json(['ok' => true, 'id' => (string)$requirementId]);
}

if ($path === '/api/requirements/mine' && $method === 'GET') {
  $me = Auth::requireUser();
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("
    SELECT r.*,
      COALESCE((
        SELECT JSON_ARRAYAGG(JSON_OBJECT(
          'vendorUid', CAST(q.vendor_user_id AS CHAR),
          'vendorName', q.vendor_name,
          'price', q.price,
          'timeline', q.timeline,
          'terms', q.terms,
          'submittedAt', DATE_FORMAT(q.submitted_at, '%Y-%m-%dT%H:%i:%sZ'),
          'status', q.status
        ))
        FROM requirement_quotes q
        WHERE q.requirement_id = r.id
      ), JSON_ARRAY()) AS quotes_json
    FROM requirements r
    WHERE r.user_id=?
    ORDER BY r.created_at DESC
    LIMIT 200
  ");
  $stmt->execute([(int)$me['id']]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  Http::json(['requirements' => array_map('LinkLearn\\Transform::requirement', $rows)]);
}

if (preg_match('#^/api/requirements/(\\d+)/quotes$#', $path, $m) && $method === 'POST') {
  $me = Auth::requireRole(['vendor', 'admin']);
  $reqId = (int)$m[1];
  $body = Http::jsonBody();
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("INSERT INTO requirement_quotes (requirement_id, vendor_user_id, vendor_name, price, timeline, terms, status) VALUES (?,?,?,?,?,?, 'pending')
    ON DUPLICATE KEY UPDATE price=VALUES(price), timeline=VALUES(timeline), terms=VALUES(terms), status='pending'");
  $stmt->execute([$reqId, (int)$me['id'], $me['name'], (string)($body['price'] ?? ''), (string)($body['timeline'] ?? ''), (string)($body['terms'] ?? '')]);
  $owner = $pdo->prepare("SELECT user_id, item_type FROM requirements WHERE id=?");
  $owner->execute([$reqId]);
  $requirement = $owner->fetch(PDO::FETCH_ASSOC);
  if ($requirement && (int)$requirement['user_id'] !== (int)$me['id']) {
    LinkLearn\Notification::send((int)$requirement['user_id'], (int)$me['id'], 'vendor_quote', "submitted a quote for {$requirement['item_type']}", $reqId);
  }
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

// --- ADS ---
if ($path === '/api/ads' && $method === 'GET') {
  $me = Auth::requireUser();
  $status = (string)($_GET['status'] ?? 'approved');
  $placement = trim((string)($_GET['placement'] ?? ''));
  $pdo = Db::pdo();
  $sql = "SELECT * FROM ads WHERE status=?";
  $params = [$status];
  if ($placement !== '') {
    $sql .= " AND placement=?";
    $params[] = $placement;
  }
  $sql .= " ORDER BY created_at DESC LIMIT 200";
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $roleAudience = [
    'student' => 'Students',
    'researcher' => 'Researchers',
    'institution' => 'Institutions',
    'govt_body' => 'Institutions',
    'ngo' => 'Funding Agencies',
    'vendor' => 'Vendors',
    'advertiser' => 'Institutions',
    'admin' => 'Institutions',
  ];
  $segment = $roleAudience[$me['role'] ?? ''] ?? '';
  $ads = array_values(array_filter(array_map('LinkLearn\\Transform::ad', $rows), static function($ad) use ($segment) {
    $audience = $ad['targetAudience'] ?? [];
    return count($audience) === 0 || in_array($segment, $audience, true);
  }));
  Http::json(['ads' => $ads]);
}

if ($path === '/api/ads' && $method === 'POST') {
  $me = Auth::requireRole(['advertiser', 'institution', 'govt_body', 'ngo', 'vendor', 'admin']);
  $body = Http::jsonBody();
  $title = trim((string)($body['title'] ?? ''));
  $placement = trim((string)($body['placement'] ?? 'feed'));
  $audience = $body['targetAudience'] ?? [];
  if ($title === '') Http::json(['error' => 'title required'], 400);
  if (!is_array($audience)) $audience = [];
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("INSERT INTO ads (user_id, advertiser_name, advertiser_role, title, description, placement, target_audience_json, destination_url, budget, status) VALUES (?,?,?,?,?,?,?,?,?, 'pending')");
  $stmt->execute([
    (int)$me['id'],
    $me['name'],
    $me['role'],
    $title,
    (string)($body['description'] ?? ''),
    $placement,
    json_encode($audience),
    (string)($body['destinationUrl'] ?? ''),
    (string)($body['budget'] ?? ''),
  ]);
  Http::json(['ok' => true, 'id' => (string)$pdo->lastInsertId()]);
}

if ($path === '/api/ads/mine' && $method === 'GET') {
  $me = Auth::requireUser();
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("SELECT * FROM ads WHERE user_id=? ORDER BY created_at DESC LIMIT 200");
  $stmt->execute([(int)$me['id']]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  Http::json(['ads' => array_map('LinkLearn\\Transform::ad', $rows)]);
}

if (preg_match('#^/api/ads/(\\d+)/impression$#', $path, $m) && $method === 'POST') {
  Auth::requireUser();
  $pdo = Db::pdo();
  $pdo->prepare("UPDATE ads SET impressions = impressions + 1 WHERE id=? AND status='approved'")->execute([(int)$m[1]]);
  Http::json(['ok' => true]);
}

if (preg_match('#^/api/ads/(\\d+)/click$#', $path, $m) && $method === 'POST') {
  Auth::requireUser();
  $pdo = Db::pdo();
  $pdo->prepare("UPDATE ads SET clicks = clicks + 1 WHERE id=? AND status='approved'")->execute([(int)$m[1]]);
  Http::json(['ok' => true]);
}

if ($path === '/api/admin/ads' && $method === 'GET') {
  Auth::requireRole(['admin']);
  $status = (string)($_GET['status'] ?? 'pending');
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("SELECT * FROM ads WHERE status=? ORDER BY created_at DESC LIMIT 200");
  $stmt->execute([$status]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  Http::json(['ads' => array_map('LinkLearn\\Transform::ad', $rows)]);
}

if (preg_match('#^/api/admin/ads/(\\d+)/status$#', $path, $m) && $method === 'PATCH') {
  Auth::requireRole(['admin']);
  $id = (int)$m[1];
  $body = Http::jsonBody();
  $status = (string)($body['status'] ?? '');
  $reason = (string)($body['reason'] ?? '');
  if (!in_array($status, ['pending', 'approved', 'rejected', 'paused'], true)) Http::json(['error' => 'invalid status'], 400);
  $pdo = Db::pdo();
  $pdo->prepare("UPDATE ads SET status=?, admin_note=? WHERE id=?")->execute([$status, $reason, $id]);
  Http::json(['ok' => true]);
}

// --- CONNECTIONS ---
if ($path === '/api/connections' && $method === 'GET') {
  $me = Auth::requireUser();
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("
    SELECT u.id, u.name, u.email, u.role, u.avatar_url AS avatar, c.status, c.user_id_1
    FROM user_connections c
    JOIN users u ON (u.id = c.user_id_1 OR u.id = c.user_id_2)
    WHERE (c.user_id_1 = ? OR c.user_id_2 = ?) AND u.id != ?
  ");
  $stmt->execute([(int)$me['id'], (int)$me['id'], (int)$me['id']]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $out = array_map(function($r) use ($me) {
    $status = $r['status'];
    if ($status === 'pending') {
      $status = (int)$r['user_id_1'] === (int)$me['id'] ? 'sent_pending' : 'received_pending';
    }
    return [
      'id' => (string)$r['id'],
      'name' => $r['name'],
      'role' => $r['role'],
      'avatar' => $r['avatar'],
      'status' => $status
    ];
  }, $rows);
  Http::json(['connections' => $out]);
}

if ($path === '/api/connections/request' && $method === 'POST') {
  $me = Auth::requireUser();
  $body = Http::jsonBody();
  $otherId = (int)($body['userId'] ?? 0);
  if (!$otherId) Http::json(['error' => 'userId required'], 400);
  Auth::requestConnection((int)$me['id'], $otherId);
  
  // NOTIFICATION: Connection Request
  LinkLearn\Notification::send($otherId, (int)$me['id'], 'connection_request', "sent you a connection request");

  Http::json(['ok' => true]);
}

if ($path === '/api/connections/respond' && $method === 'PATCH') {
  $me = Auth::requireUser();
  $body = Http::jsonBody();
  $otherId = (int)($body['userId'] ?? 0);
  $status = (string)($body['status'] ?? '');
  if (!$otherId || !$status) Http::json(['error' => 'userId and status required'], 400);
  Auth::respondConnection((int)$me['id'], $otherId, $status);
  
  // NOTIFICATION: Connection Accepted
  if ($status === 'accepted') {
    LinkLearn\Notification::send($otherId, (int)$me['id'], 'connection_accepted', "accepted your connection request");
  }

  Http::json(['ok' => true]);
}

if (preg_match('#^/api/connections/status/(\\d+)$#', $path, $m) && $method === 'GET') {
  $me = Auth::requireUser();
  $otherId = (int)$m[1];
  $status = Auth::getConnectionStatus((int)$me['id'], $otherId);
  Http::json(['status' => $status]);
}

if (preg_match('#^/api/connections/(\\d+)$#', $path, $m) && $method === 'DELETE') {
  $me = Auth::requireUser();
  $otherId = (int)$m[1];
  Auth::removeConnection((int)$me['id'], $otherId);
  Http::json(['ok' => true]);
}

// --- NOTIFICATIONS ---
if ($path === '/api/notifications' && $method === 'GET') {
  $me = Auth::requireUser();
  $rows = LinkLearn\Notification::getForUser((int)$me['id']);
  $out = array_map(function($n) {
    return [
      'id' => (string)$n['id'],
      'type' => $n['type'],
      'message' => $n['message'],
      'fromUser' => $n['from_user_id'] ? [
        'id' => (string)$n['from_user_id'],
        'name' => $n['from_name'],
        'avatar' => $n['from_avatar']
      ] : null,
      'relatedId' => $n['related_id'] ? (string)$n['related_id'] : null,
      'isRead' => (bool)$n['is_read'],
      'createdAt' => gmdate('c', strtotime($n['created_at']))
    ];
  }, $rows);
  Http::json(['notifications' => $out]);
}

if ($path === '/api/notifications/read-all' && $method === 'POST') {
  $me = Auth::requireUser();
  LinkLearn\Notification::markAllAsRead((int)$me['id']);
  Http::json(['ok' => true]);
}

if (preg_match('#^/api/notifications/(\\d+)/read$#', $path, $m) && $method === 'PATCH') {
  $me = Auth::requireUser();
  LinkLearn\Notification::markAsRead((int)$me['id'], (int)$m[1]);
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

if ($path === '/api/group-conversations' && $method === 'GET') {
  $me = Auth::requireUser();
  $pdo = Db::pdo();
  $stmt = $pdo->prepare("
    SELECT g.*
    FROM group_conversations g
    JOIN group_conversation_members mine ON mine.group_id = g.id AND mine.user_id=?
    ORDER BY COALESCE(g.last_message_at, g.created_at) DESC
    LIMIT 100
  ");
  $stmt->execute([(int)$me['id']]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $membersByGroup = [];
  if (count($rows) > 0) {
    $groupIds = array_map(static fn($g) => (int)$g['id'], $rows);
    $in = implode(',', array_fill(0, count($groupIds), '?'));
    $members = $pdo->prepare("
      SELECT gm.group_id, u.id, u.name, u.role, u.avatar_url AS avatar
      FROM group_conversation_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id IN ($in)
      ORDER BY u.name ASC
    ");
    $members->execute($groupIds);
    foreach ($members->fetchAll(PDO::FETCH_ASSOC) as $member) {
      $membersByGroup[(int)$member['group_id']][] = [
        'id' => (string)$member['id'],
        'name' => $member['name'],
        'role' => $member['role'],
        'avatar' => $member['avatar'] ?? '',
      ];
    }
  }
  $groups = array_map(static fn($g) => [
    'id' => (string)$g['id'],
    'name' => $g['name'],
    'ownerId' => (string)$g['owner_id'],
    'participants' => $membersByGroup[(int)$g['id']] ?? [],
    'lastMessage' => $g['last_message'] ?? '',
    'lastMessageAt' => $g['last_message_at'] ? gmdate('c', strtotime($g['last_message_at'])) : null,
    'createdAt' => gmdate('c', strtotime($g['created_at'])),
    'type' => 'group',
  ], $rows);
  Http::json(['groups' => $groups]);
}

if ($path === '/api/group-conversations' && $method === 'POST') {
  $me = Auth::requireUser();
  $body = Http::jsonBody();
  $name = trim((string)($body['name'] ?? ''));
  $memberIds = $body['memberIds'] ?? [];
  if ($name === '') Http::json(['error' => 'name required'], 400);
  if (!is_array($memberIds)) $memberIds = [];
  $memberIds = array_values(array_unique(array_filter(array_map('intval', $memberIds), static fn($id) => $id > 0)));
  $memberIds[] = (int)$me['id'];
  $memberIds = array_values(array_unique($memberIds));
  if (count($memberIds) < 3) Http::json(['error' => 'Add at least two other members'], 400);
  $pdo = Db::pdo();
  foreach ($memberIds as $memberId) {
    if ($memberId !== (int)$me['id'] && !Auth::areConnected((int)$me['id'], $memberId)) {
      Http::json(['error' => 'Group members must be accepted connections'], 403);
    }
  }
  $pdo->beginTransaction();
  $pdo->prepare("INSERT INTO group_conversations (name, owner_id) VALUES (?, ?)")->execute([$name, (int)$me['id']]);
  $groupId = (int)$pdo->lastInsertId();
  $insert = $pdo->prepare("INSERT INTO group_conversation_members (group_id, user_id) VALUES (?, ?)");
  foreach ($memberIds as $memberId) $insert->execute([$groupId, $memberId]);
  $pdo->commit();
  Http::json(['ok' => true, 'id' => (string)$groupId]);
}

if (preg_match('#^/api/group-conversations/(\\d+)/messages$#', $path, $m) && $method === 'GET') {
  $me = Auth::requireUser();
  $groupId = (int)$m[1];
  $pdo = Db::pdo();
  $member = $pdo->prepare("SELECT 1 FROM group_conversation_members WHERE group_id=? AND user_id=?");
  $member->execute([$groupId, (int)$me['id']]);
  if (!$member->fetchColumn()) Http::json(['error' => 'forbidden'], 403);
  $stmt = $pdo->prepare("
    SELECT gm.*, u.name AS sender_name, u.avatar_url AS sender_avatar
    FROM group_messages gm
    JOIN users u ON u.id = gm.sender_id
    WHERE gm.group_id=?
    ORDER BY gm.created_at ASC
    LIMIT 500
  ");
  $stmt->execute([$groupId]);
  $messages = array_map(static fn($msg) => [
    'id' => (string)$msg['id'],
    'senderId' => (string)$msg['sender_id'],
    'senderName' => $msg['sender_name'],
    'senderAvatar' => $msg['sender_avatar'] ?? '',
    'text' => $msg['text'],
    'createdAt' => gmdate('c', strtotime($msg['created_at'])),
    'read' => true,
  ], $stmt->fetchAll(PDO::FETCH_ASSOC));
  Http::json(['messages' => $messages]);
}

if (preg_match('#^/api/group-conversations/(\\d+)/messages$#', $path, $m) && $method === 'POST') {
  $me = Auth::requireUser();
  $groupId = (int)$m[1];
  $body = Http::jsonBody();
  $text = trim((string)($body['text'] ?? ''));
  if ($text === '') Http::json(['error' => 'text required'], 400);
  $pdo = Db::pdo();
  $member = $pdo->prepare("SELECT 1 FROM group_conversation_members WHERE group_id=? AND user_id=?");
  $member->execute([$groupId, (int)$me['id']]);
  if (!$member->fetchColumn()) Http::json(['error' => 'forbidden'], 403);
  $pdo->prepare("INSERT INTO group_messages (group_id, sender_id, text) VALUES (?, ?, ?)")->execute([$groupId, (int)$me['id'], $text]);
  $pdo->prepare("UPDATE group_conversations SET last_message=?, last_message_at=NOW() WHERE id=?")->execute([$text, $groupId]);
  $recipients = $pdo->prepare("SELECT user_id FROM group_conversation_members WHERE group_id=? AND user_id<>?");
  $recipients->execute([$groupId, (int)$me['id']]);
  foreach ($recipients->fetchAll(PDO::FETCH_ASSOC) as $recipient) {
    LinkLearn\Notification::send((int)$recipient['user_id'], (int)$me['id'], 'group_message', 'sent a group message', $groupId);
  }
  Http::json(['ok' => true]);
}

if (preg_match('#^/api/conversations/(\\d+)/messages$#', $path, $m) && $method === 'GET') {
  $me = Auth::requireUser();
  $otherId = (int)$m[1];
  $pdo = Db::pdo();
  $convId = Auth::ensureConversation((int)$me['id'], $otherId); // cast already correct
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
  
  // RESTRICTION: Only connected people can send messages
  if (!Auth::areConnected((int)$me['id'], $otherId)) {
    Http::json(['error' => 'You must be connected to send messages'], 403);
  }

  $convId = Auth::ensureConversation((int)$me['id'], $otherId);
  $pdo->prepare("INSERT INTO messages (conversation_id, sender_id, text) VALUES (?,?,?)")
    ->execute([$convId, (int)$me['id'], $text]);
  $pdo->prepare("UPDATE conversations SET last_message=?, last_message_at=NOW() WHERE id=?")->execute([$text, $convId]);
  
  // NOTIFICATION: Message Received
  LinkLearn\Notification::send($otherId, (int)$me['id'], 'message_received', "sent you a message");
  
  Http::json(['ok' => true]);
}

// --- ADMIN USERS ---
if ($path === '/api/admin/overview' && $method === 'GET') {
  Auth::requireRole(['admin']);
  $pdo = Db::pdo();

  $count = static function(string $sql) use ($pdo): int {
    return (int)$pdo->query($sql)->fetchColumn();
  };

  $roleRows = $pdo->query("SELECT role, COUNT(*) AS total FROM users GROUP BY role ORDER BY total DESC")->fetchAll(PDO::FETCH_ASSOC);
  $statusRows = $pdo->query("SELECT account_status AS status, COUNT(*) AS total FROM users GROUP BY account_status")->fetchAll(PDO::FETCH_ASSOC);
  $dailyUsers = $pdo->query("SELECT DATE(created_at) AS day, COUNT(*) AS total FROM users GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 14")->fetchAll(PDO::FETCH_ASSOC);
  $dailyContent = $pdo->query("
    SELECT DATE(created_at) AS day, 'posts' AS kind, COUNT(*) AS total FROM posts GROUP BY DATE(created_at)
    UNION ALL
    SELECT DATE(created_at) AS day, 'articles' AS kind, COUNT(*) AS total FROM articles GROUP BY DATE(created_at)
    UNION ALL
    SELECT DATE(created_at) AS day, 'events' AS kind, COUNT(*) AS total FROM events GROUP BY DATE(created_at)
    ORDER BY day DESC
    LIMIT 42
  ")->fetchAll(PDO::FETCH_ASSOC);
  $adStats = $pdo->query("SELECT status, COUNT(*) AS total, COALESCE(SUM(impressions),0) AS impressions, COALESCE(SUM(clicks),0) AS clicks FROM ads GROUP BY status")->fetchAll(PDO::FETCH_ASSOC);

  $recentStmt = $pdo->query("SELECT id, email, name, role, login_type AS loginType, account_status AS accountStatus, profile_completed AS profileCompleted, avatar_url AS avatar, verified_badge AS verifiedBadge, bio, certificates_json AS certificatesJson, created_at AS createdAt, updated_at AS updatedAt FROM users ORDER BY created_at DESC LIMIT 6");
  $recentUsers = array_map('LinkLearn\\Transform::adminUser', $recentStmt->fetchAll(PDO::FETCH_ASSOC));

  Http::json([
    'totals' => [
      'users' => $count("SELECT COUNT(*) FROM users"),
      'pendingInstitutions' => $count("SELECT COUNT(*) FROM users WHERE login_type='institutional' AND account_status='pending'"),
      'pendingArticles' => $count("SELECT COUNT(*) FROM articles WHERE status='pending'"),
      'pendingAds' => $count("SELECT COUNT(*) FROM ads WHERE status='pending'"),
      'publishedArticles' => $count("SELECT COUNT(*) FROM articles WHERE status='published'"),
      'activeCampaigns' => $count("SELECT COUNT(*) FROM ads WHERE status='approved'"),
      'events' => $count("SELECT COUNT(*) FROM events"),
      'eventRegistrations' => $count("SELECT COUNT(*) FROM event_attendees"),
      'checkedInAttendees' => $count("SELECT COUNT(*) FROM event_attendees WHERE attended=1"),
      'openVacancies' => $count("SELECT COUNT(*) FROM vacancies WHERE status='open'"),
      'applications' => $count("SELECT COUNT(*) FROM vacancy_applicants"),
      'openRequirements' => $count("SELECT COUNT(*) FROM requirements WHERE status='open'"),
      'vendorQuotes' => $count("SELECT COUNT(*) FROM requirement_quotes"),
      'endorsements' => $count("SELECT COUNT(*) FROM user_endorsements"),
      'groups' => $count("SELECT COUNT(*) FROM group_conversations"),
    ],
    'usersByRole' => array_map(static fn($r) => ['role' => $r['role'], 'total' => (int)$r['total']], $roleRows),
    'usersByStatus' => array_map(static fn($r) => ['status' => $r['status'], 'total' => (int)$r['total']], $statusRows),
    'dailyUsers' => array_map(static fn($r) => ['day' => $r['day'], 'total' => (int)$r['total']], $dailyUsers),
    'dailyContent' => array_map(static fn($r) => ['day' => $r['day'], 'kind' => $r['kind'], 'total' => (int)$r['total']], $dailyContent),
    'adsByStatus' => array_map(static fn($r) => [
      'status' => $r['status'],
      'total' => (int)$r['total'],
      'impressions' => (int)$r['impressions'],
      'clicks' => (int)$r['clicks'],
      'ctr' => ((int)$r['impressions']) > 0 ? round(((int)$r['clicks'] / (int)$r['impressions']) * 100, 2) : 0,
    ], $adStats),
    'recentUsers' => $recentUsers,
  ]);
}

if ($path === '/api/admin/users' && $method === 'GET') {
  Auth::requireRole(['admin']);
  $pdo = Db::pdo();
  $stmt = $pdo->query("SELECT id, email, name, role, login_type AS loginType, account_status AS accountStatus, profile_completed AS profileCompleted, avatar_url AS avatar, verified_badge AS verifiedBadge, bio, certificates_json AS certificatesJson, created_at AS createdAt, updated_at AS updatedAt FROM users ORDER BY created_at DESC LIMIT 500");
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

