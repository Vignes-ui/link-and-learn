<?php
require_once __DIR__ . '/../src/bootstrap.php';
use LinkLearn\Auth;
use LinkLearn\Db;
use LinkLearn\Notification;

try {
    $uid = 2; // Test user
    $meId = 1; // Admin
    
    $pdo = Db::pdo();
    $stmt = $pdo->prepare("SELECT id, name, email, role, avatar_url AS avatar, bio, skills_json AS skills, education_json AS education, experience_json AS experience, publications_json AS publications, certificates_json AS certificates FROM users WHERE id=?");
    $stmt->execute([$uid]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$u) throw new Exception("User not found");
    
    echo "Found user: " . $u['name'] . "\n";
    
    // Transform JSON fields
    $u['skills'] = json_decode($u['skills_json'] ?? '[]', true);
    $u['education'] = json_decode($u['education_json'] ?? '[]', true);
    $u['experience'] = json_decode($u['experience_json'] ?? '[]', true);
    $u['publications'] = json_decode($u['publications_json'] ?? '[]', true);
    $u['certificates'] = json_decode($u['certificates_json'] ?? '[]', true);
    
    echo "Transformed JSON fields\n";
    
    // Test Notification
    Notification::send($uid, $meId, 'profile_view', "viewed your profile");
    echo "Notification sent\n";
    
    echo "TEST PASSED\n";
} catch (\Throwable $e) {
    echo "TEST FAILED: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine() . "\n";
}
