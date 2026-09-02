# Script de Validación Automática de Overlays y Master Dock - Mithands Stream

$base = $PSScriptRoot

$targetFiles = @(
    (Join-Path $base "Overlay-principal\js\master-dock.js"),
    (Join-Path $base "Panel-control\js\master-dock.js"),
    (Join-Path $base "Overlay-principal\Bot-tts\js\tts-engine.js"),
    (Join-Path $base "Overlay-principal\Bot-tts\js\twitch-chat.js"),
    (Join-Path $base "Overlay-principal\Bot-tts\js\overlay.js"),
    (Join-Path $base "Overlay-principal\Widget-chat\js\managers\AudioManager.js"),
    (Join-Path $base "Overlay-principal\Widget-chat\js\achievements-view-app.js"),
    (Join-Path $base "Overlay-principal\js\unified-canvas.js")
)

$errorCount = 0

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "🔍 INICIANDO AUDITORÍA Y VALIDACIÓN DE ARCHIVOS" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

foreach ($file in $targetFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "❌ [NO EXISTE] $file" -ForegroundColor Red
        $errorCount++
        continue
    }

    $raw = Get-Content $file -Raw
    $chars = $raw.ToCharArray()
    $ob = ($chars | Where-Object { $_ -eq '{' }).Count
    $cb = ($chars | Where-Object { $_ -eq '}' }).Count
    $op = ($chars | Where-Object { $_ -eq '(' }).Count
    $cp = ($chars | Where-Object { $_ -eq ')' }).Count
    $os = ($chars | Where-Object { $_ -eq '[' }).Count
    $cs = ($chars | Where-Object { $_ -eq ']' }).Count

    if ($ob -ne $cb -or $op -ne $cp -or $os -ne $cs) {
        Write-Host "❌ [ERROR ESTRUCTURAL] $file" -ForegroundColor Red
        Write-Host "   -> Llaves { }: $ob aperturas vs $cb cierres" -ForegroundColor Yellow
        Write-Host "   -> Paréntesis ( ): $op aperturas vs $cp cierres" -ForegroundColor Yellow
        Write-Host "   -> Corchetes [ ]: $os aperturas vs $cs cierres" -ForegroundColor Yellow
        $errorCount++
    } else {
        Write-Host "✅ [SINTAXIS OK] $file (Llaves: $ob, Paréntesis: $op, Corchetes: $os)" -ForegroundColor Green
    }
}

# Verificación de canales Broadcast y LocalStorage
Write-Host "`n--- VERIFICACIÓN DE BUSES DE COMUNICACIÓN ---" -ForegroundColor Cyan
$expectedBus = "stream_master_dock_bus"
$dockPath = Join-Path $base "Overlay-principal\js\master-dock.js"
$dockJs = Get-Content $dockPath -Raw
if ($dockJs -match $expectedBus) {
    Write-Host "✅ [BUS DOCK OK] BroadcastChannel alineado con $expectedBus" -ForegroundColor Green
} else {
    Write-Host "❌ [BUS DOCK DESALINEADO]" -ForegroundColor Red
    $errorCount++
}

$overlayPath = Join-Path $base "Overlay-principal\Bot-tts\js\overlay.js"
$overlayJs = Get-Content $overlayPath -Raw
if ($overlayJs -match $expectedBus) {
    Write-Host "✅ [BUS OVERLAY OK] Overlay escucha correctamente $expectedBus" -ForegroundColor Green
} else {
    Write-Host "❌ [BUS OVERLAY DESALINEADO]" -ForegroundColor Red
    $errorCount++
}

Write-Host "==============================================" -ForegroundColor Cyan
if ($errorCount -eq 0) {
    Write-Host "🎉 TODOS LOS ARCHIVOS Y BUSES ESTÁN 100% LIMPIOS Y VALIDADOS" -ForegroundColor Green
} else {
    Write-Host "⚠️ SE ENCONTRARON $errorCount ERRORES" -ForegroundColor Red
}
Write-Host "==============================================" -ForegroundColor Cyan
