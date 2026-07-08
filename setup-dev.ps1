$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

Write-Host "== 1. Kiem tra Node/npm ==" -ForegroundColor Cyan
node -v
npm -v

Write-Host "`n== 2. Audit dependencies ==" -ForegroundColor Cyan
npm ls --depth=0
$auditFailed = ($LASTEXITCODE -ne 0)

if ($auditFailed) {
    Write-Host "`n>> Phat hien thieu/hong dependency. Dang cai lai sach..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
    Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`nnpm install that bai. Dung lai de ban kiem tra log o tren." -ForegroundColor Red
        Read-Host "Nhan Enter de thoat"
        exit 1
    }
} else {
    Write-Host "`n>> Tat ca dependencies da day du." -ForegroundColor Green
}

Write-Host "`n== 3. Khoi dong dev server ==" -ForegroundColor Cyan
npm run dev
