const apiUrlInput = document.getElementById("apiUrl");
const apiKeyInput = document.getElementById("apiKey");
const saveBtn = document.getElementById("saveBtn");
const savedMsg = document.getElementById("savedMsg");

// Load saved settings
chrome.storage.local.get("refSettings", ({ refSettings = {} }) => {
  apiUrlInput.value = refSettings.apiUrl || "http://localhost:3000";
  apiKeyInput.value = refSettings.apiKey || "";
});

saveBtn.addEventListener("click", () => {
  const settings = {
    apiUrl: apiUrlInput.value.trim(),
    apiKey: apiKeyInput.value.trim(),
  };
  chrome.storage.local.set({ refSettings: settings }, () => {
    savedMsg.classList.add("show");
    setTimeout(() => savedMsg.classList.remove("show"), 2000);
  });
});
