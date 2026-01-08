# Deploy Static Script
# Usage: .\deploy_static.ps1

Write-Host ">>> Starting Full Static Build & Deploy..." -ForegroundColor Green

# 1. Build
cd frontend
Write-Host ">>> Building 45k pages locally (Targeting Localhost API)..." -ForegroundColor Cyan
$env:API_URL_OVERRIDE = "http://127.0.0.1:8000"
$env:NEXT_PUBLIC_GOOGLE_CLIENT_ID = "dummy-client-id-for-static-build"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Error "X Build Failed. Fix errors and try again."
    exit 1
}

Write-Host ">>> Build Complete (out/ folder ready)." -ForegroundColor Green
cd ..

# 2. Deploy to Branch
Write-Host ">>> Committing 'out' folder to 'static-deploy' branch..." -ForegroundColor Cyan

# Create/Switch to orphan branch to drop history (avoids LFS/DB bloat)
Write-Host ">>> Creating minimal orphan branch..." -ForegroundColor Cyan

# Create new orphan branch (clean start, no history)
git checkout --orphan temp-deploy-branch

# Unstage all files (keep working dir, but empty index)
git reset

# Add ONLY the static folder
git add frontend/out -f

# Commit
git commit -m "deploy: pure static site $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

# Force push to static-deploy remote branch
git push origin temp-deploy-branch:static-deploy --force

# Cleanup: go back to main and delete temp
git checkout main
git branch -D temp-deploy-branch

# Return to main
git checkout main

Write-Host ">>> DONE!" -ForegroundColor Green
Write-Host ">>> Go to Render (Static Site) and set Branch: static-deploy / Publish Dir: frontend/out" -ForegroundColor Yellow
