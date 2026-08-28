@echo off
title Twitch TTS Bot para OBS
color 0b
cls
echo ========================================================
echo        TWITCH TTS BOT - PANEL DE CONTROL PARA OBS
echo ========================================================
echo.
echo [1/2] Abriendo el panel de control en tu navegador...
start "" "%~dp0index.html"
echo.
echo ========================================================
echo  INSTRUCCIONES PARA OBS STUDIO:
echo ========================================================
echo.
echo  A) PANEL DE CONTROL DENTRO DE OBS (DOCK):
echo     1. En OBS ve a: Paneles (Docks) -^> Paneles de navegador personalizados
echo     2. Nombre del panel: Twitch TTS
echo     3. URL: %~dp0index.html
echo     4. Haz clic en "Aplicar" y acoplalo donde prefieras.
echo.
echo  B) SUBTITULOS EN EL STREAM (OVERLAY):
echo     1. En OBS: Fuentes -^> Agregar (+) -^> Navegador
echo     2. Nombre: TTS Overlay
echo     3. URL: %~dp0overlay.html
echo     4. Ancho: 1920, Alto: 1080
echo.
echo ========================================================
echo  El bot funciona de forma directa sin requerir Node.js!
echo ========================================================
echo.
pause

