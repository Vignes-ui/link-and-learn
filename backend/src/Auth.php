<?php
declare(strict_types=1);

namespace LinkLearn;

use PDO;

final class Auth {
  public static function startSession(): void {
    $name = Env::get('SESSION_NAME', 'linklearn_session') ?: 'linklearn_session';
    $sameSite = Env::get('SESSION_SAMESITE', 'Lax') ?: 'Lax';
    $secure = filter_var(Env::get('SESSION_SECURE', '0'), FILTER_VALIDATE_BOOLEAN);
    $domain = Env::get('SESSION_DOMAIN', '') ?: '';
    session_name($name);
    $params = [
      'httponly' => true,
      'samesite' => $sameSite,
      'secure' => $secure,
      'path' => '/',
    ];
    if ($domain !== '') {
      $params['domain'] = $domain;
    }
    session_set_cookie_params($params);
    if (session_status() !== PHP_SESSION_ACTIVE) {
      session_start();
    }
  }

  public static function me(): ?array {
    $uid = $_SESSION['user_id'] ?? null;
    if (!$uid) return null;
    $pdo = Db::pdo();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id=?");
    $stmt->execute([(int)$uid]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$u) return null;
    return self::publicUser($u);
  }

  public static function requireUser(): array {
    $me = self::me();
    if (!$me) Http::json(['error' => 'unauthorized'], 401);
    return $me;
  }

  public static function requireRole(array $roles): array {
    $me = self::requireUser();
    if (!in_array($me['role'], $roles, true)) Http::json(['error' => 'forbidden'], 403);
    return $me;
  }

  public static function signup(string $email, string $password, string $role, string $name): array {
    if ($email === '' || $password === '') Http::json(['error' => 'email/password required'], 400);
    if (strlen($password) < 6) Http::json(['error' => 'password too short'], 400);
    $institutionalRoles = ['institution', 'govt_body', 'ngo', 'vendor', 'advertiser', 'admin'];
    $isInstitutional = in_array($role, $institutionalRoles, true);
    $loginType = $isInstitutional ? 'institutional' : 'personal';
    $accountStatus = $isInstitutional ? 'pending' : 'active';

    $pdo = Db::pdo();
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("INSERT INTO users (email, password_hash, name, role, login_type, account_status, profile_completed, bio, skills_json, education_json, experience_json, publications_json, certificates_json, departments_json, catalogue_json, verified_badge) VALUES (?,?,?,?,?,?,0,'', '[]','[]','[]','[]','[]','[]','[]',0)");
    try {
      $stmt->execute([$email, $hash, $name, $role, $loginType, $accountStatus]);
    } catch (\PDOException $e) {
      if (str_contains(strtolower($e->getMessage()), 'duplicate')) {
        Http::json(['error' => 'Email already exists'], 400);
      }
      Http::json(['error' => 'Signup failed'], 500);
    }
    $id = (int)$pdo->lastInsertId();
    if (!$isInstitutional) {
      $_SESSION['user_id'] = $id;
    }

    return [
      'id' => (string)$id,
      'accountStatus' => $accountStatus,
      'loginAllowed' => !$isInstitutional,
    ];
  }

  public static function login(string $email, string $password): void {
    if ($email === '' || $password === '') Http::json(['error' => 'email/password required'], 400);
    $pdo = Db::pdo();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email=?");
    $stmt->execute([$email]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$u || !$u['password_hash'] || !password_verify($password, $u['password_hash'])) {
      Http::json(['error' => 'Invalid credentials'], 401);
    }
    $status = (string)($u['account_status'] ?? 'active');
    if ($status === 'pending') {
      Http::json(['error' => 'Account pending admin approval'], 403);
    }
    if ($status === 'rejected') {
      Http::json(['error' => 'Account rejected'], 403);
    }
    if ($status === 'suspended') {
      Http::json(['error' => 'Account suspended'], 403);
    }
    $_SESSION['user_id'] = (int)$u['id'];
  }

  public static function requestPasswordReset(string $email): array {
    $email = strtolower(trim($email));
    if ($email === '') Http::json(['error' => 'email required'], 400);

    $pdo = Db::pdo();
    $stmt = $pdo->prepare("SELECT id, email, name FROM users WHERE email=? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    $generic = [
      'ok' => true,
      'message' => 'If an account exists for this email, a password reset link has been prepared.',
    ];
    if (!$user) return $generic;

    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $expiresAt = gmdate('Y-m-d H:i:s', time() + 3600);

    $pdo->prepare("DELETE FROM password_reset_tokens WHERE user_id=? OR expires_at < UTC_TIMESTAMP()")
      ->execute([(int)$user['id']]);
    $pdo->prepare("INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?,?,?)")
      ->execute([(int)$user['id'], $tokenHash, $expiresAt]);

    $resetUrl = self::passwordResetUrl($token);
    self::sendPasswordResetMail((string)$user['email'], (string)($user['name'] ?? ''), $resetUrl);

    return $generic + ['resetUrl' => $resetUrl];
  }

  public static function resetPassword(string $token, string $password): array {
    $token = trim($token);
    if ($token === '') Http::json(['error' => 'reset token required'], 400);
    if (strlen($password) < 6) Http::json(['error' => 'password too short'], 400);

    $pdo = Db::pdo();
    $tokenHash = hash('sha256', $token);
    $stmt = $pdo->prepare("
      SELECT t.id, t.user_id
      FROM password_reset_tokens t
      JOIN users u ON u.id = t.user_id
      WHERE t.token_hash=? AND t.used_at IS NULL AND t.expires_at > UTC_TIMESTAMP()
      LIMIT 1
    ");
    $stmt->execute([$tokenHash]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) Http::json(['error' => 'Reset link is invalid or expired'], 400);

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $pdo->beginTransaction();
    $pdo->prepare("UPDATE users SET password_hash=? WHERE id=?")->execute([$hash, (int)$row['user_id']]);
    $pdo->prepare("UPDATE password_reset_tokens SET used_at=UTC_TIMESTAMP() WHERE id=?")->execute([(int)$row['id']]);
    $pdo->prepare("DELETE FROM password_reset_tokens WHERE user_id=? AND id<>?")->execute([(int)$row['user_id'], (int)$row['id']]);
    $pdo->commit();

    return ['ok' => true, 'message' => 'Password updated. You can sign in now.'];
  }

  public static function logout(): void {
    $_SESSION = [];
    if (session_status() === PHP_SESSION_ACTIVE) {
      session_destroy();
    }
  }

  public static function updateMe(int $id, array $patch): array {
    $allowed = [
      'name' => 'name',
      'bio' => 'bio',
      'skills' => 'skills_json',
      'education' => 'education_json',
      'experience' => 'experience_json',
      'publications' => 'publications_json',
      'certificates' => 'certificates_json',
      'departments' => 'departments_json',
      'catalogue' => 'catalogue_json',
      'orgType' => 'org_type',
      'profileCompleted' => 'profile_completed',
      'verifiedBadge' => 'verified_badge',
      'accountStatus' => 'account_status',
      'avatar_url' => 'avatar_url',
    ];

    $sets = [];
    $vals = [];
    foreach ($allowed as $k => $col) {
      if (!array_key_exists($k, $patch)) continue;
      $val = $patch[$k];
      if (str_ends_with($col, '_json')) {
        if (!is_array($val)) continue;
        $sets[] = "{$col}=?";
        $vals[] = json_encode($val);
      } elseif ($col === 'profile_completed' || $col === 'verified_badge') {
        $sets[] = "{$col}=?";
        $vals[] = $val ? 1 : 0;
      } else {
        $sets[] = "{$col}=?";
        $vals[] = is_string($val) ? $val : (string)$val;
      }
    }

    if (count($sets) > 0) {
      $pdo = Db::pdo();
      $sql = "UPDATE users SET " . implode(',', $sets) . " WHERE id=?";
      $vals[] = $id;
      $stmt = $pdo->prepare($sql);
      $stmt->execute($vals);
    }

    $pdo = Db::pdo();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id=?");
    $stmt->execute([$id]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    return self::publicUser($u ?: []);
  }

  public static function appendCertificate(int $id, array $cert): array {
    $pdo = Db::pdo();
    $stmt = $pdo->prepare("SELECT certificates_json FROM users WHERE id=?");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $certs = [];
    if ($row && isset($row['certificates_json'])) {
      $decoded = json_decode((string)$row['certificates_json'], true);
      if (is_array($decoded)) $certs = $decoded;
    }
    $certs[] = $cert;
    $pdo->prepare("UPDATE users SET certificates_json=? WHERE id=?")->execute([json_encode($certs), $id]);
    return self::updateMe($id, []);
  }

  public static function updateCertificateStatus(int $id, int $index, string $status): array {
    $pdo = Db::pdo();
    $stmt = $pdo->prepare("SELECT certificates_json FROM users WHERE id=?");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $certs = [];
    if ($row && isset($row['certificates_json'])) {
      $decoded = json_decode((string)$row['certificates_json'], true);
      if (is_array($decoded)) $certs = $decoded;
    }
    if (!isset($certs[$index])) {
      Http::json(['error' => 'certificate not found'], 404);
    }
    $certs[$index]['status'] = $status;
    $pdo->prepare("UPDATE users SET certificates_json=? WHERE id=?")->execute([json_encode($certs), $id]);
    return self::updateMe($id, []);
  }

  /**
   * Ensure there is a conversation row for ordered pair.
   * Returns conversation_id (numeric).
   */
  public static function ensureConversation(int $a, int $b): int {
    $u1 = min($a, $b);
    $u2 = max($a, $b);
    $pdo = Db::pdo();
    $id = self::getConversationId($a, $b);
    if ($id) return (int)$id;
    $pdo->prepare("INSERT INTO conversations (user1_id, user2_id, created_at) VALUES (?,?, NOW())")->execute([$u1, $u2]);
    return (int)$pdo->lastInsertId();
  }

  private static function passwordResetUrl(string $token): string {
    $base = Env::get('RESET_PASSWORD_BASE_URL', '');
    if (!$base) {
      $origin = explode(',', (string)Env::get('APP_ORIGIN', 'http://localhost:5173'))[0] ?? 'http://localhost:5173';
      $base = trim($origin);
    }
    return rtrim($base, '/') . '/reset-password?token=' . rawurlencode($token);
  }

  private static function sendPasswordResetMail(string $email, string $name, string $resetUrl): void {
    $from = Env::get('MAIL_FROM', '');
    if (!$from) return;

    $subject = 'Reset your Link & Learn password';
    $greeting = trim($name) !== '' ? "Hi {$name}," : 'Hi,';
    $body = "{$greeting}\n\nUse this link to reset your password:\n{$resetUrl}\n\nThis link expires in 1 hour.\n\nIf you did not request this, you can ignore this email.";
    $headers = "From: {$from}\r\nContent-Type: text/plain; charset=UTF-8\r\n";
    @mail($email, $subject, $body, $headers);
  }

  public static function getConversationId(int $a, int $b): ?int {
    $u1 = min($a, $b);
    $u2 = max($a, $b);
    $pdo = Db::pdo();
    $stmt = $pdo->prepare("SELECT id FROM conversations WHERE user1_id=? AND user2_id=?");
    $stmt->execute([$u1, $u2]);
    $id = $stmt->fetchColumn();
    return $id ? (int)$id : null;
  }

  public static function areConnected(int $u1, int $u2): bool {
    $min = min($u1, $u2);
    $max = max($u1, $u2);
    $pdo = Db::pdo();
    $stmt = $pdo->prepare("SELECT status FROM user_connections WHERE user_id_1=? AND user_id_2=?");
    $stmt->execute([$min, $max]);
    return $stmt->fetchColumn() === 'accepted';
  }

  public static function getConnectionStatus(int $me, int $other): ?string {
    $u1 = min($me, $other);
    $u2 = max($me, $other);
    $pdo = Db::pdo();
    $requesterSelect = self::hasConnectionRequesterColumn() ? ', requester_user_id' : '';
    $stmt = $pdo->prepare("SELECT status, user_id_1{$requesterSelect} FROM user_connections WHERE user_id_1=? AND user_id_2=?");
    $stmt->execute([$u1, $u2]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) return null;
    
    if ($row['status'] === 'pending') {
      $requester = (int)($row['requester_user_id'] ?? $row['user_id_1']);
      return $requester === $me ? 'sent_pending' : 'received_pending';
    }
    return $row['status'];
  }

  public static function requestConnection(int $me, int $other): void {
    if ($me === $other) Http::json(['error' => 'Cannot connect to self'], 400);
    $u1 = min($me, $other);
    $u2 = max($me, $other);
    $pdo = Db::pdo();

    $target = $pdo->prepare("SELECT 1 FROM users WHERE id=? AND account_status='active'");
    $target->execute([$other]);
    if (!$target->fetchColumn()) Http::json(['error' => 'User not found or inactive'], 404);

    $existing = $pdo->prepare("SELECT status FROM user_connections WHERE user_id_1=? AND user_id_2=?");
    $existing->execute([$u1, $u2]);
    $status = $existing->fetchColumn();
    if ($status === 'accepted') return;

    if (self::hasConnectionRequesterColumn()) {
      $pdo->prepare("
        INSERT INTO user_connections (user_id_1, user_id_2, requester_user_id, status)
        VALUES (?,?,?, 'pending')
        ON DUPLICATE KEY UPDATE requester_user_id=VALUES(requester_user_id), status='pending'
      ")->execute([$u1, $u2, $me]);
      return;
    }

    $pdo->prepare("
      INSERT INTO user_connections (user_id_1, user_id_2, status)
      VALUES (?,?, 'pending')
      ON DUPLICATE KEY UPDATE status='pending'
    ")->execute([$u1, $u2]);
  }

  public static function respondConnection(int $me, int $other, string $status): void {
    if (!in_array($status, ['accepted', 'rejected'], true)) Http::json(['error' => 'Invalid status'], 400);
    $u1 = min($me, $other);
    $u2 = max($me, $other);
    $pdo = Db::pdo();
    $pdo->prepare("UPDATE user_connections SET status=? WHERE user_id_1=? AND user_id_2=?")
        ->execute([$status, $u1, $u2]);
  }

  public static function removeConnection(int $me, int $other): void {
    $u1 = min($me, $other);
    $u2 = max($me, $other);
    $pdo = Db::pdo();
    $pdo->prepare("DELETE FROM user_connections WHERE user_id_1=? AND user_id_2=?")
        ->execute([$u1, $u2]);
  }

  private static function hasConnectionRequesterColumn(): bool {
    static $hasColumn = null;
    if ($hasColumn !== null) return $hasColumn;

    $pdo = Db::pdo();
    $stmt = $pdo->prepare("
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'user_connections'
        AND COLUMN_NAME = 'requester_user_id'
      LIMIT 1
    ");
    $stmt->execute();
    $hasColumn = (bool)$stmt->fetchColumn();
    return $hasColumn;
  }


  private static function publicUser(array $u): array {
    $json = function($v): array {
      if ($v === null) return [];
      if (is_array($v)) return $v;
      $d = json_decode((string)$v, true);
      return is_array($d) ? $d : [];
    };
    return [
      'id' => (string)($u['id'] ?? ''),
      'uid' => (string)($u['id'] ?? ''),
      'email' => (string)($u['email'] ?? ''),
      'name' => (string)($u['name'] ?? ''),
      'avatar' => (string)($u['avatar_url'] ?? ''),
      'role' => (string)($u['role'] ?? 'student'),
      'roleSelected' => (bool)($u['role_selected'] ?? true),
      'loginType' => (string)($u['login_type'] ?? 'personal'),
      'accountStatus' => (string)($u['account_status'] ?? 'active'),
      'profileCompleted' => (bool)($u['profile_completed'] ?? false),
      'bio' => (string)($u['bio'] ?? ''),
      'skills' => $json($u['skills_json'] ?? null),
      'education' => $json($u['education_json'] ?? null),
      'experience' => $json($u['experience_json'] ?? null),
      'publications' => $json($u['publications_json'] ?? null),
      'certificates' => $json($u['certificates_json'] ?? null),
      'departments' => $json($u['departments_json'] ?? null),
      'catalogue' => $json($u['catalogue_json'] ?? null),
      'orgType' => (string)($u['org_type'] ?? ''),
      'verifiedBadge' => (bool)($u['verified_badge'] ?? false),
    ];
  }
}

