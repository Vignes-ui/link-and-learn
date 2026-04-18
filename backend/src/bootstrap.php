<?php
declare(strict_types=1);

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

