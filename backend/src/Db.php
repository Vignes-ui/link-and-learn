<?php
declare(strict_types=1);

namespace LinkLearn;

use PDO;
use PDOException;

final class Db {
  private static ?PDO $pdo = null;

  public static function pdo(): PDO {
    if (self::$pdo) return self::$pdo;
    $host = Env::get('DB_HOST', '127.0.0.1');
    $port = Env::get('DB_PORT', '3306');
    $db = Env::get('DB_NAME', 'linklearn');
    $user = Env::get('DB_USER', 'root');
    $pass = Env::get('DB_PASS', '');
    $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";
    try {
      $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      ]);
    } catch (PDOException $e) {
      Http::json(['error' => 'DB connection failed', 'detail' => $e->getMessage()], 500);
    }
    self::$pdo = $pdo;
    return $pdo;
  }
}

