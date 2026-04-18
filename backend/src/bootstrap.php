<?php
declare(strict_types=1);

// Global exception handler — catches any uncaught exception and returns proper
// JSON instead of letting PHP crash with a plain-text fatal error, which would
// reach the Vite proxy as an invalid HTTP response and surface as a 502.
set_exception_handler(function (\Throwable $e): void {
  if (!headers_sent()) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
  }
  echo json_encode([
    'error'  => 'Internal server error',
    'detail' => $e->getMessage(),
  ], JSON_UNESCAPED_SLASHES);
  exit;
});

// Global error handler — converts PHP errors (warnings, notices, fatal-level
// errors) into exceptions so the handler above can catch them.
set_error_handler(function (int $severity, string $message, string $file, int $line): bool {
  if (!(error_reporting() & $severity)) return false;
  throw new \ErrorException($message, 0, $severity, $file, $line);
});

// Simple autoloader (no composer)
spl_autoload_register(function(string $class) {
  $prefix = 'LinkLearn\\';
  if (!str_starts_with($class, $prefix)) return;
  $rel = substr($class, strlen($prefix));
  $path = __DIR__ . '/' . str_replace('\\', '/', $rel) . '.php';
  if (is_file($path)) require_once $path;
});

LinkLearn\Env::load(__DIR__ . '/../.env');
LinkLearn\Auth::startSession();

