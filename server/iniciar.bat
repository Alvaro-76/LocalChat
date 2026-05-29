@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   LocalChat - Servidor de Chat en Red
echo ========================================
echo.

echo [1/3] Detectando IP local...
node updateConfig.js

if not exist "..\client\dist\index.html" (
    echo [2/3] Construyendo cliente...
    cd /d "%~dp0..\client"
    npm install --silent
    npm run build --silent
    cd /d "%~dp0"
)

echo [3/3] Iniciando servidor...
echo.
echo Accede a los siguientes endpoints cuando el servidor este listo:
echo   - Chat WebSocket: /  (Socket.IO)
echo   - App web:        /app
echo   - Descargas:      /api/webdownload
echo.

node src\server.js

pause
