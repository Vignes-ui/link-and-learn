<?php
declare(strict_types=1);

namespace LinkLearn;

use PDO;

final class Auth {
  public static function startSession(): void {
    $name = Env::get('SESSION_NAME', 'linklearn_session') ?: 'linklearn_session';
    session_name($name);
    session_set_cookie_params([
      'httponly' => true,
      'samesite' => 'Lax',
      'secure' => false,
      'path' => '/',
    ]);
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

  public static function signup(string $email, string $password, string $role, string $name): void {
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
    $_SESSION['user_id'] = (int)$pdo->lastInsertId();
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
    if (($u['account_status'] ?? 'active') !== 'active') {
      Http::json(['error' => 'Account not active'], 403);
    }
    $_SESSION['user_id'] = (int)$u['id'];
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
    $stmt = $pdo->prepare("SELECT id FROM conversations WHERE user1_id=? AND user2_id=?");
    $stmt->execute([$u1, $u2]);
    $id = $stmt->fetchColumn();
    if ($id) return (int)$id;
    $pdo->prepare("INSERT INTO conversations (user1_id, user2_id, created_at) VALUES (?,?, NOW())")->execute([$u1, $u2]);
    return (int)$pdo->lastInsertId();
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

