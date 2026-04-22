# XAMPP Setup Guide

## 1. Set Apache Document Root to backend/public/

Open `C:\xampp\apache\conf\httpd.conf` and find these two lines:

```
DocumentRoot "C:/xampp/htdocs"
<Directory "C:/xampp/htdocs">
```

Change BOTH to point to your project's backend/public folder:

```
DocumentRoot "C:/path/to/link-and-learn-complete/backend/public"
<Directory "C:/path/to/link-and-learn-complete/backend/public">
    AllowOverride All
    Require all granted
</Directory>
```

## 2. Enable mod_rewrite

In the same `httpd.conf`, make sure this line is NOT commented out (no # at start):

```
LoadModule rewrite_module modules/mod_rewrite.so
```

## 3. Restart Apache in XAMPP Control Panel

## 4. Check which port Apache is running on

- Default XAMPP port = **80** → vite.config.js proxy target is already set to `http://localhost:80`
- If you changed it to 8080 → update `vite.config.js` proxy target to `http://localhost:8080`

## 5. Set up the database

- Open phpMyAdmin: http://localhost/phpmyadmin
- Create a new database called `linklearn`
- Import `backend/sql/001_init.sql` into it
- Then import the remaining numbered files in order (`002_connections.sql`, `003_notifications.sql`, etc., through `007_requirement_quotes.sql`)

## 6. Start the frontend

```bash
npm install
npm run dev
```
