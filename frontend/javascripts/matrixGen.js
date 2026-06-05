const size = 16;

// Matrix state (null = OFF, otherwise store color)
const matrix = Array.from({ length: size }, () =>
  Array(size).fill(null)
);

const matrixContainers = document.querySelectorAll(".matrix-grid");
const wrappers = document.querySelectorAll(".matrix-wrapper");
const colourpickers = document.querySelectorAll(".color-picker");

let currentColor = "#ffffff";
let cellOffColor = "#0F172A";
let isPointerDown = false;

// Modes
let mode = "draw"; // "draw" | "erase" | "fill"

function getPixelIndex(x, y) {
  return y * size + x;
}

function rgbArrayToHex(rgb) {
  if (!Array.isArray(rgb) || rgb.length !== 3) return "#000000";
  return `#${rgb.map((value) => {
    const clamped = Math.max(0, Math.min(255, Number(value) || 0));
    return clamped.toString(16).padStart(2, "0");
  }).join("")}`;
}

// --------------------
// GRID CREATION
// --------------------
function matrixGenerator() {
  matrixContainers.forEach((matrixContainer) => {
    matrixContainer.innerHTML = "";

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");

        cell.dataset.x = x;
        cell.dataset.y = y;

        cell.style.backgroundColor = cellOffColor;
        cell.addEventListener("click", () => {
          if (mode === "fill") {
            handleCellClick(x, y);
          }
        });
        cell.addEventListener("mousedown", (event) => {
          if (event.button !== 0) return;
          isPointerDown = true;
          if (mode === "draw" || mode === "erase") {
            handleCellClick(x, y);
          }
        });
        cell.addEventListener("mouseenter", () => {
          if (!isPointerDown) return;
          if (mode === "draw" || mode === "erase") {
            handleCellClick(x, y);
          }
        });

        matrixContainer.appendChild(cell);
      }
    }
  });
}

function addAxisLabels() {
  const rootStyles = getComputedStyle(document.documentElement);
  const cellSize = parseFloat(rootStyles.getPropertyValue("--matrix-cell-size")) || 34;

  wrappers.forEach((wrapper) => {
    wrapper.querySelectorAll(".axis-label").forEach((label) => label.remove());

    for (let i = 1; i <= size; i++) {
      if (i % 4 === 0) {
        const value = i;

        const top = document.createElement("div");
        top.classList.add("axis-label");
        top.innerText = value;
        top.style.left = `${i * cellSize-cellSize/2}px`;
        top.style.top = `-20px`;
        wrapper.appendChild(top);

        const bottom = document.createElement("div");
        bottom.classList.add("axis-label");
        bottom.innerText = value;
        bottom.style.left = `${i * cellSize -cellSize/2}px`;
        bottom.style.bottom = `-20px`;
        wrapper.appendChild(bottom);

        const left = document.createElement("div");
        left.classList.add("axis-label");
        left.innerText = value;
        left.style.top = `${i * cellSize-cellSize/2}px`;
        left.style.left = `-20px`;
        wrapper.appendChild(left);

        const right = document.createElement("div");
        right.classList.add("axis-label");
        right.innerText = value;
        right.style.top = `${i * cellSize-cellSize/2}px`;
        right.style.right = `-20px`;
        wrapper.appendChild(right);
      }
    }
  });
}

// --------------------
// CELL CLICK HANDLER
// --------------------
function handleCellClick(x, y) {
  const pixelIndex = getPixelIndex(x, y);

  if (mode === "erase") {
    matrix[y][x] = null;
    updateCellVisuals(x, y, cellOffColor);
    if (window.frameCreator?.onMatrixPixelEdit) {
      window.frameCreator.onMatrixPixelEdit(pixelIndex, "#000000");
    }
    if (typeof window.sendMatrixPixel === "function") {
      window.sendMatrixPixel(pixelIndex, "#000000");
    }
  }

  else if (mode === "draw") {
    matrix[y][x] = currentColor;
    updateCellVisuals(x, y, currentColor);
    if (window.frameCreator?.onMatrixPixelEdit) {
      window.frameCreator.onMatrixPixelEdit(pixelIndex, currentColor);
    }
    if (typeof window.sendMatrixPixel === "function") {
      window.sendMatrixPixel(pixelIndex, currentColor);
    }
  }

  else if (mode === "fill") {
    fillAllCells(currentColor);
    if (window.frameCreator?.onMatrixFillEdit) {
      window.frameCreator.onMatrixFillEdit(currentColor);
    }
    if (typeof window.sendMatrixFill === "function") {
      window.sendMatrixFill(currentColor);
    }
  }
}

document.addEventListener("mouseup", () => {
  isPointerDown = false;
});

function updateCellVisuals(x, y, color) {
  matrixContainers.forEach((matrixContainer) => {
    const cell = matrixContainer.querySelector(
      `.cell[data-x="${x}"][data-y="${y}"]`
    );

    if (cell) {
      cell.style.backgroundColor = color;
    }
  });
}

// --------------------
// FILL FUNCTION
// --------------------
function fillAllCells(color) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      matrix[y][x] = color;
      updateCellVisuals(x, y, color);
    }
  }
}

function loadFrameToMatrix(framePixels) {
  if (!Array.isArray(framePixels)) return;

  for (let pixelIndex = 0; pixelIndex < size * size; pixelIndex++) {
    const x = pixelIndex % size;
    const y = Math.floor(pixelIndex / size);
    const rgb = framePixels[pixelIndex] || [0, 0, 0];
    const hex = rgbArrayToHex(rgb);
    const isOff = hex.toLowerCase() === "#000000";

    matrix[y][x] = isOff ? null : hex;
    updateCellVisuals(x, y, isOff ? cellOffColor : hex);
  }
}

window.loadFrameToMatrix = loadFrameToMatrix;

// --------------------
// COLOR PICKER
// --------------------
if (colourpickers.length > 0) {
  currentColor = colourpickers[0].value;

  colourpickers.forEach((colourpicker) => {
    colourpicker.value = currentColor;

    colourpicker.addEventListener("input", () => {
      currentColor = colourpicker.value;

      colourpickers.forEach((otherPicker) => {
        if (otherPicker !== colourpicker) {
          otherPicker.value = currentColor;
        }
      });
    });
  });
}

// --------------------
// INIT
// --------------------
matrixGenerator();
addAxisLabels();
setMode("draw");
if (window.frameCreator?.renderCurrentFrame) {
  window.frameCreator.renderCurrentFrame();
}

document.querySelectorAll(".btn-edit[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
  });
});

// --------------------
// MODE SWITCHING
// --------------------
function setMode(newMode) {
  if (!["draw", "erase", "fill"].includes(newMode)) {
    return;
  }

  mode = newMode;

  document.querySelectorAll(".btn-edit").forEach(btn =>
    btn.classList.remove("active")
  );

  const cursorByMode = {
    erase: "url('images/eraserC.png') 8 8, auto",
    draw: "url('images/pencilC.png') 8 8, auto",
    fill: "url('images/fillC.png') 8 8, auto"
  };

  matrixContainers.forEach((container) => {
    container.style.cursor = cursorByMode[mode] || "auto";
    container.querySelectorAll(".cell").forEach((cell) => {
      cell.style.cursor = cursorByMode[mode] || "auto";
    });
  });

  document.querySelectorAll(`.btn-edit[data-mode="${mode}"]`).forEach((btn) => {
    btn.classList.add("active");
  });
}

window.setMode = setMode;
