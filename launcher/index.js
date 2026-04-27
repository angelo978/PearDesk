#!/usr/bin/env node
import http from "http";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { spawn, exec } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPS_DIR = path.resolve(__dirname, "..");
const HOST_SCRIPT = path.join(APPS_DIR, "desktop-host", "index.js");
const CLIENT_SCRIPT = path.join(APPS_DIR, "desktop-client", "index.js");

const LAUNCHER_PORT = Number(process.env.LAUNCHER_PORT || 7777);
const CLIENT_PORT = Number(process.env.CLIENT_PORT || 7878);

const CONFIG_DIR =
  process.platform === "win32"
    ? path.join(process.env.APPDATA || os.homedir(), "desktop-remoto")
    : path.join(os.homedir(), ".config", "desktop-remoto");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveConfig(cfg) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

function randomTopicHex() {
  return crypto.randomBytes(32).toString("hex");
}

const config = loadConfig();
if (!config.myTopic) {
  config.myTopic = randomTopicHex();
  saveConfig(config);
}

const state = {
  hostProc: null,
  clientProc: null,
  hostStatus: "stopped",
  clientStatus: "stopped",
  lastHostLog: "",
  lastClientLog: "",
};

function logFromProc(proc, label, key) {
  proc.stdout.on("data", (d) => {
    const s = d.toString();
    state[key] = s.trim().split("\n").slice(-1)[0] || state[key];
    process.stdout.write(`[${label}] ${s}`);
  });
  proc.stderr.on("data", (d) => {
    const s = d.toString();
    state[key] = s.trim().split("\n").slice(-1)[0] || state[key];
    process.stderr.write(`[${label}] ${s}`);
  });
}

function startHost() {
  if (state.hostProc) return;
  if (!fs.existsSync(HOST_SCRIPT)) {
    state.hostStatus = "missing-script";
    return;
  }
  console.log("[launcher] starting host...");
  const proc = spawn(process.execPath, [HOST_SCRIPT, "--topic", config.myTopic], {
    cwd: path.dirname(HOST_SCRIPT),
    env: process.env,
  });
  state.hostProc = proc;
  state.hostStatus = "running";
  logFromProc(proc, "host", "lastHostLog");
  proc.on("exit", (code) => {
    console.log(`[launcher] host exited with code ${code}`);
    state.hostProc = null;
    state.hostStatus = code === 0 ? "stopped" : "crashed";
  });
}

function stopClient() {
  return new Promise((resolve) => {
    const proc = state.clientProc;
    if (!proc) return resolve();
    state.clientProc = null;
    state.clientStatus = "stopping";
    proc.once("exit", () => resolve());
    try { proc.kill("SIGTERM"); } catch {}
    setTimeout(() => {
      try { proc.kill("SIGKILL"); } catch {}
      resolve();
    }, 1500);
  });
}

async function startClient(remoteTopic) {
  await stopClient();
  if (!remoteTopic) {
    state.clientStatus = "no-topic";
    return;
  }
  if (!fs.existsSync(CLIENT_SCRIPT)) {
    state.clientStatus = "missing-script";
    return;
  }
  console.log("[launcher] starting client for topic", remoteTopic.slice(0, 12) + "...");
  const proc = spawn(
    process.execPath,
    [CLIENT_SCRIPT, "--topic", remoteTopic, "--port", String(CLIENT_PORT)],
    { cwd: path.dirname(CLIENT_SCRIPT), env: process.env }
  );
  state.clientProc = proc;
  state.clientStatus = "running";
  logFromProc(proc, "client", "lastClientLog");
  proc.on("exit", (code) => {
    console.log(`[launcher] client exited with code ${code}`);
    if (state.clientProc === proc) {
      state.clientProc = null;
      state.clientStatus = code === 0 ? "stopped" : "crashed";
    }
  });
}

function openInBrowser(url) {
  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.log("[launcher] could not open browser:", err.message);
  });
}

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${LAUNCHER_PORT}`);

  if (req.method === "GET" && url.pathname === "/api/status") {
    return send(res, 200, {
      myTopic: config.myTopic,
      remoteTopic: config.remoteTopic || "",
      hostStatus: state.hostStatus,
      clientStatus: state.clientStatus,
      lastHostLog: state.lastHostLog,
      lastClientLog: state.lastClientLog,
      clientPort: CLIENT_PORT,
    });
  }

  if (req.method === "POST" && url.pathname === "/api/connect") {
    try {
      const body = await readBody(req);
      const data = body ? JSON.parse(body) : {};
      const topic = (data.topic || "").trim().toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(topic)) {
        return send(res, 400, { error: "Topic non valido (richiesti 64 caratteri esadecimali)." });
      }
      config.remoteTopic = topic;
      saveConfig(config);
      await startClient(topic);
      return send(res, 200, { ok: true, clientUrl: `http://localhost:${CLIENT_PORT}` });
    } catch (err) {
      return send(res, 500, { error: err.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/disconnect") {
    config.remoteTopic = "";
    saveConfig(config);
    await stopClient();
    return send(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/regenerate-topic") {
    config.myTopic = randomTopicHex();
    saveConfig(config);
    if (state.hostProc) {
      try { state.hostProc.kill("SIGTERM"); } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    startHost();
    return send(res, 200, { myTopic: config.myTopic });
  }

  if (req.method === "POST" && url.pathname === "/api/restart-host") {
    if (state.hostProc) {
      try { state.hostProc.kill("SIGTERM"); } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    startHost();
    return send(res, 200, { ok: true });
  }

  // static file serving
  let urlPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safe = urlPath.replace(/\.\./g, "");
  const filePath = path.join(__dirname, "public", safe);
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, "Not found", "text/plain");
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      ".html": "text/html; charset=utf-8",
      ".js": "application/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
    };
    send(res, 200, data, types[ext] || "application/octet-stream");
  });
});

server.listen(LAUNCHER_PORT, "127.0.0.1", () => {
  const url = `http://localhost:${LAUNCHER_PORT}`;
  console.log("=".repeat(60));
  console.log("Desktop Remoto P2P - Launcher");
  console.log("=".repeat(60));
  console.log(`Pannello di controllo: ${url}`);
  console.log(`Config:                ${CONFIG_FILE}`);
  console.log(`Tuo topic:             ${config.myTopic}`);
  if (config.remoteTopic) console.log(`Topic remoto salvato:  ${config.remoteTopic}`);
  console.log("=".repeat(60));

  startHost();
  if (config.remoteTopic) {
    startClient(config.remoteTopic).catch((e) =>
      console.log("[launcher] startClient error:", e.message)
    );
  }

  if (process.env.DESKTOP_REMOTO_NO_BROWSER !== "1") {
    setTimeout(() => openInBrowser(url), 600);
  }
});

async function shutdown() {
  console.log("\n[launcher] shutting down...");
  await stopClient();
  if (state.hostProc) {
    try { state.hostProc.kill("SIGTERM"); } catch {}
  }
  server.close();
  setTimeout(() => process.exit(0), 500);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
