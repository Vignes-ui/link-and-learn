<?php
require_once __DIR__ . '/../src/bootstrap.php';
use LinkLearn\Auth;
use LinkLearn\Db;
use LinkLearn\Notification;

function test($name, $fn) {
    try {
        $fn();
        echo "[PASS] $name\n";
    } catch (\Throwable $e) {
        echo "[FAIL] $name: " . $e->getMessage() . "\n";
    }
}

test("Database Connection", function() {
    $pdo = Db::pdo();
    $pdo->query("SELECT 1");
});

test("Connections Logic", function() {
    $pdo = Db::pdo();
    // Test areConnected
    $res = Auth::areConnected(1, 2);
    echo "   (Connection status 1-2: " . ($res ? "Connected" : "Not Connected") . ")\n";
});

test("Notification System", function() {
    // Try to send a test notification
    Notification::send(1, 2, 'test', 'triggered a test notification');
    $pdo = Db::pdo();
    $st = $pdo->prepare("SELECT id FROM notifications WHERE user_id=1 ORDER BY created_at DESC LIMIT 1");
    $st->execute();
    if (!$st->fetch()) throw new Exception("Notification not saved");
});

test("Messaging Integrity", function() {
    $pdo = Db::pdo();
    // Ensure conversations can be created
    $convId = Auth::ensureConversation(1, 2);
    if (!$convId) throw new Exception("Could not ensure conversation");
    echo "   (Conversation ID: $convId)\n";
});

test("Post Likes", function() {
    $pdo = Db::pdo();
    $st = $pdo->query("SELECT id FROM posts LIMIT 1");
    $post = $st->fetch();
    if ($post) {
        $postId = $post['id'];
        $pdo->prepare("INSERT IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)")->execute([$postId, 1]);
        $pdo->prepare("DELETE FROM post_likes WHERE post_id=? AND user_id=?")->execute([$postId, 1]);
    } else {
        echo "   (No posts to test likes)\n";
    }
});

echo "\n--- Backend Test Suite Complete ---\n";
