const GEMINI_MODEL = "gemini-3.1-flash-lite";
const MATRIX_PIXELS = 256;
const SEND_DELAY_MS = 30;

const panel = document.querySelector(".gemini-panel");
const apiKeyInput = document.querySelector("#geminiApiKey");
const promptInput = document.querySelector("#geminiPrompt");
const okBtn = document.querySelector(".gemini-ok");
const sendEspBtn = document.querySelector(".gemini-send-esp");
const statusEl = document.querySelector(".gemini-status");
const toolButtons = document.querySelectorAll(".btn-edit[data-mode]");
const colorPickers = document.querySelectorAll(".color-picker");
const brightnessRanges = document.querySelectorAll(".brightness-range");

let generatedFrame = null;

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setGenerationBusy(isBusy) {
  toolButtons.forEach((btn) => {
    btn.disabled = isBusy;
  });
  colorPickers.forEach((picker) => {
    picker.disabled = isBusy;
  });
  brightnessRanges.forEach((slider) => {
    slider.disabled = isBusy;
  });
  if (apiKeyInput) apiKeyInput.disabled = isBusy;
  if (okBtn) okBtn.disabled = isBusy;
}

function normalizePixel(pixel) {
  if (!Array.isArray(pixel) || pixel.length < 3) return null;
  const rgb = pixel.slice(0, 3).map((value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.max(0, Math.min(255, Math.round(parsed)));
  });
  return rgb.includes(null) ? null : rgb;
}

function extractJsonArray(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function parseTripletsFallback(rawResponse) {
  const text = String(rawResponse || "");
  const triplets = [];
  const regex =
    /\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,?\s*\]/g;

  let match = regex.exec(text);
  while (match) {
    const pixel = normalizePixel([match[1], match[2], match[3]]);
    if (pixel) triplets.push(pixel);
    if (triplets.length === MATRIX_PIXELS) break;
    match = regex.exec(text);
  }
  return triplets.length > 0 ? triplets : null;
}

function normalizeFrameLength(pixels) {
  if (!Array.isArray(pixels) || pixels.length === 0) return null;
  if (pixels.length === MATRIX_PIXELS) return pixels;

  const normalized = pixels.slice(0, MATRIX_PIXELS);
  while (normalized.length < MATRIX_PIXELS) {
    normalized.push([0, 0, 0]);
  }
  return normalized;
}

function parseGeminiPixels(rawResponse) {
  const text = String(rawResponse || "").trim();
  const direct = extractJsonArray(text);
  if (!direct) return normalizeFrameLength(parseTripletsFallback(text));

  let parsed;
  try {
    parsed = JSON.parse(direct);
  } catch (error) {
    return normalizeFrameLength(parseTripletsFallback(text));
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return normalizeFrameLength(parseTripletsFallback(text));
  }

  const normalized = parsed.map(normalizePixel);
  if (normalized.some((pixel) => pixel === null)) {
    return normalizeFrameLength(parseTripletsFallback(text));
  }
  return normalizeFrameLength(normalized);
}

async function requestGeminiFrame(apiKey, promptText, options = {}) {
  const requireVisiblePixels = Boolean(options.requireVisiblePixels);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const instruction = [
    "You are creating one frame for a 16x16 LED matrix.",
    "Return only valid JSON.",
    "Output exactly one array with 256 items.",
    "Each item must be [R,G,B] using integers 0..255.",
    "No markdown, no code block, no extra text.",
    requireVisiblePixels
      ? "Important: at least 20 pixels must be non-black and match the requested object."
      : "",
  ].join(" ");

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `${instruction}\nUser request: ${promptText}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    const msg = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${msg}`);
  }

  const data = await response.json();
  const outputText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("\n") ||
    JSON.stringify(data?.candidates?.[0]?.content?.parts?.[0] || "");

  const pixels = parseGeminiPixels(outputText);
  if (!pixels) {
    throw new Error("Gemini output is not a valid 256-pixel RGB array.");
  }

  return pixels;
}

function rgbToHex(rgb) {
  return `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function countLitPixels(framePixels) {
  if (!Array.isArray(framePixels)) return 0;
  let count = 0;
  for (let i = 0; i < framePixels.length; i++) {
    const hex = rgbToHex(framePixels[i] || [0, 0, 0]).toLowerCase();
    if (hex !== "#000000") count += 1;
  }
  return count;
}

function drawFrameOnVirtualMatrix(framePixels) {
  if (!Array.isArray(framePixels) || framePixels.length !== MATRIX_PIXELS)
    return;

  const matrixGrids = document.querySelectorAll(".matrix-grid");
  if (!matrixGrids.length) return;

  const offColor = "#0F172A";

  for (let i = 0; i < MATRIX_PIXELS; i++) {
    const x = i % 16;
    const y = Math.floor(i / 16);
    const hex = rgbToHex(framePixels[i]);
    const color = hex.toLowerCase() === "#000000" ? offColor : hex;

    matrixGrids.forEach((grid) => {
      const cell = grid.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
      if (cell) cell.style.backgroundColor = color;
    });
  }
}

async function handleGeminiPrompt() {
  const apiKey = apiKeyInput?.value?.trim();
  const promptText = promptInput?.value?.trim();
  if (!apiKey) {
    setStatus("Please enter your Gemini API key.");
    return;
  }
  if (!promptText) {
    setStatus("Please enter what Gemini should draw.");
    return;
  }

  try {
    setGenerationBusy(true);
    sendEspBtn.hidden = true;
    setStatus("Generating frame...");
    let pixels = await requestGeminiFrame(apiKey, promptText);
    let litPixels = countLitPixels(pixels);

    if (litPixels === 0) {
      setStatus("Got all-black frame. Retrying with stricter instructions...");
      pixels = await requestGeminiFrame(apiKey, promptText, {
        requireVisiblePixels: true,
      });
      litPixels = countLitPixels(pixels);
    }

    generatedFrame = pixels;

    if (typeof window.loadFrameToMatrix === "function") {
      window.loadFrameToMatrix(pixels);
    } else {
      drawFrameOnVirtualMatrix(pixels);
    }

    sendEspBtn.hidden = false;
    setStatus(`Frame generated (${litPixels}/256 lit).`);
  } catch (error) {
    console.error(error);
    if (error?.name === "AbortError") {
      setStatus("Gemini request timed out. Please try again.");
    } else {
      setStatus(error.message || "Gemini request failed.");
    }
  } finally {
    setGenerationBusy(false);
  }
}

async function sendPixelWithTimeout(pixelIndex, hexColor, timeoutMs) {
  const sender = window.sendMatrixPixel(pixelIndex, hexColor);
  const timeout = delay(timeoutMs).then(() => {
    throw new Error("timeout");
  });
  return Promise.race([sender, timeout]);
}

async function sendGeneratedFrameToEsp() {
  if (!generatedFrame || generatedFrame.length !== MATRIX_PIXELS) {
    setStatus("No generated frame to send.");
    return;
  }

  if (
    typeof window.sendMatrixPixel !== "function" ||
    typeof window.sendMatrixFill !== "function"
  ) {
    setStatus("ESP32 sender is not available.");
    return;
  }

  sendEspBtn.disabled = true;
  okBtn.disabled = true;
  const frameToSend = generatedFrame.slice();
  promptInput.value = "";
  sendEspBtn.hidden = true;
  generatedFrame = null;

  try {
    await window.sendMatrixFill("#000000");
    await delay(30);

    let failed = 0;
    let sent = 0;
    for (let i = 0; i < frameToSend.length; i++) {
      const rgb = frameToSend[i] || [0, 0, 0];
      const shouldSend = rgb[0] !== 0 || rgb[1] !== 0 || rgb[2] !== 0;
      if (!shouldSend) {
        continue;
      }

      const hex = rgbToHex(rgb);
      try {
        await sendPixelWithTimeout(i, hex, 300);
        sent += 1;
      } catch (error) {
        failed += 1;
      }
      if (i % 32 === 0 || i === frameToSend.length - 1) {
        setStatus(`Sending to ESP32... ${i + 1}/256 (sent ${sent})`);
      }
      await delay(SEND_DELAY_MS);
    }
    if (failed === 0) {
      setStatus("Frame sent to ESP32.");
    } else {
      setStatus(`Frame sent with ${failed} dropped pixel request(s).`);
    }
  } catch (error) {
    console.error(error);
    setStatus("Failed while sending to ESP32.");
  } finally {
    sendEspBtn.disabled = false;
    okBtn.disabled = false;
  }
}

if (panel && okBtn && sendEspBtn && promptInput) {
  okBtn.addEventListener("click", handleGeminiPrompt);
  sendEspBtn.addEventListener("click", sendGeneratedFrameToEsp);
}
