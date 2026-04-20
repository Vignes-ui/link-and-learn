$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $scriptDir '..')
$dist = Join-Path $root 'dist'
$package = Join-Path $root 'free-hosting-package'
$htdocs = Join-Path $package 'htdocs'

Write-Host 'Building frontend for same-domain free hosting...'
Push-Location $root
try {
  $env:VITE_API_BASE = ''
  npm.cmd run build
  if ($LASTEXITCODE -ne 0) {
    throw "Frontend build failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

if (-not (Test-Path (Join-Path $dist 'index.html'))) {
  throw "Frontend build output not found: $dist"
}

if (Test-Path $package) {
  $resolvedPackage = Resolve-Path $package
  if (-not ($resolvedPackage.Path.StartsWith($root.Path))) {
    throw "Refusing to remove package outside workspace: $resolvedPackage"
  }
  Remove-Item -LiteralPath $resolvedPackage.Path -Recurse -Force
}

New-Item -ItemType Directory -Path $htdocs | Out-Null
New-Item -ItemType Directory -Path (Join-Path $htdocs 'api') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $htdocs 'uploads') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $package 'sql-migrations') | Out-Null

Copy-Item -Path (Join-Path $dist '*') -Destination $htdocs -Recurse -Force
Copy-Item -Path (Join-Path $root 'backend/public/index.php') -Destination (Join-Path $htdocs 'api/index.php') -Force
Copy-Item -Path (Join-Path $root 'backend/src') -Destination (Join-Path $htdocs 'src') -Recurse -Force
Copy-Item -Path (Join-Path $root 'backend/sql/*.sql') -Destination (Join-Path $package 'sql-migrations') -Force

if (Test-Path (Join-Path $root 'backend/uploads')) {
  Copy-Item -Path (Join-Path $root 'backend/uploads/*') -Destination (Join-Path $htdocs 'uploads') -Recurse -Force -ErrorAction SilentlyContinue
}

Copy-Item -Path (Join-Path $root 'deploy/free-hosting/root.htaccess') -Destination (Join-Path $htdocs '.htaccess') -Force
Copy-Item -Path (Join-Path $root 'deploy/free-hosting/protected.htaccess') -Destination (Join-Path $htdocs 'src/.htaccess') -Force
Copy-Item -Path (Join-Path $root 'deploy/free-hosting/uploads.htaccess') -Destination (Join-Path $htdocs 'uploads/.htaccess') -Force
Copy-Item -Path (Join-Path $root 'backend/.env.example') -Destination (Join-Path $package 'backend.env.example') -Force

$readme = @'
# Free Hosting Upload Package

Upload everything inside `htdocs/` to your free host web root.

For InfinityFree this is usually:

htdocs/

Import SQL files from `sql-migrations/` in this order:

001_init.sql
002_connections.sql
003_notifications.sql
004_ads.sql
005_institution_endorsements_groups.sql
006_push_notifications.sql

Create `.env` next to `api/`, `src/`, and `uploads/` inside the web root.
Use `backend.env.example` as the starting point.

After upload, test:

/api/health
/api/push/config
/admin
'@

Set-Content -Path (Join-Path $package 'README.txt') -Value $readme -Encoding UTF8

Write-Host "Free hosting package created: $package"
Write-Host "Upload folder: $htdocs"
