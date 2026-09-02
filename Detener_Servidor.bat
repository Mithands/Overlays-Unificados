@echo off
title Detener Servidor - Mithands Overlay
color 0e
echo ========================================================
echo   DETENIENDO SERVIDOR LOCAL (PUERTO 3000)
echo ========================================================
echo.

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Host '[OK] Servidor detenido correctamente.' -ForegroundColor Green"

echo.
pause
