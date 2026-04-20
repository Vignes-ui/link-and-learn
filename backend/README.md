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
   - `backend/sql/006_push_notifications.sql`
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
- Production push notifications use OneSignal when `ONESIGNAL_APP_ID` and `ONESIGNAL_REST_API_KEY` are set in `backend/.env`. If either value is missing, notification records and in-app/browser fallback still work.
- OneSignal Web Push must be configured for the same public site origin as `APP_ORIGIN`. The required service worker is served from `/push/onesignal/OneSignalSDKWorker.js`.

