# Free Demo Deployment

This project can be deployed for a demo/submission without paid hosting by using one free PHP + MySQL host. The recommended free path is same-domain hosting because it avoids cross-site PHP session cookie issues.

## Recommended Free Stack

- Hosting: InfinityFree, x10Hosting, or another free host with PHP 8+ and MySQL/MariaDB.
- Frontend: bundled into the same host from the Vite `dist` build.
- Backend: PHP API served from `/api`.
- Database: free MySQL database from the same host.
- Push: OneSignal free web push.
- Domain: free hosting subdomain.

## Create The Upload Package

Run this from the repo root:

```powershell
npm run package:free-hosting
```

This creates:

```text
free-hosting-package/
  htdocs/             Upload this folder's contents to the hosting web root
  sql-migrations/     Import these SQL files in phpMyAdmin
  backend.env.example Copy values from this into htdocs/.env
  README.txt
```

For InfinityFree, upload the contents of:

```text
free-hosting-package/htdocs/
```

into the hosting account's:

```text
htdocs/
```

## Database Import Order

In the free host's phpMyAdmin, import:

```text
001_init.sql
002_connections.sql
003_notifications.sql
004_ads.sql
005_institution_endorsements_groups.sql
006_push_notifications.sql
```

Use the copies inside:

```text
free-hosting-package/sql-migrations/
```

## Server Env File

Create this file in the hosting web root:

```text
htdocs/.env
```

Example:

```env
DB_HOST=your_free_host_mysql_hostname
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASS=your_database_password

APP_ORIGIN=https://your-free-subdomain.example.com
SESSION_NAME=linklearn_session

UPLOAD_BASE_URL=/uploads

ONESIGNAL_APP_ID=
ONESIGNAL_REST_API_KEY=
PUSH_DEFAULT_TITLE=Link & Learn
```

For demo submission, push notifications still work in-app if OneSignal keys are blank. To test real push, create a free OneSignal Web Push app and fill both OneSignal values.

## URLs To Test

After upload:

```text
https://your-free-domain/api/health
https://your-free-domain/api/push/config
https://your-free-domain/admin
```

Expected health response:

```json
{"ok":true}
```

Default admin:

```text
Email: admin@linklearn.local
Password: admin123
```

## Free Hosting Notes

- Free hosts can be slow and may sleep, throttle, or suspend inactive accounts.
- Use this for demo/submission, not real production traffic.
- Keep everything on one free domain for the simplest login behavior.
- If uploads fail, make sure `htdocs/uploads/` is writable from the hosting file manager.
- If `/admin` gives a 404, confirm `.htaccess` was uploaded and Apache rewrite support is enabled on the host.
