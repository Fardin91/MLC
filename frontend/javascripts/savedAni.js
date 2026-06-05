const SAVED_MATRIX_SIZE = 16;
const SAVED_FRAME_PIXELS = SAVED_MATRIX_SIZE * SAVED_MATRIX_SIZE;

const aniTrack = document.getElementById("aniTrack");
const aniTrackEmpty = document.getElementById("aniTrackEmpty");
const infoName = document.getElementById("aniInfoName");
const infoFrames = document.getElementById("aniInfoFrames");
const infoType = document.getElementById("aniInfoType");
const infoReverse = document.getElementById("aniInfoReverse");
const infoCreatedAt = document.getElementById("aniInfoCreatedAt");
const infoDescription = document.getElementById("aniInfoDescription");
const selectedPreviewGrid = document.getElementById("selectedPreviewGrid");
const playPauseButton = document.querySelector(".playPause-widget");
const playPauseImage = document.getElementById("ppImage");
const speedRange = document.querySelector(".speed-range");
const speedWidget = document.querySelector(".speed-widget");
const deleteAnimationButton = document.getElementById("deleteAnimationBtn");

let animations = [];
let selectedIndex = -1;
let isPlaying = false;

function isStaticImageAnimation(animation) {
  if (!animation) return true;
  const type = String(animation.type || "").toLowerCase();
  return (
    animation.frameCount <= 1 ||
    type.includes("image") ||
    type.includes("static")
  );
}

function setSpeedWidgetDisabled(disabled) {
  if (speedRange) {
    speedRange.disabled = disabled;
  }
  if (speedWidget) {
    speedWidget.classList.toggle("is-disabled", disabled);
    speedWidget.setAttribute("aria-disabled", disabled ? "true" : "false");
  }
}

function rgbToHex(rgb) {
  if (!Array.isArray(rgb) || rgb.length !== 3) return "#0f172a";
  return `#${rgb
    .map((value) => {
      const clamped = Math.max(0, Math.min(255, Number(value) || 0));
      return clamped.toString(16).padStart(2, "0");
    })
    .join("")}`;
}

function normalizePixels(pixels, frameCount) {
  const targetLength =
    Math.max(1, Number(frameCount) || 1) * SAVED_FRAME_PIXELS;
  const output = Array.from({ length: targetLength }, () => [0, 0, 0]);
  if (!Array.isArray(pixels)) return output;

  for (let i = 0; i < Math.min(targetLength, pixels.length); i++) {
    const value = pixels[i];
    if (Array.isArray(value) && value.length === 3) {
      output[i] = value;
    }
  }
  return output;
}

function frameSlice(animation, frameIndex) {
  const start = frameIndex * SAVED_FRAME_PIXELS;
  return animation._pixels.slice(start, start + SAVED_FRAME_PIXELS);
}

function paintGrid(gridEl, framePixels) {
  if (!gridEl) return;

  if (gridEl.children.length !== SAVED_FRAME_PIXELS) {
    gridEl.innerHTML = "";
    for (let i = 0; i < SAVED_FRAME_PIXELS; i++) {
      const cell = document.createElement("div");
      cell.className =
        gridEl === selectedPreviewGrid
          ? "selected-preview-cell"
          : "ani-card-cell";
      gridEl.appendChild(cell);
    }
  }

  for (let i = 0; i < SAVED_FRAME_PIXELS; i++) {
    const rgb = framePixels[i] || [0, 0, 0];
    gridEl.children[i].style.backgroundColor = rgbToHex(rgb);
  }
}

function renderCards() {
  if (!aniTrack || !aniTrackEmpty) return;
  aniTrack.innerHTML = "";

  if (!animations.length) {
    aniTrackEmpty.textContent = "No saved animations found.";
    aniTrackEmpty.hidden = false;
    return;
  }

  aniTrackEmpty.hidden = true;

  animations.forEach((animation, index) => {
    const card = document.createElement("button");
    card.className = "ani-card";
    card.type = "button";
    card.setAttribute("role", "option");
    card.setAttribute(
      "aria-selected",
      index === selectedIndex ? "true" : "false",
    );

    const title = document.createElement("p");
    title.className = "ani-card-title";
    title.textContent = animation.name || `Animation ${index + 1}`;

    const grid = document.createElement("div");
    grid.className = "ani-card-grid";
    paintGrid(grid, frameSlice(animation, 0));

    if (index === selectedIndex) {
      card.classList.add("active");
    }

    card.addEventListener("click", () => {
      selectAnimation(index);
    });

    card.appendChild(title);
    card.appendChild(grid);
    aniTrack.appendChild(card);
  });
}

function setPlayIcon(playing) {
  if (!playPauseImage) return;
  const playingSrc = playPauseImage.getAttribute("ani-playing-src");
  const pausedSrc = playPauseImage.getAttribute("ani-paused-src");
  playPauseImage.setAttribute("src", playing ? playingSrc : pausedSrc);
}

function stopPlayback() {
  isPlaying = false;
  setPlayIcon(false);
}

function renderSelectedFrame() {
  const animation = animations[selectedIndex];
  if (!animation) return;
  paintGrid(selectedPreviewGrid, frameSlice(animation, 0));
}

function startPlayback() {
  isPlaying = true;
  setPlayIcon(true);
}

function selectAnimation(index) {
  const previouslySelected = animations[selectedIndex];
  if (
    isPlaying &&
    previouslySelected &&
    typeof window.sendHaltAnimation === "function"
  ) {
    window.sendHaltAnimation();
  }

  selectedIndex = index;
  stopPlayback();
  renderCards();

  const animation = animations[selectedIndex];
  if (!animation) return;

  if (infoName) infoName.textContent = animation.name || "Unnamed animation";
  if (infoFrames) infoFrames.textContent = String(animation.frameCount);
  if (infoType) infoType.textContent = animation.type || "animation";
  if (infoReverse)
    infoReverse.textContent = animation.reverseAnimation ? "Yes" : "No";
  if (infoCreatedAt) {
    const createdDate = animation.createdAt
      ? new Date(animation.createdAt)
      : null;
    infoCreatedAt.textContent =
      createdDate && !Number.isNaN(createdDate.getTime())
        ? createdDate.toLocaleString()
        : "-";
  }
  if (infoDescription) {
    const rawDescription = (animation.description || "No description").trim();
    infoDescription.textContent = `Description: "${rawDescription}"`;
  }

  setSpeedWidgetDisabled(isStaticImageAnimation(animation));
  renderSelectedFrame();
}

function resetInfoPanel() {
  if (infoName) infoName.textContent = "Saved Animations";
  if (infoFrames) infoFrames.textContent = "-";
  if (infoType) infoType.textContent = "-";
  if (infoReverse) infoReverse.textContent = "-";
  if (infoCreatedAt) infoCreatedAt.textContent = "-";
  if (infoDescription) {
    infoDescription.textContent =
      "Choose an animation from the database, preview its details, and control how it plays on the matrix.";
  }
  paintGrid(
    selectedPreviewGrid,
    Array.from({ length: SAVED_FRAME_PIXELS }, () => [0, 0, 0]),
  );
  setSpeedWidgetDisabled(true);
}

async function loadAnimations() {
  if (aniTrackEmpty) {
    aniTrackEmpty.textContent = "Loading animations...";
    aniTrackEmpty.hidden = false;
  }

  try {
    const response = await fetch(
      `${getDatabaseApiUrl()}/animations`,
      {
        headers: {
          "bypass-tunnel-reminder": "1",
        },
      },
    );
    if (!response.ok) throw new Error("Failed to load animations");
    const result = await response.json();

    animations = result.map((animation) => {
      const frameCount = Math.max(1, Number(animation.frameCount) || 1);
      return {
        ...animation,
        frameCount,
        _pixels: normalizePixels(animation.pixels, frameCount),
      };
    });

    renderCards();
    if (animations.length > 0) {
      selectAnimation(0);
    }
  } catch (error) {
    console.error(error);
    if (aniTrackEmpty) {
      aniTrackEmpty.textContent = "Could not load animations.";
      aniTrackEmpty.hidden = false;
    }
  }
}

playPauseButton?.addEventListener("click", () => {
  const selected = animations[selectedIndex];
  if (!selected) return;

  if (isPlaying) {
    if (typeof window.sendHaltAnimation === "function") {
      window.sendHaltAnimation();
    }
    stopPlayback();
  } else {
    if (typeof window.sendPlayAnimation === "function") {
      window.sendPlayAnimation(selected.id);
    }
    startPlayback();
  }
});

speedRange?.addEventListener("input", () => {
  // Static preview mode: do not animate selected preview.
});

loadAnimations();

deleteAnimationButton?.addEventListener("click", async () => {
  const selected = animations[selectedIndex];
  if (!selected) {
    alert("Select an animation first.");
    return;
  }

  const confirmed = window.confirm(
    `Delete animation "${selected.name}" permanently?`,
  );
  if (!confirmed) return;

  try {
    const response = await fetch(
      `${getDatabaseApiUrl()}/animations/${selected.id}`,
      {
        method: "DELETE",
        headers: {
          "bypass-tunnel-reminder": "1",
        },
      },
    );

    if (!response.ok) {
      alert("Could not delete animation.");
      return;
    }

    animations = animations.filter((item) => item.id !== selected.id);
    stopPlayback();

    if (animations.length === 0) {
      selectedIndex = -1;
      renderCards();
      resetInfoPanel();
      return;
    }

    selectedIndex = 0;
    renderCards();
    selectAnimation(0);
  } catch (error) {
    console.error(error);
    alert("Could not delete animation.");
  }
});
