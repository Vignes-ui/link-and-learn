## Link & Learn Backend (PHP + MySQL)

### Requirements
- PHP 8.1+ (8.2+ recommended)
- MySQL 8 or MariaDB 10+

### Setup
1. Create a database (example: `linklearn`) and import these files in order:
   - `backend/sql/001_init.sql`
   - `backend/sql/002_connections.sql`
   - `backend/sql/003_notifications.sql`
   - `backend/sql/004_ads.sql`
   - `backend/sql/005_institution_endorsements_groups.sql`
2. Copy env template:
   - `backend/.env.example` → `backend/.env`
3. Start the API server:

```bash
php -S localhost:8000 -t backend/public
```

### Notes
- Auth uses **PHP sessions (cookies)**.
- Uploaded files are stored in `backend/uploads/` and served from `/uploads/...`.
- Admin seed: `admin@linklearn.local` / `admin123`.
- Push notifications use the in-app/browser notification fallback in v1.0. OneSignal or another provider can be connected later without changing the notification table contract.

