# PearDesk  
Remote Desktop Peer‑to‑Peer, leggero, veloce e senza server.

PearDesk è un sistema di desktop remoto completamente peer‑to‑peer, senza server centrali, senza cloud e senza dipendenze esterne.  
Connessione diretta, crittografata, multipiattaforma e ultra‑leggera.

---

## 🚀 Caratteristiche principali

- 🔗 **Connessione P2P pura** (Holepunch / Hyperswarm)
- 🖥️ **Controllo remoto completo** (mouse + tastiera)
- ⚡ **Streaming schermo ad alta efficienza** (JPEG/WebP)
- 🔐 **Crittografia end‑to‑end** (Noise Protocol)
- 🌍 **NAT traversal automatico**
- 🧩 **Multipiattaforma** (Linux, Windows, macOS)
- 🪶 **Zero server, zero cloud, zero dipendenze esterne**
- 🛠️ **Launcher automatico** (host + client + browser)

---

## 📦 Struttura del progetto

desktop-host/      → Cattura schermo, input remoto, streaming P2P
desktop-client/    → Viewer web + input + connessione
launcher/          → Script di avvio automatico (host/client)


---

## 🔧 Installazione

### 1. Clona la repo
git clone https://github.com/angelo978/PearDesk
cd PearDesk
### 2. Installa le dipendenze
Per ogni modulo:
cd desktop-host
npm install

cd ../desktop-client
npm install

cd ../launcher
npm install

---
## 🐧 Nota importante per Linux (schermo nero)

PearDesk utilizza un modulo di cattura schermo che richiede ImageMagick.

Se l’Host mostra uno schermo nero, installa:

sudo apt install imagemagick

Dopo l’installazione, riavvia PearDesk Host.


---

## 🔒 Sicurezza

- Tutte le connessioni sono **crittografate end‑to‑end** tramite Noise Protocol.
- Nessun server centrale.
- Nessun inoltro cloud.
- Nessun log.

---

## 📜 Licenza

PearDesk è distribuito sotto **GPLv3 con restrizione aggiuntiva Non Commercial**.  
Consulta il file `LICENSE` per i dettagli.

---
## ⚠️ Stato del progetto

PearDesk è un prototipo funzionante e stabile nelle sue funzioni principali
(connessione P2P, streaming schermo, mouse, avvio automatico).

Alcune funzionalità possono essere migliorate o estese da chi desidera
contribuire, come:
- ottimizzazioni della tastiera su alcuni sistemi
- funzioni aggiuntive per l’invio/ricezione file
- miglioramenti dell’interfaccia

## ⭐ Contribuire
Il progetto è aperto a contributi della community.

---

## 📬 Contatti

Per richieste commerciali o permessi speciali:  
**Angelo – Autore del progetto**

