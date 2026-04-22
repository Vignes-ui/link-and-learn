# Link & Learn

This project ships with:

- a React + Vite frontend in the repo root
- a PHP + MySQL backend in `backend/`

For production, the recommended setup is to build the frontend and copy it into `backend/public/` so Apache serves:

- the SPA from `index.html`
- the PHP API from `/api/...`
- uploaded files from `/uploads/...`

## Local development

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
php -S localhost:8080 -t backend/public
```

Import `backend/sql/001_init.sql` into a MySQL or MariaDB database and copy `backend/.env.example` to `backend/.env`.

## Production build

```bash
npm run build:production
```

That command builds the frontend and copies the generated files into `backend/public/` without overwriting `index.php` or `.htaccess`.

See `DEPLOY.md` for the full production deployment checklist.
