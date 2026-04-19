<?php
namespace LinkLearn;

class Notification {
    public static function send(int $userId, ?int $fromUserId, string $type, string $message, ?int $relatedId = null): void {
        $pdo = Db::pdo();
        $stmt = $pdo->prepare("INSERT INTO notifications (user_id, from_user_id, type, message, related_id) VALUES (?,?,?,?,?)");
        $stmt->execute([$userId, $fromUserId, $type, $message, $relatedId]);
    }

    public static function getForUser(int $userId, int $limit = 50): array {
        $pdo = Db::pdo();
        $stmt = $pdo->prepare("
            SELECT n.*, u.name as from_name, u.avatar_url as from_avatar 
            FROM notifications n
            LEFT JOIN users u ON u.id = n.from_user_id
            WHERE n.user_id = ? 
            ORDER BY n.created_at DESC 
            LIMIT ?
        ");
        $stmt->bindValue(1, $userId, \PDO::PARAM_INT);
        $stmt->bindValue(2, $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function markAsRead(int $userId, int $notifId): void {
        $pdo = Db::pdo();
        $pdo->prepare("UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?")
            ->execute([$notifId, $userId]);
    }

    public static function markAllAsRead(int $userId): void {
        $pdo = Db::pdo();
        $pdo->prepare("UPDATE notifications SET is_read=1 WHERE user_id=?")
            ->execute([$userId]);
    }
}
