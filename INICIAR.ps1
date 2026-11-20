Set-Location $PSScriptRoot
node --version
npm install
if ($LASTEXITCODE -ne 0) { throw "Fallo npm install" }
npx expo install --fix
if ($LASTEXITCODE -ne 0) { throw "Fallo expo install" }
npx expo start --clear
