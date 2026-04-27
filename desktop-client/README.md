# Desktop Client (P2P)

Runs on the controller machine. Connects to a host over Hyperswarm and
opens a local web UI that displays the remote desktop and sends mouse +
keyboard input back to the host.

## Install

```bash
cd apps/desktop-client
npm install
```

## Run

```bash
node index.js --topic <hex64>
```

Then open `http://localhost:7878` in your browser. Click on the screen
to capture input (pointer lock + key forwarding). Press `Esc` to release.

Options:

```
--topic  <hex64>   topic shared by the host (required)
--port   <n>       local UI port (default: 7878)
```
