# Installa Desktop Remoto P2P come applicazione di autostart su Windows.
# Crea uno script .vbs nella cartella Esecuzione automatica dell'utente
# che avvia il launcher in background (senza finestra console).
#
# Uso (PowerShell, anche senza admin):
#   powershell -ExecutionPolicy Bypass -File scripts\install-windows.ps1

$ErrorActionPreference = "Stop"

$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcherDir = (Resolve-Path (Join-Path $scriptDir "..")).Path
$launcherJs  = Join-Path $launcherDir "index.js"

if (-not (Test-Path $launcherJs)) {
    Write-Error "Launcher non trovato in $launcherJs"
    exit 1
}

$node = (Get-Command node -ErrorAction SilentlyContinue)
if (-not $node) {
    Write-Error "Node.js non trovato nel PATH. Installalo prima (https://nodejs.org)."
    exit 1
}
$nodePath = $node.Source

$startup = [Environment]::GetFolderPath('Startup')
$vbsPath = Join-Path $startup 'desktop-remoto.vbs'

$vbsContent = @"
' Desktop Remoto P2P - autostart
' Avvia il launcher Node in background, senza finestra console.
Set sh = CreateObject("WScript.Shell")
sh.Run """$nodePath"" ""$launcherJs""", 0, False
"@

# .vbs deve essere ANSI/ASCII
[System.IO.File]::WriteAllText($vbsPath, $vbsContent, [System.Text.Encoding]::ASCII)

Write-Host "OK - Autostart installato:"
Write-Host "    $vbsPath"
Write-Host "    Node:   $nodePath"
Write-Host "    Script: $launcherJs"
Write-Host ""
Write-Host "Per avviarlo subito senza riavviare:"
Write-Host "    node `"$launcherJs`""
Write-Host ""
Write-Host "Per disinstallare: powershell -ExecutionPolicy Bypass -File scripts\uninstall-windows.ps1"
