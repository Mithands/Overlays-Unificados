@echo off
title Servidor Local Overlays Mithands (OBS & Web)
color 0b
echo ======================================================
echo   INICIANDO SERVIDOR LOCAL OVERLAYS MITHANDS (0 ms)
echo ======================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor_local.ps1"
pause
