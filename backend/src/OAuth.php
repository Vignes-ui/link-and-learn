<?php
declare(strict_types=1);

namespace LinkLearn;

use PDO;

final class OAuth {
  private const PROVIDERS = ['google', 'microsoft', 'facebook'];
  private const INSTITUTIONAL_ROLES = ['institution', 'govt_body', 'ngo', 'vendor', 'advertiser'];
  private const ALLOWED_ROLES = ['student', 'researcher', 'institution', 'govt_body', 'ngo', 'vendor', 'advertiser'];

  public static function start(string $provider): never {
    $provider = self::normalizeProvider($provider);
    self::ensureConfigured($provider);

    $state = bin2hex(random_bytes(24));
    $_SESSION['oauth_state'] = $state;
    $_SESSION['oauth_provider'] = $provider;

    $params = [
      'client_id' => self::clientId($provider),
      'redirect_uri' => self::redirectUri($provider),
      'response_type' => 'code',
      'state' => $state,
    ];

    if ($provider === 'google') {
      $params['scope'] = 'openid email profile';
      $params['prompt'] = 'select_account';
      $url = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
    } elseif ($provider === 'microsoft') {
      $tenant = Env::get('MICROSOFT_TENANT', 'common') ?: 'common';
      $params['scope'] = 'openid email profile';
      $url = "https://login.microsoftonline.com/{$tenant}/oauth2/v2.0/authorize?" . http_build_query($params);
    } else {
      $params['scope'] = 'email,public_profile';
      $url = 'https://www.facebook.com/v19.0/dialog/oauth?' . http_build_query($params);
    }

    header('Location: ' . $url, true, 302);
    exit;
  }

  public static function callback(string $provider): never {
    $provider = self::normalizeProvider($provider);
    $expectedState = (string)($_SESSION['oauth_state'] ?? '');
    $expectedProvider = (string)($_SESSION['oauth_provider'] ?? '');
    unset($_SESSION['oauth_state'], $_SESSION['oauth_provider']);

    if (isset($_GET['error'])) {
      self::redirectFrontend('/', ['oauth_error' => 'OAuth sign in was cancelled']);
    }
    $state = (string)($_GET['state'] ?? '');
    $code = (string)($_GET['code'] ?? '');
    if ($state === '' || !hash_equals($expectedState, $state) || $expectedProvider !== $provider) {
      self::redirectFrontend('/', ['oauth_error' => 'OAuth verification failed']);
    }
    if ($code === '') {
      self::redirectFrontend('/', ['oauth_error' => 'OAuth authorization code missing']);
    }

    try {
      $token = self::exchangeCode($provider, $code);
      $profile = self::fetchProfile($provider, $token);
      $userId = self::upsertUser($provider, $profile);
      $_SESSION['user_id'] = $userId;

      $pdo = Db::pdo();
      $stmt = $pdo->prepare("SELECT account_status, role_selected FROM users WHERE id=?");
      $stmt->execute([$userId]);
      $user = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
      $status = (string)($user['account_status'] ?? 'active');
      if (in_array($status, ['pending', 'rejected', 'suspended'], true)) {
        Auth::logout();
        self::redirectFrontend('/', ['oauth_error' => self::statusMessage($status)]);
      }

      if ((int)($user['role_selected'] ?? 1) === 0) {
        self::redirectFrontend('/oauth-role');
      }
      self::redirectFrontend('/feed');
    } catch (\Throwable $e) {
      error_log('OAuth callback failed: ' . $e->getMessage());
      self::redirectFrontend('/', ['oauth_error' => 'OAuth sign in failed']);
    }
  }

  public static function completeRole(int $userId, string $role, string $name): array {
    if (!in_array($role, self::ALLOWED_ROLES, true)) {
      Http::json(['error' => 'invalid role'], 400);
    }

    $isInstitutional = in_array($role, self::INSTITUTIONAL_ROLES, true);
    $loginType = $isInstitutional ? 'institutional' : 'personal';
    $accountStatus = $isInstitutional ? 'pending' : 'active';
    $cleanName = trim($name);

    $pdo = Db::pdo();
    $stmt = $pdo->prepare("
      UPDATE users
      SET role=?, login_type=?, account_status=?, role_selected=1, name=CASE WHEN ? <> '' THEN ? ELSE name END
      WHERE id=? AND role_selected=0
    ");
    $stmt->execute([$role, $loginType, $accountStatus, $cleanName, $cleanName, $userId]);

    if ($isInstitutional) {
      Auth::logout();
      return [
        'loginAllowed' => false,
        'accountStatus' => $accountStatus,
        'message' => 'Institutional account created. Await admin approval before signing in.',
      ];
    }

    return [
      'loginAllowed' => true,
      'accountStatus' => $accountStatus,
      'user' => Auth::me(),
    ];
  }

  private static function normalizeProvider(string $provider): string {
    $provider = strtolower(trim($provider));
    if (!in_array($provider, self::PROVIDERS, true)) {
      Http::json(['error' => 'unsupported oauth provider'], 404);
    }
    return $provider;
  }

  private static function ensureConfigured(string $provider): void {
    if (self::clientId($provider) === '' || self::clientSecret($provider) === '') {
      Http::json(['error' => "{$provider} OAuth is not configured"], 500);
    }
  }

  private static function clientId(string $provider): string {
    return (string)Env::get(strtoupper($provider) . '_CLIENT_ID', '');
  }

  private static function clientSecret(string $provider): string {
    return (string)Env::get(strtoupper($provider) . '_CLIENT_SECRET', '');
  }

  private static function redirectUri(string $provider): string {
    $configured = Env::get(strtoupper($provider) . '_REDIRECT_URI', '');
    if ($configured) return $configured;
    $base = Env::get('API_BASE_URL', '');
    if (!$base) {
      $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
      $host = (string)($_SERVER['HTTP_HOST'] ?? 'localhost');
      $base = $scheme . '://' . $host;
    }
    return rtrim($base, '/') . "/api/auth/oauth/{$provider}/callback";
  }

  private static function exchangeCode(string $provider, string $code): array {
    $params = [
      'client_id' => self::clientId($provider),
      'client_secret' => self::clientSecret($provider),
      'redirect_uri' => self::redirectUri($provider),
      'code' => $code,
    ];

    if ($provider === 'google') {
      $params['grant_type'] = 'authorization_code';
      return self::postForm('https://oauth2.googleapis.com/token', $params);
    }

    if ($provider === 'microsoft') {
      $tenant = Env::get('MICROSOFT_TENANT', 'common') ?: 'common';
      $params['grant_type'] = 'authorization_code';
      return self::postForm("https://login.microsoftonline.com/{$tenant}/oauth2/v2.0/token", $params);
    }

    return self::getJson('https://graph.facebook.com/v19.0/oauth/access_token?' . http_build_query($params));
  }

  private static function fetchProfile(string $provider, array $token): array {
    $accessToken = (string)($token['access_token'] ?? '');
    if ($accessToken === '') {
      throw new \RuntimeException('OAuth access token missing');
    }

    if ($provider === 'google') {
      $profile = self::getJson('https://openidconnect.googleapis.com/v1/userinfo', $accessToken);
      return [
        'subject' => (string)($profile['sub'] ?? ''),
        'email' => (string)($profile['email'] ?? ''),
        'name' => (string)($profile['name'] ?? ''),
        'avatar' => (string)($profile['picture'] ?? ''),
      ];
    }

    if ($provider === 'microsoft') {
      $profile = self::getJson('https://graph.microsoft.com/oidc/userinfo', $accessToken);
      return [
        'subject' => (string)($profile['sub'] ?? ''),
        'email' => (string)($profile['email'] ?? ($profile['preferred_username'] ?? '')),
        'name' => (string)($profile['name'] ?? ''),
        'avatar' => '',
      ];
    }

    $profile = self::getJson('https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=' . rawurlencode($accessToken));
    return [
      'subject' => (string)($profile['id'] ?? ''),
      'email' => (string)($profile['email'] ?? ''),
      'name' => (string)($profile['name'] ?? ''),
      'avatar' => (string)($profile['picture']['data']['url'] ?? ''),
    ];
  }

  private static function upsertUser(string $provider, array $profile): int {
    $subject = trim((string)($profile['subject'] ?? ''));
    $email = strtolower(trim((string)($profile['email'] ?? '')));
    $name = trim((string)($profile['name'] ?? ''));
    $avatar = trim((string)($profile['avatar'] ?? ''));

    if ($subject === '' || $email === '') {
      throw new \RuntimeException('OAuth profile missing subject or email');
    }

    $pdo = Db::pdo();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE oauth_provider=? AND oauth_subject=? LIMIT 1");
    $stmt->execute([$provider, $subject]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($existing) {
      self::updateOAuthUser((int)$existing['id'], $provider, $subject, $name, $avatar);
      return (int)$existing['id'];
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email=? LIMIT 1");
    $stmt->execute([$email]);
    $byEmail = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($byEmail) {
      self::updateOAuthUser((int)$byEmail['id'], $provider, $subject, $name, $avatar);
      return (int)$byEmail['id'];
    }

    $displayName = $name !== '' ? $name : $email;
    $stmt = $pdo->prepare("
      INSERT INTO users (
        email, password_hash, name, avatar_url, role, login_type, account_status,
        profile_completed, role_selected, oauth_provider, oauth_subject, bio,
        skills_json, education_json, experience_json, publications_json,
        certificates_json, departments_json, catalogue_json, verified_badge
      )
      VALUES (?, NULL, ?, ?, 'student', 'personal', 'active', 0, 0, ?, ?, '', '[]','[]','[]','[]','[]','[]','[]',0)
    ");
    $stmt->execute([$email, $displayName, $avatar, $provider, $subject]);
    return (int)$pdo->lastInsertId();
  }

  private static function updateOAuthUser(int $userId, string $provider, string $subject, string $name, string $avatar): void {
    $pdo = Db::pdo();
    $stmt = $pdo->prepare("
      UPDATE users
      SET oauth_provider = COALESCE(oauth_provider, ?),
          oauth_subject = COALESCE(oauth_subject, ?),
          name = CASE WHEN name = '' AND ? <> '' THEN ? ELSE name END,
          avatar_url = CASE WHEN (avatar_url IS NULL OR avatar_url = '') AND ? <> '' THEN ? ELSE avatar_url END
      WHERE id=?
    ");
    $stmt->execute([$provider, $subject, $name, $name, $avatar, $avatar, $userId]);
  }

  private static function postForm(string $url, array $params): array {
    return self::requestJson($url, [
      'method' => 'POST',
      'header' => "Content-Type: application/x-www-form-urlencoded\r\nAccept: application/json\r\n",
      'content' => http_build_query($params),
    ]);
  }

  private static function getJson(string $url, string $bearerToken = ''): array {
    $headers = "Accept: application/json\r\n";
    if ($bearerToken !== '') {
      $headers .= 'Authorization: Bearer ' . $bearerToken . "\r\n";
    }
    return self::requestJson($url, ['method' => 'GET', 'header' => $headers]);
  }

  private static function requestJson(string $url, array $http): array {
    $context = stream_context_create([
      'http' => array_merge(['ignore_errors' => true, 'timeout' => 15], $http),
    ]);
    $raw = file_get_contents($url, false, $context);
    if ($raw === false) {
      throw new \RuntimeException('OAuth HTTP request failed');
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
      throw new \RuntimeException('OAuth response was not JSON');
    }
    if (isset($decoded['error'])) {
      $message = is_array($decoded['error'])
        ? (string)($decoded['error']['message'] ?? 'OAuth provider error')
        : (string)$decoded['error'];
      throw new \RuntimeException($message);
    }
    return $decoded;
  }

  private static function redirectFrontend(string $path, array $query = []): never {
    $origin = explode(',', (string)Env::get('APP_ORIGIN', ''))[0] ?? '';
    $base = trim($origin) !== '' ? rtrim(trim($origin), '/') : '';
    if ($base === '') {
      $base = '';
    }
    $url = $base . '/' . ltrim($path, '/');
    if ($query) {
      $url .= (str_contains($url, '?') ? '&' : '?') . http_build_query($query);
    }
    header('Location: ' . $url, true, 302);
    exit;
  }

  private static function statusMessage(string $status): string {
    return match ($status) {
      'pending' => 'Account pending admin approval',
      'rejected' => 'Account rejected',
      'suspended' => 'Account suspended',
      default => 'Account unavailable',
    };
  }
}
