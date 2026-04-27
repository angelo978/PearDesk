#!/usr/bin/env node
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import process from "process";
import Hyperswarm from "hyperswarm";
import b4a from "b4a";
import { WebSocketServer } from "ws";
import { encode, decode } from "@msgpack/msgpack";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ---------------------------------------------------------
   PARSE ARGUMENTS
--------------------------------------------------------- */
function parseArgs(argv) {
  const args = { port: 7878 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--topic") { args.topic = next; i++; }
    else if (a === "--port") { args.port = Number(next); i++; }
    else if (a === "--help" || a === "-h") {
      console.log(`Desktop Client - P2P remote desktop controller

Usage:
  node index.js --topic <hex64> [--port <n>]

Opens a local web UI at http://localhost:<port> showing the host's
desktop and forwarding mouse + keyboard input back over Hyperswarm.`);
      process.exit(0);
    }
  }
  return args;
}

const args = parseArgs(process.argv);

if (!args.topic) {
  console.error("Missing --topic <hex64>. Get it from the host.");
  process.exit(1);
}

const topicBuf = b4a.from(args.topic, "hex");
if (topicBuf.length !== 32) {
  console.error("Topic must be 32 bytes (64 hex chars).");
  process.exit(1);
}

/* ---------------------------------------------------------
   HYPERSWARM CONNECTION
--------------------------------------------------------- */
const swarm = new Hyperswarm();
let hostConn = null;
const browserSockets = new Set();

swarm.on("connection", (conn, info) => {
  const peerId = b4a.toString(info.publicKey, "hex").slice(0, 12);
  console.log(`[+] Connected to host: ${peerId}`);
  hostConn = conn;

  for (const ws of browserSockets) {
    try { ws.send(JSON.stringify({ type: "host-status", connected: true })); } catch {}
  }

  conn.on("close", () => {
    console.log(`[-] Host disconnected: ${peerId}`);
    if (hostConn === conn) hostConn = null;
    for (const ws of browserSockets) {
      try { ws.send(JSON.stringify({ type: "host-status", connected: false })); } catch {}
    }
  });

  conn.on("error", (err) => {
    console.log(`[!] Conn error: ${err.message}`);
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
        if (msg && msg.type === "frame") {
          forwardFrameToBrowsers(msg);
        }
      } catch (err) {
        console.log("[!] Decode error:", err.message);
      }
    }
  });
});

swarm.join(topicBuf, { server: false, client: true });
await swarm.flush();
console.log("[*] Searching for host on swarm...");

/* ---------------------------------------------------------
   FORWARD FRAME TO BROWSER
--------------------------------------------------------- */
function forwardFrameToBrowsers(msg) {
  const mime = msg.format === "webp" ? "image/webp" : "image/jpeg";
  const dataB64 = b4a.toString(b4a.from(msg.data), "base64");
  const payload = JSON.stringify({
    type: "frame",
    mime,
    width: msg.width,
    height: msg.height,
    ts: msg.ts,
    data: dataB64,
  });
  for (const ws of browserSockets) {
    if (ws.readyState === ws.OPEN) {
      try { ws.send(payload); } catch {}
    }
  }
}

/* ---------------------------------------------------------
   SEND MESSAGE TO HOST
--------------------------------------------------------- */
function sendToHost(message) {
  if (!hostConn) return;
  const encoded = encode(message);
  const header = b4a.alloc(4);
  header.writeUInt32BE(encoded.length, 0);
  try {
    hostConn.write(header);
    hostConn.write(encoded);
  } catch (err) {
    console.log("[!] Send error:", err.message);
  }
}

/* ---------------------------------------------------------
   HTTP SERVER FOR WEB UI
--------------------------------------------------------- */
const server = http.createServer((req, res) => {
  let urlPath = req.url || "/";
  if (urlPath === "/") urlPath = "/index.html";
  const safe = urlPath.replace(/\.\./g, "");
  const filePath = path.join(__dirname, "public", safe);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };
    res.writeHead(200, { "Content-Type": types[ext] || "text/plain" });
    res.end(data);
  });
});

/* ---------------------------------------------------------
   WEBSOCKET: BROWSER <-> CLIENT
--------------------------------------------------------- */
const wss = new WebSocketServer({ server });
wss.on("connection", (ws) => {
  console.log("[+] Browser connected");
  browserSockets.add(ws);

  try {
    ws.send(JSON.stringify({ type: "host-status", connected: !!hostConn }));
  } catch {}

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      // VALIDAZIONE INPUT
      if (!msg || typeof msg !== "object") return;
      if (!msg.type) return;

      // INOLTRO DIRETTO AL SERVER HOST
      sendToHost(msg);

    } catch (err) {
      console.log("[!] Bad browser msg:", err.message);
    }
  });

  ws.on("close", () => {
    console.log("[-] Browser disconnected");
    browserSockets.delete(ws);
  });
});

/* ---------------------------------------------------------
   START SERVER
--------------------------------------------------------- */
server.listen(args.port, "127.0.0.1", () => {
  console.log("=".repeat(60));
  console.log("Desktop Client ready");
  console.log("=".repeat(60));
  console.log(`Topic:     ${args.topic}`);
  console.log(`Open UI:   http://localhost:${args.port}`);
  console.log("=".repeat(60));
});

/* ---------------------------------------------------------
   CLEAN EXIT
--------------------------------------------------------- */
process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  await swarm.destroy();
  server.close();
  process.exit(0);
});
