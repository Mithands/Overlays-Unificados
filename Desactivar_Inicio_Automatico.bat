@echo off
title Desactivar Inicio Automatico - Mithands Overlay
color 0c
echo ========================================================
echo   DESACTIVANDO INICIO AUTOMATICO
echo ========================================================
echo.

set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_DIR%\Mithands_Overlay_Server.lnk

if exist "%SHORTCUT_PATH%" (
    del "%SHORTCUT_PATH%"
    echo [OK] Acceso directo eliminado del inicio de Windows.
) else (
    echo [INFO] No habia acceso directo configurado en el inicio.
)

echo.
pause
