const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("mcSettings", (result) => {
    if (chrome.runtime.lastError) {
      showStatus("saveStatus", "error", "Failed to load: " + chrome.runtime.lastError.message);
      return;
    }
    const s = result.mcSettings || {};
    $("platformUrl").value = s.platformUrl || "";
    $("apiKey").value = s.apiKey || "";
    $("destination").value = s.destination || "collect";
    $("autoSave").checked = s.autoSave || false;

    // Store folder IDs so we can restore selection after loading folders
    $("instagramFolderId").dataset.saved = s.instagramFolderId || "";
    $("skoolFolderId").dataset.saved = s.skoolFolderId || "";
  });

  $("saveBtn").addEventListener("click", () => {
    const settings = {
      platformUrl: $("platformUrl").value.trim(),
      apiKey: $("apiKey").value.trim(),
      instagramFolderId: $("instagramFolderId").value || null,
      skoolFolderId: $("skoolFolderId").value || null,
      destination: $("destination").value,
      autoSave: $("autoSave").checked,
    };
    chrome.storage.local.set({ mcSettings: settings }, () => {
      if (chrome.runtime.lastError) {
        showStatus("saveStatus", "error", "Failed to save: " + chrome.runtime.lastError.message);
        return;
      }
      showStatus("saveStatus", "success", "Settings saved!");
    });
  });

  $("testBtn").addEventListener("click", async () => {
    const url = $("platformUrl").value.trim();
    const key = $("apiKey").value.trim();
    if (!url || !key) {
      showStatus("testStatus", "error", "Enter both URL and API key first");
      return;
    }

    $("testBtn").disabled = true;
    $("testBtn").textContent = "Testing...";

    try {
      const res = await fetch(
        `${url.replace(/\/+$/, "")}/api/extension/ingest`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({ ping: true }),
        }
      );
      if (res.ok) {
        showStatus("testStatus", "success", "Connected successfully!");
        // Auto-load folders after successful connection
        loadFolders();
      } else {
        const text = await res.text();
        showStatus("testStatus", "error", `${res.status}: ${text}`);
      }
    } catch (err) {
      showStatus("testStatus", "error", `Connection failed: ${err.message}`);
    }

    $("testBtn").disabled = false;
    $("testBtn").textContent = "Test Connection";
  });

  $("loadFoldersBtn").addEventListener("click", loadFolders);
});

async function loadFolders() {
  const url = $("platformUrl").value.trim();
  const key = $("apiKey").value.trim();
  if (!url || !key) {
    showStatus("folderStatus", "error", "Enter URL and API key first, then Test Connection");
    return;
  }

  $("loadFoldersBtn").disabled = true;
  $("loadFoldersBtn").textContent = "Loading...";

  try {
    const res = await fetch(
      `${url.replace(/\/+$/, "")}/api/extension/ingest`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) {
      showStatus("folderStatus", "error", "Failed to load folders");
      return;
    }
    const data = await res.json();
    populateFolderDropdowns(data.folders || []);
    showStatus("folderStatus", "success", `Loaded ${(data.folders || []).length} folders`);
  } catch (err) {
    showStatus("folderStatus", "error", err.message);
  }

  $("loadFoldersBtn").disabled = false;
  $("loadFoldersBtn").textContent = "Load Folders from Platform";
}

function populateFolderDropdowns(folders) {
  const igSaved = $("instagramFolderId").dataset.saved || "";
  const skSaved = $("skoolFolderId").dataset.saved || "";

  populateSelect("instagramFolderId", folders, "Auto-create INSTAGRAM folder", igSaved);
  populateSelect("skoolFolderId", folders, "Auto-create SKOOL folder", skSaved);
}

function populateSelect(selectId, folders, defaultLabel, savedValue) {
  const select = $(selectId);
  select.innerHTML = "";

  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = defaultLabel;
  select.appendChild(defaultOpt);

  for (const f of folders) {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.name;
    if (f.color) {
      opt.style.borderLeft = `4px solid ${f.color}`;
    }
    select.appendChild(opt);
  }

  if (savedValue) {
    select.value = savedValue;
  }
}

function showStatus(id, type, msg) {
  const el = $(id);
  el.className = `status ${type}`;
  el.textContent = msg;
  setTimeout(() => {
    el.className = "status";
  }, 5000);
}
