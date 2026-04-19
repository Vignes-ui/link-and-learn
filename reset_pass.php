<?php
$pdo = new PDO('mysql:host=localhost;dbname=linklearn', 'root', '');
$pass = password_hash('Password123!', PASSWORD_DEFAULT);
$pdo->prepare('UPDATE users SET password_hash=? WHERE id=2')->execute([$pass]);
echo "Password reset for user 2\n";
