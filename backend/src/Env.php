<?php
declare(strict_types=1);

namespace LinkLearn;

final class Env {
  public static function load(string $path): void {
    if (!is_file($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) return;
    foreach ($lines as $line) {
      $line = trim($line);
      if ($line === '' || str_starts_with($line, '#')) continue;
      $pos = strpos($line, '=');
      if ($pos === false) continue;
      $key = trim(substr($line, 0, $pos));
      $val = trim(substr($line, $pos + 1));
      if ($key === '') continue;
      if ((str_starts_with($val, '"') && str_ends_with($val, '"')) || (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
        $val = substr($val, 1, -1);
      }
      if (getenv($key) === false) {
        putenv($key . '=' . $val);
        $_ENV[$key] = $val;
      }
    }
  }

  public static function get(string $key, ?string $default = null): ?string {
    $v = getenv($key);
    if ($v === false) return $default;
    return $v;
  }
}

