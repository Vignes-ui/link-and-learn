<?php
require_once __DIR__ . '/../src/bootstrap.php';
use LinkLearn\Db;
try {
    $pdo = Db::pdo();
    $stmt = $pdo->query("DESCRIBE notifications");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
