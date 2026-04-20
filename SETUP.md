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
- Import the SQL files in this exact order:

```
backend/sql/001_init.sql
backend/sql/002_connections.sql
backend/sql/003_notifications.sql
backend/sql/004_ads.sql
backend/sql/005_institution_endorsements_groups.sql
backend/sql/006_push_notifications.sql
```

These scripts are written with `CREATE TABLE IF NOT EXISTS`, so they are safe to rerun when a local database is missing a later feature table. The seeded admin account is:

```
Email: admin@linklearn.local
Password: admin123
```

## 6. Deployment checklist

- Confirm all SQL files above have been imported on the target database.
- Confirm `vite.config.js` points `/api` and `/uploads` to the PHP server port.
- Confirm `backend/uploads/` is writable by the PHP process.
- For real push notifications, create a OneSignal Web Push app for the deployed site domain and set `ONESIGNAL_APP_ID` plus `ONESIGNAL_REST_API_KEY` in `backend/.env`.
- Confirm `/push/onesignal/OneSignalSDKWorker.js` is publicly accessible from the frontend origin over HTTPS.
- Sign in as the seeded admin and open `/admin`; the overview, users, articles, and ads calls should all return without server errors.

## 7. Start the frontend

```bash
npm install
npm run dev
```
