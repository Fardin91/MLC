const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const WEB_PORT = 5500;
const API_PORT = 3000;

const projectDir = __dirname;
const websiteDir = path.join(projectDir, "frontend");
const websiteRoot = path.resolve(websiteDir);
const databaseDir = path.join(projectDir, "backend");
const indexFile = path.join(websiteDir, "index.html");
const databaseServer = path.join(databaseDir, "index.js");
const websiteUrl = `http://localhost:${WEB_PORT}/index.html`;

const contentTypes = {
  ".css": "text/css",
  ".gif": "image/gif",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
};

let apiProcess = null;
let webServer = null;
let shuttingDown = false;

function log(message = "") {
  console.log(message);
}

function fail(message) {
  console.error(`ERROR: ${message}`);
}

function openBrowser(url) {
  const platform = process.platform;

  if (platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  if (platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
}

function safeResolveUrlPath(requestUrl) {
  const parsedUrl = new URL(requestUrl, `http://localhost:${WEB_PORT}`);
  const decodedPath = decodeURIComponent(parsedUrl.pathname);
  const normalizedPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const filePath = path.resolve(websiteRoot, `.${normalizedPath}`);
  const relativePath = path.relative(websiteRoot, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }

  return filePath;
}

function serveStaticFile(req, res) {
  const filePath = safeResolveUrlPath(req.url);

  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = contentTypes[extension] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  });
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

function startWebsiteServer() {
  return new Promise((resolve, reject) => {
    webServer = http.createServer(serveStaticFile);

    webServer.on("error", reject);
    webServer.listen(WEB_PORT, () => {
      log(`Starting website server on http://localhost:${WEB_PORT} ...`);
      resolve();
    });
  });
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  log();
  log("Stopping MLC servers...");

  if (webServer) {
    webServer.close();
  }

  if (apiProcess && !apiProcess.killed) {
    apiProcess.kill();
  }

  setTimeout(() => process.exit(exitCode), 300);
}

async function main() {
  log("Matrix Light Control launcher");
  log();

  if (!fs.existsSync(indexFile)) {
    fail(`Could not find ${indexFile}`);
    log("Keep mlc.js inside the Code folder, next to backend and frontend.");
    return 1;
  }

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
  await startWebsiteServer();

  setTimeout(() => {
    log(`Opening ${websiteUrl}`);
    openBrowser(websiteUrl);
  }, 1000);

  log();
  log("MLC is running.");
  log("Press Ctrl+C in this window to stop both servers.");
  return 0;
}

main().catch((error) => {
  fail(error.message);
  shutdown(1);
});
