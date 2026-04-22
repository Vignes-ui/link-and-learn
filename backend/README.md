## Link & Learn Backend (PHP + MySQL)

### Requirements
- PHP 8.1+ (8.2+ recommended)
- MySQL 8 or MariaDB 10+

### Setup
1. Create a database (example: `linklearn`) and import:
   - `backend/sql/001_init.sql`
   - then import the remaining numbered files in order (`002_connections.sql`, `003_notifications.sql`, etc., through `007_requirement_quotes.sql`)
2. Copy env template:
   - `backend/.env.example` → `backend/.env`
3. Start the API server:

```bash
php -S localhost:8000 -t backend/public
```

### Notes
- Auth uses **PHP sessions (cookies)**.
- Uploaded files are stored in `backend/uploads/` and served from `/uploads/...`.

