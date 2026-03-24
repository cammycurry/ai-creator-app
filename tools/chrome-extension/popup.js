// popup.js — Shows capture history, connection status

let media = [];
let settings = {};

document.addEventListener("DOMContentLoaded", async () => {
  settings = await getSettings();
  await loadMedia();
  setupListeners();
  updateConnStatus();
});

async function getSettings() {
  return new Promise((resolve) =>
    chrome.runtime.sendMessage({ type: "getSettings" }, resolve)
  );
}

async function loadMedia() {
  const { collectedMedia = [] } = await chrome.storage.local.get("collectedMedia");
  media = collectedMedia;
  render();
}

function setupListeners() {
  document.getElementById("clearBtn").addEventListener("click", clearAll);
  document.getElementById("settingsBtn").addEventListener("click", openOptions);
  document.getElementById("openSettings").addEventListener("click", (e) => {
    e.preventDefault();
    openOptions();
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.collectedMedia) {
      media = changes.collectedMedia.newValue || [];
      render();
    }
  });
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

function render() {
  const list = document.getElementById("mediaList");

  if (media.length === 0) {
    list.innerHTML = `<div class="empty"><p>No media captured yet.<br>Browse Skool or Instagram to get started.</p></div>`;
    return;
  }

  list.innerHTML = media
    .slice()
    .reverse()
    .map((m, ri) => {
      const i = media.length - 1 - ri;
      const time = new Date(m.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const originClass = m.origin === "instagram" ? "tag-instagram" : "tag-skool";
      const typeClass = m.type === "video" ? "tag-video" : "tag-image";
      const sizeStr = m.size ? `${(m.size / 1024 / 1024).toFixed(1)}MB` : "";

      return `
        <div class="media-item">
          <div class="media-info">
            <div class="media-title" title="${esc(m.title)}">${esc(m.title || "Untitled")}</div>
            <div class="media-meta">
              <span class="tag ${originClass}">${m.origin || "?"}</span>
              <span class="tag ${typeClass}">${m.type || "?"}</span>
              ${sizeStr ? `<span>${sizeStr}</span>` : ""}
              <span>${time}</span>
            </div>
          </div>
          <div class="media-actions">
            <button data-action="remove" data-index="${i}" title="Remove">x</button>
          </div>
        </div>`;
    })
    .join("");

  list.onclick = (e) => {
    const t = e.target.closest("[data-action]");
    if (!t) return;
    const idx = parseInt(t.dataset.index);
    if (t.dataset.action === "remove") {
      media.splice(idx, 1);
      chrome.storage.local.set({ collectedMedia: media });
      chrome.runtime.sendMessage({ type: "updateBadge", count: media.length });
      render();
    }
  };
}

function clearAll() {
  if (!media.length) return;
  media = [];
  chrome.storage.local.set({ collectedMedia: [] });
  chrome.runtime.sendMessage({ type: "updateBadge", count: 0 });
  render();
  toast("Cleared");
}

function updateConnStatus() {
  const el = document.getElementById("connStatus");
  if (settings.platformUrl && settings.apiKey) {
    el.className = "conn-status connected";
    try {
      el.innerHTML = `<div class="conn-dot"></div><span>Connected to ${new URL(settings.platformUrl).hostname}</span>`;
    } catch {
      el.innerHTML = `<div class="conn-dot"></div><span>Connected</span>`;
    }
  } else {
    el.className = "conn-status disconnected";
    el.innerHTML = `<div class="conn-dot"></div><span>Not connected — <a href="#" id="openSettings" style="color:inherit;text-decoration:underline;">configure</a></span>`;
    document.getElementById("openSettings")?.addEventListener("click", (e) => {
      e.preventDefault();
      openOptions();
    });
  }
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

function toast(msg, isError) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (isError ? " error" : "");
  setTimeout(() => (t.className = "toast"), 2500);
}
