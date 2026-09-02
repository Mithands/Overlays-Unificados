@echo off
title Configurar Inicio Automatico - Mithands Overlay
color 0b
echo ========================================================
echo   ACTIVANDO INICIO AUTOMATICO CON WINDOWS
echo ========================================================
echo.

set SCRIPT_DIR=%~dp0
set VBS_PATH=%SCRIPT_DIR%iniciar_oculto.vbs
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_DIR%\Mithands_Overlay_Server.lnk

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%VBS_PATH%\"'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Save()"

echo [OK] Acceso directo invisible instalado en el Inicio de Windows.
echo.
echo Iniciando el servidor en segundo plano ahora mismo...
wscript.exe "%VBS_PATH%"
echo.
echo ========================================================
echo   LISTO: El servidor se iniciara solo cada vez que
echo   enciendas tu PC. Ya puedes abrir OBS libremente!
echo ========================================================
echo.
pause
