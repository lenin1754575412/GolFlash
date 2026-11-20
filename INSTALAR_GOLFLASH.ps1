# Ejecutar desde PowerShell si el ZIP está en Descargas.
$ErrorActionPreference = 'Stop'
$project = Join-Path $HOME 'Desktop\GolFlash'
$zip = Join-Path $HOME 'Downloads\GolFlash_Completo_Funcional.zip'
if (-not (Test-Path (Join-Path $project 'package.json'))) { throw "No encuentro GolFlash en $project" }
if (-not (Test-Path $zip)) { throw "No encuentro el ZIP en Descargas: $zip" }
Set-Location $project
$backup = "App.respaldo.$(Get-Date -Format 'yyyyMMdd-HHmmss').bak"
Copy-Item (Join-Path $project 'src\App.tsx') (Join-Path $project $backup) -Force
Expand-Archive -Path $zip -DestinationPath $project -Force
Write-Host "Copia de seguridad creada: $backup" -ForegroundColor Green
Write-Host 'Archivos actualizados. Iniciando npm install...' -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw 'Falló npm install. Revisa el error anterior.' }
Write-Host 'Abriendo GolFlash con caché limpio...' -ForegroundColor Green
npx expo start --clear
