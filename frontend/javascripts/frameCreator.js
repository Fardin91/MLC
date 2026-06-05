const FRAME_PIXEL_COUNT = 16 * 16;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgbArray(hexColor) {
  const clean = (hexColor || "#000000").replace("#", "");
  const value = clean.length === 3
    ? clean.split("").map((ch) => ch + ch).join("")
    : clean.padStart(6, "0");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16)
  ];
}

function createFrameCreator() {
  let frameCount = 1;
  let currentFrameIndex = 0;
  let pixels = [];
  let statusEl = null;
  let prevLabelEl = null;
  let nextLabelEl = null;
  let prevPreviewEl = null;
  let nextPreviewEl = null;
  let prevGridEl = null;
  let nextGridEl = null;

  function offset(frameIndex, pixelIndex) {
    return frameIndex * FRAME_PIXEL_COUNT + pixelIndex;
  }

  function initStorage() {
    pixels = Array.from(
      { length: frameCount * FRAME_PIXEL_COUNT },
      () => [0, 0, 0]
    );
  }

  function updateFrameLabel() {
    if (!statusEl) return;
    statusEl.textContent = `${currentFrameIndex + 1}/${frameCount}`;
    renderNeighborPreviews();
  }

  function rgbArrayToHex(rgb) {
    if (!Array.isArray(rgb) || rgb.length !== 3) return "#0f172a";
    return `#${rgb.map((value) => {
      const clamped = Math.max(0, Math.min(255, Number(value) || 0));
      return clamped.toString(16).padStart(2, "0");
    }).join("")}`;
  }

  function getFramePixels(frameIndex) {
    if (frameIndex < 0 || frameIndex >= frameCount) return null;
    const start = offset(frameIndex, 0);
    const end = start + FRAME_PIXEL_COUNT;
    return pixels.slice(start, end);
  }

  function ensurePreviewCells(gridEl) {
    if (!gridEl || gridEl.children.length === FRAME_PIXEL_COUNT) return;
    gridEl.innerHTML = "";
    for (let i = 0; i < FRAME_PIXEL_COUNT; i++) {
      const cell = document.createElement("div");
      cell.className = "frame-preview-cell";
      gridEl.appendChild(cell);
    }
  }

  function paintPreview(gridEl, framePixels) {
    if (!gridEl) return;
    ensurePreviewCells(gridEl);
    for (let i = 0; i < FRAME_PIXEL_COUNT; i++) {
      const cell = gridEl.children[i];
      const rgb = framePixels && framePixels[i] ? framePixels[i] : [0, 0, 0];
      cell.style.backgroundColor = rgbArrayToHex(rgb);
    }
  }

  function renderNeighborPreviews() {
    const prevIndex = currentFrameIndex - 1;
    const nextIndex = currentFrameIndex + 1;

    if (prevLabelEl) {
      prevLabelEl.textContent = prevIndex >= 0 ? `${prevIndex + 1}/${frameCount}` : "-";
    }
    if (nextLabelEl) {
      nextLabelEl.textContent = nextIndex < frameCount ? `${nextIndex + 1}/${frameCount}` : "-";
    }

    if (prevPreviewEl) {
      prevPreviewEl.classList.toggle("is-empty", prevIndex < 0);
    }
    if (nextPreviewEl) {
      nextPreviewEl.classList.toggle("is-empty", nextIndex >= frameCount);
    }

    paintPreview(prevGridEl, getFramePixels(prevIndex));
    paintPreview(nextGridEl, getFramePixels(nextIndex));
  }

  function renderCurrentFrame() {
    if (typeof window.loadFrameToMatrix !== "function") return;
    const start = offset(currentFrameIndex, 0);
    const end = start + FRAME_PIXEL_COUNT;
    window.loadFrameToMatrix(pixels.slice(start, end));
    updateFrameLabel();
  }

  function setFrame(frameIndex) {
    currentFrameIndex = clamp(frameIndex, 0, frameCount - 1);
    renderCurrentFrame();
  }

  function setCurrentPixel(pixelIndex, rgb) {
    if (pixelIndex < 0 || pixelIndex >= FRAME_PIXEL_COUNT) return;
    pixels[offset(currentFrameIndex, pixelIndex)] = rgb;
  }

  function fillCurrentFrame(rgb) {
    const start = offset(currentFrameIndex, 0);
    const end = start + FRAME_PIXEL_COUNT;
    for (let i = start; i < end; i++) {
      pixels[i] = rgb;
    }
  }

  function init() {
    statusEl = document.getElementById("matrixFrameStatus");
    prevLabelEl = document.getElementById("prevFrameLabel");
    nextLabelEl = document.getElementById("nextFrameLabel");
    prevPreviewEl = document.getElementById("prevFramePreview");
    nextPreviewEl = document.getElementById("nextFramePreview");
    prevGridEl = document.getElementById("prevFrameGrid");
    nextGridEl = document.getElementById("nextFrameGrid");
    const prev = document.getElementById("framePrev");
    const next = document.getElementById("frameNext");

    const savedConfig = sessionStorage.getItem("mlcPendingAnimation");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        frameCount = Math.max(1, Number(parsed.frameCount) || 1);
      } catch (error) {
        console.error("Could not parse saved animation config:", error);
      }
    }

    initStorage();
    updateFrameLabel();

    prev?.addEventListener("click", () => setFrame(currentFrameIndex - 1));
    next?.addEventListener("click", () => setFrame(currentFrameIndex + 1));
  }

  return {
    init,
    renderCurrentFrame,
    onMatrixPixelEdit(pixelIndex, hexColor) {
      setCurrentPixel(pixelIndex, hexToRgbArray(hexColor));
    },
    onMatrixFillEdit(hexColor) {
      fillCurrentFrame(hexToRgbArray(hexColor));
      renderCurrentFrame();
    },
    getCurrentFrameIndex() {
      return currentFrameIndex;
    },
    getFrameCount() {
      return frameCount;
    },
    getAllPixels() {
      return pixels;
    },
    getFramePixels(frameIndex) {
      return getFramePixels(frameIndex);
    }
  };
}

window.frameCreator = createFrameCreator();
window.frameCreator.init();
