#!/usr/bin/env node
import crypto from "crypto";
import process from "process";
import Hyperswarm from "hyperswarm";
import b4a from "b4a";
import sharp from "sharp";
import screenshot from "screenshot-desktop";
import { encode, decode } from "@msgpack/msgpack";
import {
  mouse,
  keyboard,
  Point,
  Button,
  Key,
} from "@nut-tree-fork/nut-js";

/* ---------------------------------------------------------
   ARGUMENT PARSER
--------------------------------------------------------- */
function parseArgs(argv) {
  const args = { fps: 10, quality: 60, format: "jpeg", maxWidth: 1280 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--topic") { args.topic = next; i++; }
    else if (a === "--fps") { args.fps = Number(next); i++; }
    else if (a === "--quality") { args.quality = Number(next); i++; }
    else if (a === "--format") { args.format = next; i++; }
    else if (a === "--max-width") { args.maxWidth = Number(next); i++; }
    else if (a === "--no-input") { args.noInput = true; }
    else if (a === "--help" || a === "-h") {
      console.log(`Desktop Host - P2P remote desktop sharer

Usage:
  node index.js [--topic <hex64>] [--fps <n>] [--quality <0-100>]
                [--format jpeg|webp] [--max-width <px>] [--no-input]

If no --topic is given, a fresh one is generated and printed.`);
      process.exit(0);
    }
  }
  return args;
}

const args = parseArgs(process.argv);

/* ---------------------------------------------------------
   TOPIC
--------------------------------------------------------- */
const topicBuf = args.topic
  ? b4a.from(args.topic, "hex")
  : crypto.randomBytes(32);

if (topicBuf.length !== 32) {
  console.error("Topic must be 32 bytes (64 hex chars).");
  process.exit(1);
}

const topicHex = b4a.toString(topicBuf, "hex");

console.log("=".repeat(60));
console.log("Desktop Host ready");
console.log("=".repeat(60));
console.log("Share this topic with the client:\n");
console.log("  " + topicHex + "\n");
console.log(`Streaming at ~${args.fps} fps, ${args.format} q=${args.quality}, max-width=${args.maxWidth}px`);
console.log(`Remote input: ${args.noInput ? "DISABLED" : "ENABLED"}`);
console.log("=".repeat(60));

mouse.config.autoDelayMs = 0;
keyboard.config.autoDelayMs = 0;

/* ---------------------------------------------------------
   HYPERSWARM
--------------------------------------------------------- */
const swarm = new Hyperswarm();
const peers = new Set();

swarm.on("connection", (conn, info) => {
  const peerId = b4a.toString(info.publicKey, "hex").slice(0, 12);
  console.log(`[+] Client connected: ${peerId}`);
  peers.add(conn);

  conn.on("close", () => {
    console.log(`[-] Client disconnected: ${peerId}`);
    peers.delete(conn);
  });

  conn.on("error", (err) => {
    console.log(`[!] Conn error ${peerId}: ${err.message}`);
  });

  let buffer = b4a.alloc(0);
  conn.on("data", (chunk) => {
    buffer = b4a.concat([buffer, chunk]);
    while (buffer.length >= 4) {
      const len = buffer.readUInt32BE(0);
      if (buffer.length < 4 + len) break;
      const payload = buffer.subarray(4, 4 + len);
      buffer = buffer.subarray(4 + len);
      try {
        const msg = decode(payload);
        if (!args.noInput) handleInput(msg);
      } catch (err) {
        console.log("[!] Decode error:", err.message);
      }
    }
  });
});

swarm.join(topicBuf, { server: true, client: false });
await swarm.flush();
console.log("[*] Joined swarm, waiting for peers...");

/* ---------------------------------------------------------
   SCREEN CAPTURE LOOP
--------------------------------------------------------- */
let lastSent = 0;
const frameInterval = 1000 / args.fps;
let captureRunning = false;

async function captureLoop() {
  while (true) {
    if (peers.size === 0) {
      await sleep(200);
      continue;
    }
    const now = Date.now();
    const wait = Math.max(0, frameInterval - (now - lastSent));
    if (wait) await sleep(wait);
    lastSent = Date.now();
    try {
      await captureAndBroadcast();
    } catch (err) {
      console.log("[!] Capture error:", err.message);
      await sleep(500);
    }
  }
}

async function captureAndBroadcast() {
  if (captureRunning) return;
  captureRunning = true;
  try {
    const raw = await screenshot({ format: "png" });
    const img = sharp(raw).resize({ width: args.maxWidth, withoutEnlargement: true });
    const meta = await sharp(raw).metadata();

    let buf;
    if (args.format === "webp") {
      buf = await img.webp({ quality: args.quality }).toBuffer();
    } else {
      buf = await img.jpeg({ quality: args.quality }).toBuffer();
    }

    const message = {
      type: "frame",
      format: args.format,
      width: meta.width || 0,
      height: meta.height || 0,
      ts: Date.now(),
      data: buf,
    };

    sendToAll(message);
  } finally {
    captureRunning = false;
  }
}

function sendToAll(message) {
  const encoded = encode(message);
  const header = b4a.alloc(4);
  header.writeUInt32BE(encoded.length, 0);
  for (const conn of peers) {
    try {
      conn.write(header);
      conn.write(encoded);
    } catch {}
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ---------------------------------------------------------
   KEYBOARD MAP (MIGLIORATA)
--------------------------------------------------------- */
const KEY_MAP = {
  Backspace: Key.Backspace,
  Tab: Key.Tab,
  Enter: Key.Enter,
  Escape: Key.Escape,
  Space: Key.Space,

  ArrowLeft: Key.Left,
  ArrowRight: Key.Right,
  ArrowUp: Key.Up,
  ArrowDown: Key.Down,

  ShiftLeft: Key.LeftShift,
  ShiftRight: Key.RightShift,
  ControlLeft: Key.LeftControl,
  ControlRight: Key.RightControl,
  AltLeft: Key.LeftAlt,
  AltRight: Key.RightAlt,

  Delete: Key.Delete,
  Home: Key.Home,
  End: Key.End,
  PageUp: Key.PageUp,
  PageDown: Key.PageDown,

  F1: Key.F1, F2: Key.F2, F3: Key.F3, F4: Key.F4, F5: Key.F5, F6: Key.F6,
  F7: Key.F7, F8: Key.F8, F9: Key.F9, F10: Key.F10, F11: Key.F11, F12: Key.F12,

  MetaLeft: Key.LeftSuper,
  MetaRight: Key.LeftSuper,
};

function mapKey(msg) {
  const name = msg.key;
  const code = msg.code;

  // Prima prova con code (ShiftLeft, AltRight, ecc.)
  if (KEY_MAP[code]) return KEY_MAP[code];

  // Poi con key (Backspace, Enter, ecc.)
  if (KEY_MAP[name]) return KEY_MAP[name];

  // AltGr (Firefox manda key="AltGraph")
  if (name === "AltGraph") return Key.RightAlt;

  // Lettere singole
  if (name.length === 1 && /[a-z]/i.test(name)) {
    const upper = name.toUpperCase();
    if (Key[upper]) return Key[upper];
  }

  // Numeri riga superiore
  if (/^[0-9]$/.test(name)) {
    const numName = "Num" + name;
    if (Key[numName]) return Key[numName];
  }

  return null;
}

/* ---------------------------------------------------------
   INPUT HANDLER (MOUSE OK, TASTIERA MIGLIORATA)
--------------------------------------------------------- */
async function handleInput(msg) {
  try {
    if (msg.type === "mouse-move") {
      await mouse.setPosition(new Point(msg.x, msg.y));

    } else if (msg.type === "mouse-down") {
      const btn = msg.button === 2 ? Button.RIGHT :
                  msg.button === 1 ? Button.MIDDLE : Button.LEFT;
      await mouse.setPosition(new Point(msg.x, msg.y));
      await mouse.pressButton(btn);

    } else if (msg.type === "mouse-up") {
      const btn = msg.button === 2 ? Button.RIGHT :
                  msg.button === 1 ? Button.MIDDLE : Button.LEFT;
      await mouse.releaseButton(btn);

    } else if (msg.type === "scroll") {
      if (msg.dy > 0) await mouse.scrollDown(msg.dy);
      else if (msg.dy < 0) await mouse.scrollUp(Math.abs(msg.dy));

    } else if (msg.type === "key-down") {
      // Gestione maiuscole: se è una lettera singola maiuscola, premi Shift + lettera
      if (msg.key && msg.key.length === 1 && /[A-Z]/.test(msg.key)) {
        const base = msg.key.toLowerCase();
        const baseKey = mapKey({ key: base, code: msg.code });
        if (baseKey) {
          await keyboard.pressKey(Key.LeftShift, baseKey);
          return;
        }
      }

      const k = mapKey(msg);
      if (k) await keyboard.pressKey(k);

    } else if (msg.type === "key-up") {
      if (msg.key && msg.key.length === 1 && /[A-Z]/.test(msg.key)) {
        const base = msg.key.toLowerCase();
        const baseKey = mapKey({ key: base, code: msg.code });
        if (baseKey) {
          await keyboard.releaseKey(baseKey, Key.LeftShift);
          return;
        }
      }

      const k = mapKey(msg);
      if (k) await keyboard.releaseKey(k);

    } else if (msg.type === "type") {
      if (msg.text) await keyboard.type(msg.text);
    }

  } catch (err) {
    console.log("[!] Input error:", err.message);
  }
}

/* ---------------------------------------------------------
   START CAPTURE LOOP
--------------------------------------------------------- */
captureLoop().catch((err) => {
  console.error("Fatal capture loop error:", err);
  process.exit(1);
});

/* ---------------------------------------------------------
   CLEAN EXIT
--------------------------------------------------------- */
process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  await swarm.destroy();
  process.exit(0);
});
