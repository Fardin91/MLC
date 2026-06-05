const ESP32_URL_STORAGE_KEY = "mlcEsp32BaseUrl";

function normalizeEsp32BaseUrl(url) {
  const trimmedUrl = String(url || "").trim().replace(/\/+$/, "");

  if (!trimmedUrl) {
    return "";
  }

  return /^https?:\/\//i.test(trimmedUrl)
    ? trimmedUrl
    : `http://${trimmedUrl}`;
}

function getEsp32BaseUrl() {
  return localStorage.getItem(ESP32_URL_STORAGE_KEY) || "";
}

function setEsp32BaseUrl(url) {
  const normalizedUrl = normalizeEsp32BaseUrl(url);

  if (!normalizedUrl) {
    localStorage.removeItem(ESP32_URL_STORAGE_KEY);
    return "";
  }

  localStorage.setItem(ESP32_URL_STORAGE_KEY, normalizedUrl);
  return normalizedUrl;
}

function requireEsp32BaseUrl() {
  const esp32BaseUrl = getEsp32BaseUrl();

  if (!esp32BaseUrl) {
    throw new Error("ESP32 URL is not configured");
  }

  return esp32BaseUrl;
}

function sendEsp32Request(params) {
  const query = new URLSearchParams(params);
  const url = `${requireEsp32BaseUrl()}/data?${query.toString()}`;

  return fetch(url).catch((error) => {
    console.error("Error:", error);
    throw error;
  });
}

function sendEsp32Command(command, value) {
  sendEsp32Request({
    cmd: command,
    value: clampByte(value).toString(),
  });
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbFromHex(color) {
  const normalized = color.replace("#", "");
  return {
    r: parseInt(normalized.substring(0, 2), 16),
    g: parseInt(normalized.substring(2, 4), 16),
    b: parseInt(normalized.substring(4, 6), 16),
  };
}

function sendMatrixPixel(pixelIndex, color) {
  const { r, g, b } = rgbFromHex(color);
  return sendEsp32Request({
    cmd: "D",
    pixel: clampByte(pixelIndex).toString(),
    r: clampByte(r).toString(),
    g: clampByte(g).toString(),
    b: clampByte(b).toString(),
  });
}

function sendMatrixFill(color) {
  const { r, g, b } = rgbFromHex(color);
  return sendEsp32Request({
    cmd: "F",
    r: clampByte(r).toString(),
    g: clampByte(g).toString(),
    b: clampByte(b).toString(),
  });
}

function sendBrightness(value) {
  sendEsp32Command("B", value);
}

function sendSpeed(value) {
  const intervalMs = Math.max(5, Math.round(Number(value) || 5));
  sendEsp32Command("I", intervalMs);
}

function sendPlayAnimation(animationId) {
  const safeId = Math.max(1, Math.round(Number(animationId) || 1));
  return sendEsp32Request({
    cmd: "P",
    id: safeId.toString(),
  });
}

function sendHaltAnimation() {
  return sendEsp32Request({
    cmd: "H",
  });
}

function sendHostIpToEsp32(hostIp) {
  return sendEsp32Request({
    cmd: "S",
    host: hostIp,
  });
}

async function fetchHostIpForEsp32() {
  const response = await fetch("http://localhost:3000/api/host-ip");
  if (!response.ok) {
    throw new Error("Failed to fetch host IP");
  }

  const payload = await response.json();
  const hostIp = String(payload?.hostIp || "").trim();
  if (!hostIp) {
    throw new Error("Host IP missing from backend response");
  }
  return hostIp;
}

let isDemoMode = false;
let dbConnected = false;
let espConnected = false;
let hostIpSynced = false;
const DEMO_MODE_STORAGE_KEY = "mlcDemoModeEnabled";

const dbImg = document.getElementById("database");
const espImg = document.getElementById("esp32");
const dbCard = document.getElementById("database-card");
const espCard = document.getElementById("esp32-card");
const demoCard = document.getElementById("demo-card");
const savedFeature = document.getElementById("savedFeature");
const drawFeature = document.getElementById("drawFeature");
const createFeature = document.getElementById("createFeature");

function setConnectionState(card, state) {
  if (!card) return;

  card.classList.remove("is-checking", "is-connected", "is-error", "is-demo");
  if (state) {
    card.classList.add(state);
  }
}

function setFeatureEnabled(feature, enabled) {
  if (!feature) return;
  feature.classList.toggle("is-disabled", !enabled);
  feature.setAttribute("aria-disabled", enabled ? "false" : "true");
}

function applyFeatureAccess() {
  if (isDemoMode || (dbConnected && espConnected)) {
    setFeatureEnabled(savedFeature, true);
    setFeatureEnabled(drawFeature, true);
    setFeatureEnabled(createFeature, true);
    return;
  }

  if (dbConnected && !espConnected) {
    setFeatureEnabled(savedFeature, false);
    setFeatureEnabled(drawFeature, false);
    setFeatureEnabled(createFeature, true);
    return;
  }

  if (!dbConnected && espConnected) {
    setFeatureEnabled(savedFeature, false);
    setFeatureEnabled(drawFeature, true);
    setFeatureEnabled(createFeature, false);
    return;
  }

  setFeatureEnabled(savedFeature, false);
  setFeatureEnabled(drawFeature, false);
  setFeatureEnabled(createFeature, false);
}

function updateDemoAvailability() {
  if (!demoCard) return;
  const fullyConnected = dbConnected && espConnected;
  demoCard.disabled = fullyConnected;
  demoCard.title = fullyConnected
    ? "Demo mode unavailable while fully connected"
    : "Enable demo mode";
}

function enableDemoMode() {
  isDemoMode = true;
  dbConnected = false;
  espConnected = false;
  hostIpSynced = false;
  window.isDemoMode = true;
  localStorage.setItem(DEMO_MODE_STORAGE_KEY, "1");

  setConnectionState(dbCard, null);
  setConnectionState(espCard, null);
  setConnectionState(demoCard, "is-demo");

  if (dbImg) {
    dbImg.title = "Database check disabled in demo mode";
  }
  if (espImg) {
    espImg.title = "ESP32 check disabled in demo mode";
  }
  if (demoCard) {
    demoCard.disabled = false;
    demoCard.title = "Demo mode enabled (click DB or ESP to exit)";
  }

  applyFeatureAccess();
  updateDemoAvailability();
}

function exitDemoMode() {
  if (!isDemoMode) return;

  isDemoMode = false;
  window.isDemoMode = false;
  localStorage.removeItem(DEMO_MODE_STORAGE_KEY);
  setConnectionState(demoCard, null);

  if (demoCard) {
    demoCard.title = "Enable demo mode";
  }
}

async function syncHostIpToEsp() {
  const hostIp = await fetchHostIpForEsp32();
  await sendHostIpToEsp32(hostIp);
  hostIpSynced = true;
  if (espImg) {
    espImg.title = `ESP32 Connected (DB host synced: ${hostIp})`;
  }
}

async function connectDatabaseOnly() {
  exitDemoMode();

  setConnectionState(dbCard, "is-checking");
  dbConnected = false;

  try {
    const response = await fetch("http://localhost:3000/api/status");
    dbConnected = response.ok;
    setConnectionState(dbCard, dbConnected ? "is-connected" : "is-error");
    if (dbImg) {
      dbImg.title = dbConnected
        ? "Database Connected"
        : "Database Not Connected";
    }
  } catch (error) {
    console.error("Database check failed:", error);
    dbConnected = false;
    setConnectionState(dbCard, "is-error");
    if (dbImg) {
      dbImg.title = "Database Not Connected";
    }
  }

  applyFeatureAccess();
  updateDemoAvailability();
}

async function connectEspOnly() {
  exitDemoMode();

  const currentEspUrl = getEsp32BaseUrl();
  const enteredEspUrl = window.prompt(
    "Paste the ESP32 URL, for example: http://192.168.1.42",
    currentEspUrl,
  );

  if (enteredEspUrl === null) {
    applyFeatureAccess();
    updateDemoAvailability();
    return;
  }

  const esp32BaseUrl = setEsp32BaseUrl(enteredEspUrl);

  if (!esp32BaseUrl) {
    alert("Please enter a valid ESP32 URL.");
    applyFeatureAccess();
    updateDemoAvailability();
    return;
  }

  setConnectionState(espCard, "is-checking");
  espConnected = false;
  hostIpSynced = false;

  try {
    const espResponse = await fetch(`${esp32BaseUrl}/status`);
    if (!espResponse.ok) {
      throw new Error("ESP status not OK");
    }

    espConnected = true;
    setConnectionState(espCard, "is-connected");
    if (espImg) {
      espImg.title = `ESP32 Connected (${getEsp32BaseUrl()})`;
    }

    if (dbConnected) {
      try {
        await syncHostIpToEsp();
      } catch (error) {
        hostIpSynced = false;
        console.error("Failed to sync DB host IP to ESP32:", error);
        if (espImg) {
          espImg.title = "ESP32 connected, but host IP sync failed";
        }
      }
    }
  } catch (error) {
    console.error("ESP32 check failed:", error);
    espConnected = false;
    setConnectionState(espCard, "is-error");
    if (espImg) {
      espImg.title = "ESP32 Not Connected";
    }
  }

  applyFeatureAccess();
  updateDemoAvailability();
}

async function hydrateConnectionStateOnLoad() {
  const demoPersisted = localStorage.getItem(DEMO_MODE_STORAGE_KEY) === "1";
  if (demoPersisted) {
    enableDemoMode();
    return;
  }

  let dbOk = false;
  let espOk = false;

  try {
    const dbResponse = await fetch("http://localhost:3000/api/status");
    dbOk = dbResponse.ok;
  } catch (error) {
    dbOk = false;
  }

  const configuredEspUrl = getEsp32BaseUrl();
  if (configuredEspUrl) {
    try {
      const espResponse = await fetch(`${configuredEspUrl}/status`);
      espOk = espResponse.ok;
    } catch (error) {
      espOk = false;
    }
  }

  dbConnected = dbOk;
  espConnected = espOk;

  if (dbConnected) {
    setConnectionState(dbCard, "is-connected");
    if (dbImg) {
      dbImg.title = "Database Connected";
    }
  } else {
    setConnectionState(dbCard, null);
  }

  if (espConnected) {
    setConnectionState(espCard, "is-connected");
    if (espImg) {
      espImg.title = `ESP32 Connected (${getEsp32BaseUrl()})`;
    }
  } else {
    setConnectionState(espCard, null);
  }

  if (dbConnected && espConnected) {
    try {
      await syncHostIpToEsp();
    } catch (error) {
      hostIpSynced = false;
      console.error("Failed to sync DB host IP to ESP32:", error);
    }
  }

  applyFeatureAccess();
  updateDemoAvailability();
}

window.isDemoMode = isDemoMode;
window.sendMatrixPixel = sendMatrixPixel;
window.sendMatrixFill = sendMatrixFill;
window.sendPlayAnimation = sendPlayAnimation;
window.sendHaltAnimation = sendHaltAnimation;
window.sendBrightness = sendBrightness;
window.sendSpeed = sendSpeed;

if (dbCard) {
  dbCard.addEventListener("click", connectDatabaseOnly);
}
if (espCard) {
  espCard.addEventListener("click", connectEspOnly);
}
if (demoCard) {
  demoCard.addEventListener("click", enableDemoMode);
}

applyFeatureAccess();
hydrateConnectionStateOnLoad();
