#!/usr/bin/env bash
set -euo pipefail
DESKTOP_FILE="$HOME/.config/autostart/desktop-remoto.desktop"
if [ -f "$DESKTOP_FILE" ]; then
  rm "$DESKTOP_FILE"
  echo "✔ Rimosso $DESKTOP_FILE"
else
  echo "Nulla da rimuovere ($DESKTOP_FILE non esiste)."
fi
