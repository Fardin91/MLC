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
