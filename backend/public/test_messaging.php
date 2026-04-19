<?php
require_once __DIR__ . '/../src/bootstrap.php';
use LinkLearn\Auth;
use LinkLearn\Db;

$meId = 2; // Chendur Manogaran
$otherId = 5; // Chendur

echo "Testing Messaging between $meId and $otherId\n";

// 1. Check connection
$connected = Auth::areConnected($meId, $otherId);
echo "Connected: " . ($connected ? "YES" : "NO") . "\n";

if (!$connected) {
    echo "Attempting to force connect for test...\n";
    $min = min($meId, $otherId);
    $max = max($meId, $otherId);
    $pdo = Db::pdo();
    $pdo->prepare("INSERT IGNORE INTO user_connections (user_id_1, user_id_2, initiator_id, status) VALUES (?,?,?,'accepted')")
        ->execute([$min, $max, $meId]);
    $pdo->prepare("UPDATE user_connections SET status='accepted' WHERE user_id_1=? AND user_id_2=?")->execute([$min, $max]);
}

// 2. Test GET messages
$path = "/api/conversations/$otherId/messages";
// Simulate GET
$convId = Auth::ensureConversation($meId, $otherId);
echo "Conversation ID: $convId\n";

$pdo = Db::pdo();
$st = $pdo->prepare("SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC");
$st->execute([$convId]);
$rows = $st->fetchAll(PDO::FETCH_ASSOC);
echo "Found " . count($rows) . " messages\n";

// 3. Test POST message
$text = "Test message at " . date('H:i:s');
$connected = Auth::areConnected($meId, $otherId);
if ($connected) {
    $pdo->prepare("INSERT INTO messages (conversation_id, sender_id, text) VALUES (?,?,?)")
        ->execute([$convId, $meId, $text]);
    echo "Message sent successfully\n";
} else {
    echo "FAILED: Still not connected\n";
}
