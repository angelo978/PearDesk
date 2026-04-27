#!/usr/bin/env bash
# Installa Desktop Remoto P2P come applicazione di autostart su Linux (XDG).
# Funziona con GNOME, KDE, XFCE, Cinnamon, MATE, ecc.
set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LAUNCHER_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
LAUNCHER_JS="$LAUNCHER_DIR/index.js"

if [ ! -f "$LAUNCHER_JS" ]; then
  echo "Errore: launcher non trovato in $LAUNCHER_JS" >&2
  exit 1
fi

NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  echo "Errore: Node.js non trovato nel PATH. Installalo prima." >&2
  exit 1
fi

AUTOSTART_DIR="$HOME/.config/autostart"
DESKTOP_FILE="$AUTOSTART_DIR/desktop-remoto.desktop"
mkdir -p "$AUTOSTART_DIR"

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=Desktop Remoto P2P
Comment=Pannello di controllo P2P (Hyperswarm) all'avvio del sistema
Exec=$NODE_BIN $LAUNCHER_JS
Icon=preferences-desktop-remote-desktop
Terminal=false
X-GNOME-Autostart-enabled=true
X-KDE-autostart-after=panel
StartupNotify=false
Categories=Network;RemoteAccess;
EOF

chmod +x "$DESKTOP_FILE"

echo "✔ Autostart installato: $DESKTOP_FILE"
echo "  Node:    $NODE_BIN"
echo "  Script:  $LAUNCHER_JS"
echo
echo "Per avviarlo subito senza riavviare:"
echo "  node \"$LAUNCHER_JS\""
echo
echo "Per disinstallare:    bash \"$SCRIPT_DIR/uninstall-linux.sh\""
