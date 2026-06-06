# TrackResiduos — Setup inicial
# Ejecutar desde la carpeta raíz del proyecto: .\setup.ps1

Write-Host "📦 Instalando dependencias..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al instalar dependencias" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🗄️  Generando cliente Prisma..." -ForegroundColor Cyan
npx prisma generate

Write-Host ""
Write-Host "🗄️  Creando base de datos y tablas..." -ForegroundColor Cyan
npx prisma db push

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al crear la base de datos" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🌱 Ejecutando seed (datos iniciales)..." -ForegroundColor Cyan
npx prisma db seed

Write-Host ""
Write-Host "✅ Setup completo. Iniciando servidor..." -ForegroundColor Green
Write-Host ""
Write-Host "Credenciales de prueba:" -ForegroundColor Yellow
Write-Host "  ADMIN:     admin@cooperapro.cl        / admin123"
Write-Host "  CHOFER:    carlos.rojas@cooperapro.cl / chofer123"
Write-Host "  RECEPCION: recepcion@cooperapro.cl    / recep123"
Write-Host ""
npm run dev
