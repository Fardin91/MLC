const savedConfig = sessionStorage.getItem("mlcPendingAnimation");

if (savedConfig) {
  try {
    const config = JSON.parse(savedConfig);
    const summaryName = document.getElementById("summaryName");

    if (summaryName && config.name) {
      summaryName.textContent = config.name;
    }
  } catch (error) {
    console.error("Could not parse saved animation config:", error);
  }
}

const uploadButton = document.getElementById("uploadAnimationBtn");
uploadButton?.addEventListener("click", async () => {
  const pendingConfigRaw = sessionStorage.getItem("mlcPendingAnimation");
  if (!pendingConfigRaw) {
    alert("No animation data found.");
    return;
  }

  let pendingConfig;
  try {
    pendingConfig = JSON.parse(pendingConfigRaw);
  } catch (error) {
    console.error(error);
    alert("Animation config is invalid.");
    return;
  }

  function getDatabaseHost() {
    const savedHost = String(
      localStorage.getItem("mlcDatabaseHost") || "",
    ).trim();
    return savedHost
      ? savedHost.replace(/^https?:\/\//i, "").replace(/\/+$/, "")
      : "localhost";
  }

  function getDatabaseApiUrl() {
    return `http://${getDatabaseHost()}:3000`;
  }

  const payload = {
    ...pendingConfig,
    pixels: window.frameCreator?.getAllPixels
      ? window.frameCreator.getAllPixels()
      : [],
  };

  const response = await fetch(`${getDatabaseApiUrl()}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    alert("Could not upload animation.");
    return;
  }

  alert("Animation uploaded.");
  sessionStorage.removeItem("mlcPendingAnimation");
  window.location.href = "index.html";
});
