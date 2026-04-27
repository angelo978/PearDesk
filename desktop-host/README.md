# Desktop Host (P2P)

Runs on the machine whose screen you want to share.

Captures the screen, compresses to JPEG/WebP, and streams frames to any
connected client over a P2P Hyperswarm topic. Receives mouse and keyboard
events back and dispatches them via `@nut-tree-fork/nut-js`.

## Install

```bash
cd apps/desktop-host
npm install
```

> Native build deps may be required for `sharp` and `@nut-tree-fork/nut-js`
> (Xcode CLT on macOS, build-essential + libxtst on Linux, MSVC on Windows).

## Run

Generate a fresh topic and start sharing:

```bash
node index.js --fps 10 --quality 60 --format jpeg --max-width 1280
```

The host prints a 64-character hex topic. Share it with the client.

Reuse an existing topic:

```bash
node index.js --topic <hex64>
```

Disable remote input (view-only mode):

```bash
node index.js --no-input
```

## Notes

- Permissions: macOS needs Screen Recording + Accessibility for the terminal
  process. Linux requires an X11/Wayland session that supports input
  injection. Windows works out of the box for most users.
- The screen capture format is PNG (from `screenshot-desktop`); `sharp`
  re-encodes to JPEG or WebP at the chosen quality before sending.
