$ErrorActionPreference = "Stop"
$startup = [Environment]::GetFolderPath('Startup')
$vbsPath = Join-Path $startup 'desktop-remoto.vbs'
if (Test-Path $vbsPath) {
    Remove-Item $vbsPath -Force
    Write-Host "OK - Rimosso $vbsPath"
} else {
    Write-Host "Nulla da rimuovere ($vbsPath non esiste)."
}
