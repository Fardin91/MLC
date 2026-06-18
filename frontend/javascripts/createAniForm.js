const form = document.getElementById("contentForm");
const nameInput = document.getElementById("animationName");
const frameCountInput = document.getElementById("frameCount");
const descriptionInput = document.getElementById("animationDescription");
const nameStatusImage = document.getElementById("nameStatusImage");
const revAniInput = document.getElementById("revAni");
const revAniContainer = document.getElementById("revAniContainer");
const animationTypeDisplay = document.getElementById("animationTypeDisplay");

if (form && nameInput && frameCountInput) {
  const statusImages = nameStatusImage
    ? {
        empty: nameStatusImage.dataset.emptySrc,
        exists: nameStatusImage.dataset.existsSrc,
        available: nameStatusImage.dataset.availableSrc,
      }
    : {};

  const nameStatusTooltips = nameStatusImage
    ? {
        empty: nameStatusImage.dataset.emptyTooltip,
        exists: nameStatusImage.dataset.existsTooltip,
        available: nameStatusImage.dataset.availableTooltip,
      }
    : {};

  let nameCheckTimeout;
  let selectedContentType = "static image";

  function setNameStatus(status) {
    if (!nameStatusImage) {
      return;
    }

    nameStatusImage.src = statusImages[status];
    nameStatusImage.title = nameStatusTooltips[status];
    nameStatusImage.setAttribute("aria-label", nameStatusTooltips[status]);
  }

  function getDatabaseHost() {
    const savedHost = String(
      localStorage.getItem("mlcDatabaseHost") || "",
    ).trim();
    if (!savedHost) {
      return "localhost";
    }
    return savedHost.replace(/\/+$/, "");
  }

  function getDatabaseApiUrl() {
    const host = getDatabaseHost();
    if (/^https?:\/\//i.test(host)) {
      return host;
    }
    if (/\:\d+$/.test(host)) {
      return `http://${host}`;
    }
    return `http://${host}:3000`;
  }

  function getDatabaseFetchOptions(method = "GET", additionalHeaders = {}) {
    return {
      method,
      headers: {
        "bypass-tunnel-reminder": "1",
        ...additionalHeaders,
      },
    };
  }

  function setContentTypeDisplay(contentType) {
    selectedContentType = contentType;

    if (animationTypeDisplay) {
      animationTypeDisplay.textContent =
        contentType === "animation" ? "Animation" : "Static image";
      animationTypeDisplay.dataset.type = contentType;
    }
  }

  async function checkAnimationName(name) {
    const response = await fetch(
      `${getDatabaseApiUrl()}/check-name?name=${encodeURIComponent(name)}`,
      getDatabaseFetchOptions(),
    );

    if (!response.ok) {
      throw new Error("Failed to check animation name");
    }

    return response.json();
  }

  async function updateNameStatus() {
    const trimmedName = nameInput.value.trim();

    if (!trimmedName) {
      setNameStatus("empty");
      return;
    }

    try {
      const result = await checkAnimationName(trimmedName);
      setNameStatus(result.exists ? "exists" : "available");
    } catch (error) {
      console.error(error);
      setNameStatus("empty");
    }
  }

  function updateFrameStatus() {
    let normalizedFrameCount = Number(frameCountInput.value);

    if (!Number.isFinite(normalizedFrameCount) || normalizedFrameCount < 1) {
      normalizedFrameCount = 1;
    } else if (normalizedFrameCount > 15) {
      normalizedFrameCount = 15;
    }

    if (Number(frameCountInput.value) !== normalizedFrameCount) {
      frameCountInput.value = normalizedFrameCount;
    }

    if (normalizedFrameCount <= 1) {
      if (revAniInput) {
        revAniInput.checked = false;
        revAniInput.disabled = true;
      }
      if (revAniContainer) {
        revAniContainer.setAttribute("aria-disabled", "true");
      }
      setContentTypeDisplay("static image");
      return;
    }

    if (revAniInput) {
      revAniInput.disabled = false;
    }
    if (revAniContainer) {
      revAniContainer.removeAttribute("aria-disabled");
    }
    setContentTypeDisplay("animation");
  }

  nameInput.addEventListener("input", () => {
    clearTimeout(nameCheckTimeout);
    nameCheckTimeout = setTimeout(updateNameStatus, 300);
  });

  frameCountInput.addEventListener("input", updateFrameStatus);

  if (nameStatusImage) {
    setNameStatus("empty");
  }
  updateFrameStatus();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const frameCount = frameCountInput.value;
    const description = descriptionInput ? descriptionInput.value.trim() : "";
    const reverseAnimation = revAniInput ? revAniInput.checked : false;

    const payload = {
      name,
      type: selectedContentType,
      frameCount: frameCount || null,
      reverseAnimation,
      description: description || null,
    };

    sessionStorage.setItem("mlcPendingAnimation", JSON.stringify(payload));
    window.location.href = "createAni.html";
  });
}
