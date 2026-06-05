const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const API_PORT = 3000;
const projectDir = __dirname;
const databaseDir = path.join(projectDir, "backend");
const databaseServer = path.join(databaseDir, "index.js");

let apiProcess = null;
let shuttingDown = false;
let tunnelProcess = null;
let tunnelUrl = null;

function log(message = "") {
  console.log(message);
}

function fail(message) {
  console.error(`ERROR: ${message}`);
}

function getLocalNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  Object.values(interfaces).forEach((interfaceEntries) => {
    if (!interfaceEntries) {
      return;
    }

    interfaceEntries.forEach((entry) => {
      if (entry.family === "IPv4" && !entry.internal) {
        addresses.push(entry.address);
      }
    });
  });

  return addresses;
}

function logApiAddresses() {
  const localAddresses = getLocalNetworkAddresses();

  log(`Database API listening on http://localhost:${API_PORT}`);

  if (localAddresses.length > 0) {
    log(
      "If another device needs to connect, use one of these local IP addresses:",
    );
    localAddresses.forEach((address) => log(`  http://${address}:${API_PORT}`));
  } else {
    log(
      "No non-internal network address detected. Use http://localhost:3000 locally.",
    );
  }
}

function startApiServer() {
  log(`Starting database API on http://localhost:${API_PORT} ...`);

  apiProcess = spawn("node", ["index.js"], {
    cwd: databaseDir,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  apiProcess.on("exit", (code) => {
    if (!shuttingDown) {
      fail(`Database API stopped unexpectedly with code ${code}.`);
      shutdown(code || 1);
    }
  });
}

function startLocalTunnel() {
  // Attempt to start localtunnel via npx so GitHub Pages (HTTPS) can reach the local API.
  // This will spawn: `npx localtunnel --port 3000`
  try {
    log("Starting LocalTunnel (npx localtunnel --port 3000)...");
    tunnelProcess = spawn("npx", ["localtunnel", "--port", String(API_PORT)], {
      cwd: projectDir,
      shell: process.platform === "win32",
    });

    tunnelProcess.stdout.on("data", (chunk) => {
      const text = String(chunk).trim();
      // localtunnel prints the assigned URL; capture any https://... URL
      const m = text.match(/https?:\/\/[^\s]+/i);
      if (m) {
        tunnelUrl = m[0].replace(/\/+$/, "");
        log(`LocalTunnel URL: ${tunnelUrl}`);
      } else {
        // still log tunnel output for diagnostics
        log(`[localtunnel] ${text}`);
      }
    });

    tunnelProcess.stderr.on("data", (chunk) => {
      const text = String(chunk).trim();
      log(`[localtunnel] ERR ${text}`);
    });

    tunnelProcess.on("error", (err) => {
      log(`LocalTunnel start failed: ${err.message}`);
      log("If LocalTunnel is not available, install it or use 'npx localtunnel --port 3000' manually.");
    });

    tunnelProcess.on("exit", (code, signal) => {
      if (!shuttingDown) {
        log(`LocalTunnel exited (code=${code} signal=${signal})`);
      }
    });
  } catch (err) {
    log(`Could not start LocalTunnel: ${err.message}`);
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  log();
  log("Stopping MLC database API...");

  if (apiProcess && !apiProcess.killed) {
    apiProcess.kill();
  }

  if (tunnelProcess && !tunnelProcess.killed) {
    try {
      tunnelProcess.kill();
    } catch (e) {
      // ignore
    }
  }

  setTimeout(() => process.exit(exitCode), 300);
}

async function main() {
  log("Matrix Light Control database launcher");
  log();

  if (!fs.existsSync(databaseServer)) {
    fail(`Could not find ${databaseServer}`);
    log("Keep mlc.js inside the Code folder, next to backend and frontend.");
    return 1;
  }

  if (!fs.existsSync(path.join(databaseDir, "node_modules"))) {
    log("Warning: backend/node_modules was not found.");
    log(`If the API fails, run: cd "${databaseDir}" && npm install`);
    log();
  }

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  startApiServer();

  // Start LocalTunnel so remote devices (HTTPS pages) can reach the local API.
  // This uses `npx localtunnel --port 3000` and prints the HTTPS URL when assigned.
  startLocalTunnel();

  log();
  logApiAddresses();
  log();
  log("MLC database API is running.");
  log("Press Ctrl+C in this window to stop the database.");
  return 0;
}

main().catch((error) => {
  fail(error.message);
  shutdown(1);
});
