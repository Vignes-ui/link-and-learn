# Production Deployment

This app is easiest to run in production on a standard Apache + PHP + MySQL host.

Recommended target:

- PHP 8.1+
- MySQL 8+ or MariaDB 10+
- Apache with `mod_rewrite`
- one domain for both frontend and backend

Using one domain is the safest option because login uses PHP sessions and uploaded files are served directly from the same app.

## 1. Prepare the database

1. Create a MySQL database.
2. Import `backend/sql/001_init.sql`.

## 2. Configure backend environment

Copy `backend/.env.example` to `backend/.env` and set real values:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=linklearn
DB_USER=your_db_user
DB_PASS=your_db_password

APP_ORIGIN=https://your-domain.com
SESSION_NAME=linklearn_session
SESSION_SAMESITE=Lax
SESSION_SECURE=1
SESSION_DOMAIN=

UPLOAD_BASE_URL=/uploads
```

Notes:

- If you deploy frontend and backend on the same domain, keep `SESSION_SAMESITE=Lax`.
- If you intentionally split frontend and backend across different domains, set:
  - `APP_ORIGIN=https://your-frontend-domain.com`
  - `SESSION_SAMESITE=None`
  - `SESSION_SECURE=1`
- `APP_ORIGIN` also accepts a comma-separated list if you need multiple allowed origins.

## 3. Build the production frontend

From the repo root:

```bash
npm install
npm run build:production
```

This copies the Vite build output into `backend/public/`.

## 4. Upload the app to your server

Upload these production files:

- `backend/public/`
- `backend/src/`
- `backend/uploads/` if you already have media to keep
- `backend/.env`

Your Apache document root should point to:

```text
.../backend/public
```

## 5. Apache requirements

Make sure:

- `mod_rewrite` is enabled
- `AllowOverride All` is enabled for the document root
- the document root points at `backend/public`

The included `.htaccess` already routes requests into the PHP app.

## 6. Verify production

After deploy, check:

1. `https://your-domain.com/api/health` returns `{"ok":true}`
2. `https://your-domain.com/` loads the frontend
3. signup/login works
4. file uploads work
5. refreshing a frontend route like `/feed` or `/profile` still loads correctly

## Separate frontend/backend deployment

If you want:

- frontend on Vercel or Netlify
- backend on a PHP host

then build the frontend with:

```env
VITE_API_BASE=https://your-api-domain.com
```

and set the backend env for cross-site cookies:

```env
APP_ORIGIN=https://your-frontend-domain.com
SESSION_SAMESITE=None
SESSION_SECURE=1
```

This works, but same-domain deployment is simpler and more reliable for this codebase.
