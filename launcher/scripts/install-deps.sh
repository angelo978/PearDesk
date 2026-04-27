#!/usr/bin/env bash
set -euo pipefail

echo "=== Installazione dipendenze Desktop Remoto P2P ==="

# BASE_DIR = cartella principale del progetto
# (due livelli sopra: scripts → launcher → desktop-remoto-p2p)
BASE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

install_deps() {
    local dir="$1"
    echo ""
    echo "→ Installo dipendenze in: $dir"
    cd "$dir"
    if [ -f package.json ]; then
        npm install --silent
        echo "✔ Dipendenze installate in $dir"
    else
        echo "⚠ Nessun package.json in $dir (saltato)"
    fi
}

install_deps "$BASE_DIR/launcher"
install_deps "$BASE_DIR/desktop-host"
install_deps "$BASE_DIR/desktop-client"

echo ""
echo "✔ Tutte le dipendenze sono state installate!"
