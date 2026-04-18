<?php
declare(strict_types=1);

namespace LinkLearn;

final class Transform {
  public static function article(array $row): array {
    return [
      'id' => (string)$row['id'],
      'uid' => (string)$row['user_id'],
      'authorName' => $row['author_name'],
      'authorRole' => $row['author_role'],
      'title' => $row['title'],
      'content' => $row['content'],
      'category' => $row['category'],
      'tags' => self::jsonArr($row['tags_json'] ?? null),
      'status' => $row['status'],
      'aiScore' => $row['ai_score'],
      'aiCategory' => $row['ai_category'],
      'adminNote' => $row['admin_note'] ?? '',
      'createdAt' => gmdate('c', strtotime($row['created_at'])),
      'updatedAt' => gmdate('c', strtotime($row['updated_at'])),
    ];
  }

  public static function event(array $row): array {
    return [
      'id' => (string)$row['id'],
      'uid' => (string)$row['user_id'],
      'organizerName' => $row['organizer_name'],
      'title' => $row['title'],
      'description' => $row['description'],
      'category' => $row['category'],
      'location' => $row['location'],
      'dateTime' => $row['date_time'] ? gmdate('c', strtotime($row['date_time'])) : null,
      'capacity' => (int)$row['capacity'],
      'registeredCount' => (int)$row['registered_count'],
      'status' => $row['status'],
      'createdAt' => gmdate('c', strtotime($row['created_at'])),
    ];
  }

  public static function vacancy(array $row): array {
    return [
      'id' => (string)$row['id'],
      'uid' => (string)$row['user_id'],
      'institutionName' => $row['institution_name'],
      'role' => $row['role'],
      'roleType' => $row['role_type'],
      'department' => $row['department'],
      'eligibility' => $row['eligibility'],
      'description' => $row['description'],
      'deadline' => $row['deadline'],
      'status' => $row['status'],
      'createdAt' => gmdate('c', strtotime($row['created_at'])),
    ];
  }

  public static function requirement(array $row): array {
    return [
      'id' => (string)$row['id'],
      'uid' => (string)$row['user_id'],
      'institutionName' => $row['institution_name'],
      'itemType' => $row['item_type'],
      'description' => $row['description'],
      'quantity' => $row['quantity'],
      'budgetMin' => $row['budget_min'],
      'budgetMax' => $row['budget_max'],
      'deadline' => $row['deadline'],
      'location' => $row['location'],
      'status' => $row['status'],
      'createdAt' => gmdate('c', strtotime($row['created_at'])),
    ];
  }

  public static function adminUser(array $row): array {
    $certs = self::jsonArr($row['certificatesJson'] ?? null);
    return [
      'id' => (string)$row['id'],
      'uid' => (string)$row['id'],
      'email' => $row['email'],
      'name' => $row['name'],
      'role' => $row['role'],
      'loginType' => $row['loginType'],
      'accountStatus' => $row['accountStatus'],
      'profileCompleted' => (bool)$row['profileCompleted'],
      'avatar' => $row['avatar'] ?? '',
      'verifiedBadge' => (bool)$row['verifiedBadge'],
      'certificates' => $certs,
      'createdAt' => isset($row['createdAt']) ? gmdate('c', strtotime($row['createdAt'])) : null,
      'updatedAt' => isset($row['updatedAt']) ? gmdate('c', strtotime($row['updatedAt'])) : null,
    ];
  }

  private static function jsonArr($val): array {
    if ($val === null) return [];
    if (is_array($val)) return $val;
    $s = (string)$val;
    if ($s === '') return [];
    $decoded = json_decode($s, true);
    return is_array($decoded) ? $decoded : [];
  }
}

