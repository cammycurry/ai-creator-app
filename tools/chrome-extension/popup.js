document.getElementById("settingsBtn").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

async function checkConnection() {
  const connStatus = document.getElementById("connStatus");
  const connText = document.getElementById("connText");

  try {
    const result = await chrome.runtime.sendMessage({
      type: "refCheckPost",
      data: { action: "checkPost", shortcode: "__ping__" },
    });
    // If we get a response (even saved:false), the API is reachable
    if (result && !result.error) {
      connStatus.className = "conn-status connected";
      connText.textContent = "Connected to API";
    } else {
      throw new Error(result?.error || "No response");
    }
  } catch (err) {
    connStatus.className = "conn-status disconnected";
    connText.innerHTML = `Not connected — <a href="#" id="openSettings" style="color:inherit;text-decoration:underline;">configure</a>`;
    document.getElementById("openSettings")?.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }
}

async function loadStats() {
  // We don't have a stats endpoint yet — show "-" for now
  // This can be wired up later with a "getStats" action
  document.getElementById("accountCount").textContent = "-";
  document.getElementById("postCount").textContent = "-";
}

checkConnection();
loadStats();
