<?php
declare(strict_types=1);

namespace LinkLearn;

final class Http {
  public static function cors(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = array_values(array_filter(array_map(
      static fn(string $value): string => rtrim(trim($value), '/'),
      explode(',', (string)Env::get('APP_ORIGIN', 'http://localhost:5173'))
    )));
    if ($origin && in_array(rtrim($origin, '/'), $allowed, true)) {
      header('Access-Control-Allow-Origin: ' . $origin);
      header('Vary: Origin');
    }
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET,POST,PATCH,DELETE,OPTIONS');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
      http_response_code(204);
      exit;
    }
  }

  public static function json(array $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
  }

  public static function jsonBody(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') return [];
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) return [];
    return $decoded;
  }

  public static function sendFile(string $path): never {
    $mime = mime_content_type($path) ?: 'application/octet-stream';
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
  }

  public static function uploadedOriginalName(string $field): string {
    return (string)($_FILES[$field]['name'] ?? '');
  }

  public static function handleUpload(string $field, string $subdir): string {
    if (!isset($_FILES[$field]) || !is_uploaded_file($_FILES[$field]['tmp_name'] ?? '')) {
      self::json(['error' => 'file required'], 400);
    }

    $root = realpath(__DIR__ . '/../public/uploads');
    if ($root === false) {
      $root = __DIR__ . '/../public/uploads';
      @mkdir($root, 0777, true);
    }
    $targetDir = rtrim($root, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . trim($subdir, '/\\');
    @mkdir($targetDir, 0777, true);

    $orig = (string)($_FILES[$field]['name'] ?? 'file');
    $ext = pathinfo($orig, PATHINFO_EXTENSION);
    $safeExt = preg_replace('/[^a-zA-Z0-9]/', '', (string)$ext);
    $base = bin2hex(random_bytes(12));
    $filename = $safeExt ? ($base . '.' . strtolower($safeExt)) : $base;

    $dest = $targetDir . DIRECTORY_SEPARATOR . $filename;
    if (!move_uploaded_file($_FILES[$field]['tmp_name'], $dest)) {
      self::json(['error' => 'upload failed'], 500);
    }

    $baseUrl = Env::get('UPLOAD_BASE_URL', '/uploads');
    $url = rtrim($baseUrl, '/') . '/' . trim($subdir, '/\\') . '/' . $filename;
    return $url;
  }
}

