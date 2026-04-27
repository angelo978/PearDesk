# Desktop Remoto P2P — Launcher

Avvia automaticamente l'host e (su richiesta) il client, e serve un
pannello di controllo HTML in `http://localhost:7777` con:

- il tuo codice/topic con un pulsante **Copia**
- un campo per il codice remoto
- un pulsante **Connetti** che salva il topic e riavvia il client

Il pannello si apre da solo nel browser predefinito quando il launcher
parte. Lo stesso launcher può essere installato come applicazione di
autostart su Linux e Windows.

## Struttura

```
apps/launcher/
├── index.js                       # launcher Node.js
├── package.json
├── public/
│   └── index.html                 # pannello di controllo
├── scripts/
│   ├── install-linux.sh           # autostart XDG (~/.config/autostart)
│   ├── uninstall-linux.sh
│   ├── install-windows.ps1        # autostart Startup folder (.vbs)
│   └── uninstall-windows.ps1
└── README.md
```

Dipende dai due CLI già presenti:

```
apps/desktop-host/index.js     # condivide schermo + riceve input
apps/desktop-client/index.js   # connessione + viewer browser :7878
```

## Avvio manuale

```bash
# 1) installa una volta sola
cd apps/desktop-host  && npm install && cd -
cd apps/desktop-client && npm install && cd -

# 2) avvia il launcher (apre il pannello nel browser)
cd apps/launcher
node index.js
```

Pannello: `http://localhost:7777`
Visualizzatore client (dopo Connetti): `http://localhost:7878`

Variabili d'ambiente opzionali:

| variabile                  | default | descrizione                          |
| -------------------------- | ------- | ------------------------------------ |
| `LAUNCHER_PORT`            | 7777    | porta del pannello di controllo      |
| `CLIENT_PORT`              | 7878    | porta del visualizzatore browser     |
| `DESKTOP_REMOTO_NO_BROWSER`| -       | se "1", non apre il browser all'avvio |

## Autostart

### Linux (GNOME / KDE / XFCE / …)

```bash
bash apps/launcher/scripts/install-linux.sh
# disinstalla:
bash apps/launcher/scripts/uninstall-linux.sh
```

Crea un file XDG `~/.config/autostart/desktop-remoto.desktop` che lancia
`node apps/launcher/index.js` al login.

### Windows

In PowerShell (anche senza admin):

```powershell
powershell -ExecutionPolicy Bypass -File apps\launcher\scripts\install-windows.ps1
# disinstalla:
powershell -ExecutionPolicy Bypass -File apps\launcher\scripts\uninstall-windows.ps1
```

Crea un file `desktop-remoto.vbs` nella cartella **Esecuzione automatica**
dell'utente (`shell:startup`) che avvia il launcher in background, senza
finestra console.

## File di configurazione

Il launcher salva il tuo topic e l'ultimo topic remoto in:

- Linux / macOS: `~/.config/desktop-remoto/config.json`
- Windows: `%APPDATA%\desktop-remoto\config.json`

```json
{
  "myTopic": "…64 hex…",
  "remoteTopic": "…64 hex…"
}
```
