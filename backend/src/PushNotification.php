<?php
declare(strict_types=1);

namespace LinkLearn;

final class PushNotification {
  public static function isConfigured(): bool {
    return self::appId() !== '' && self::apiKey() !== '';
  }

  public static function sendToUser(int $userId, array $notification): void {
    if (!self::isConfigured()) return;

    $title = self::titleFor($notification);
    $body = trim((string)($notification['message'] ?? ''));
    if ($body === '') return;

    $payload = [
      'app_id' => self::appId(),
      'target_channel' => 'push',
      'include_aliases' => [
        'external_id' => [(string)$userId],
      ],
      'headings' => ['en' => $title],
      'contents' => ['en' => $body],
      'url' => self::notificationUrl($notification),
      'data' => [
        'notificationId' => (string)($notification['id'] ?? ''),
        'type' => (string)($notification['type'] ?? ''),
        'relatedId' => (string)($notification['related_id'] ?? ''),
      ],
    ];

    $response = self::postJson('https://api.onesignal.com/notifications?c=push', $payload);
    self::recordDelivery($userId, $notification, $response);
  }

  private static function appId(): string {
    return trim((string)Env::get('ONESIGNAL_APP_ID', ''));
  }

  private static function apiKey(): string {
    return trim((string)Env::get('ONESIGNAL_REST_API_KEY', ''));
  }

  private static function titleFor(array $notification): string {
    $fromName = trim((string)($notification['from_name'] ?? ''));
    if ($fromName !== '') return $fromName;
    return trim((string)Env::get('PUSH_DEFAULT_TITLE', 'Link & Learn')) ?: 'Link & Learn';
  }

  private static function notificationUrl(array $notification): string {
    $base = rtrim((string)Env::get('APP_ORIGIN', ''), '/');
    if ($base === '') return '/notifications';
    return $base . '/notifications';
  }

  private static function postJson(string $url, array $payload): array {
    $body = json_encode($payload, JSON_UNESCAPED_SLASHES);
    if ($body === false) {
      return ['ok' => false, 'status' => 0, 'body' => 'Unable to encode push payload'];
    }

    if (function_exists('curl_init')) {
      $ch = curl_init($url);
      curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
          'Authorization: Key ' . self::apiKey(),
          'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
      ]);
      $raw = curl_exec($ch);
      $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
      $error = curl_error($ch);
      curl_close($ch);

      if ($raw === false) {
        return ['ok' => false, 'status' => $status, 'body' => $error ?: 'cURL request failed'];
      }
      return ['ok' => $status >= 200 && $status < 300, 'status' => $status, 'body' => (string)$raw];
    }

    $context = stream_context_create([
      'http' => [
        'method' => 'POST',
        'header' => implode("\r\n", [
          'Authorization: Key ' . self::apiKey(),
          'Content-Type: application/json',
        ]),
        'content' => $body,
        'timeout' => 5,
        'ignore_errors' => true,
      ],
    ]);
    $raw = @file_get_contents($url, false, $context);
    $status = self::statusFromHeaders($http_response_header ?? []);
    if ($raw === false) {
      return ['ok' => false, 'status' => $status, 'body' => 'HTTP request failed'];
    }
    return ['ok' => $status >= 200 && $status < 300, 'status' => $status, 'body' => (string)$raw];
  }

  private static function statusFromHeaders(array $headers): int {
    foreach ($headers as $header) {
      if (preg_match('#^HTTP/\S+\s+(\d{3})#', (string)$header, $m)) {
        return (int)$m[1];
      }
    }
    return 0;
  }

  private static function recordDelivery(int $userId, array $notification, array $response): void {
    try {
      $pdo = Db::pdo();
      $stmt = $pdo->prepare("
        INSERT INTO push_notification_deliveries
          (notification_id, user_id, provider, provider_message_id, status, response_code, response_body)
        VALUES (?, ?, 'onesignal', ?, ?, ?, ?)
      ");
      $decoded = json_decode((string)($response['body'] ?? ''), true);
      $providerId = is_array($decoded) ? (string)($decoded['id'] ?? '') : '';
      $status = !empty($response['ok']) ? 'sent' : 'failed';
      $stmt->execute([
        (int)($notification['id'] ?? 0),
        $userId,
        $providerId !== '' ? $providerId : null,
        $status,
        (int)($response['status'] ?? 0),
        substr((string)($response['body'] ?? ''), 0, 2000),
      ]);
    } catch (\Throwable) {
      error_log('LinkLearn push delivery log failed');
    }
  }
}
