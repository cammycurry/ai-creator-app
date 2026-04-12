"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DEVICE_PROFILES } from "@/types/download";

// Device ID mapping: our IDs → metadata-service device names
const DEVICE_MAP: Record<string, string> = {
  "iphone-15-pro": "iphone_15_pro",
  "iphone-15-pro-max": "iphone_15_pro_max",
  "iphone-14-pro": "iphone_14_pro",
  "samsung-s24": "samsung_s24",
  "none": "none",
};

function buildDownloadUrl(s3Key: string, deviceId?: string, gpsCity?: string) {
  const params = new URLSearchParams({ key: s3Key });
  if (deviceId) params.set("device", DEVICE_MAP[deviceId] ?? "iphone_15_pro");
  if (gpsCity) params.set("gps_city", gpsCity);
  return `/api/download?${params.toString()}`;
}

async function triggerDownload(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Download failed");
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export function DownloadDialog({
  open,
  onOpenChange,
  s3Key,
  contentType = "image",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  s3Key: string;
  contentType?: "image" | "video";
}) {
  const [downloading, setDownloading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deviceId, setDeviceId] = useState("iphone-15-pro");
  const [injectGps, setInjectGps] = useState(false);
  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isVideo = contentType === "video";
  const ext = isVideo ? "mp4" : "jpg";
  const filename = `IMG_${Date.now()}.${ext}`;

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const gpsCity = injectGps ? "los_angeles" : undefined;
      const url = buildDownloadUrl(s3Key, deviceId, gpsCity);
      await triggerDownload(url, filename);
      onOpenChange(false);
    } catch {
      setError("Download failed");
    }
    setDownloading(false);
  }

  async function handleQuickDownload() {
    setDownloading(true);
    setError(null);
    try {
      const url = buildDownloadUrl(s3Key);
      await triggerDownload(url, filename);
      onOpenChange(false);
    } catch {
      setError("Download failed");
    }
    setDownloading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="add-ref-dialog" showCloseButton={false}>
        <div style={{ padding: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Download</div>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
            AI metadata stripped automatically. Looks like a real {isVideo ? "phone video" : "phone photo"}.
          </div>

          {/* Quick download */}
          <button
            onClick={handleQuickDownload}
            disabled={downloading}
            style={{
              width: "100%",
              padding: "10px 16px",
              background: "#C4603A",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: downloading ? "not-allowed" : "pointer",
              opacity: downloading ? 0.6 : 1,
              marginBottom: 12,
            }}
          >
            {downloading ? "Processing..." : isVideo ? "Download Clean Video" : "Download Clean Photo"}
          </button>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              color: "#C4603A",
              padding: 0,
              marginBottom: showAdvanced ? 12 : 0,
            }}
          >
            {showAdvanced ? "Hide advanced ▴" : "Advanced options ▾"}
          </button>

          {showAdvanced && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Device */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>
                  Camera device
                </label>
                <select
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: 13,
                    border: "1px solid #EBEBEB",
                    borderRadius: 8,
                    fontFamily: "inherit",
                    color: "#333",
                  }}
                >
                  {DEVICE_PROFILES.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
                <div style={{ fontSize: 10, color: "#BBB", marginTop: 2 }}>
                  EXIF data will show this device took the {isVideo ? "video" : "photo"}
                </div>
              </div>

              {/* GPS */}
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "#555", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={injectGps}
                    onChange={(e) => setInjectGps(e.target.checked)}
                  />
                  Inject GPS location
                </label>
                {injectGps && (
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <input
                      placeholder="Latitude"
                      value={gpsLat}
                      onChange={(e) => setGpsLat(e.target.value)}
                      style={{ flex: 1, padding: "6px 8px", fontSize: 12, border: "1px solid #EBEBEB", borderRadius: 6, fontFamily: "inherit" }}
                    />
                    <input
                      placeholder="Longitude"
                      value={gpsLng}
                      onChange={(e) => setGpsLng(e.target.value)}
                      style={{ flex: 1, padding: "6px 8px", fontSize: 12, border: "1px solid #EBEBEB", borderRadius: 6, fontFamily: "inherit" }}
                    />
                  </div>
                )}
                <div style={{ fontSize: 10, color: "#BBB", marginTop: 2 }}>
                  Makes it look like the {isVideo ? "video" : "photo"} was taken at a specific location
                </div>
              </div>

              {/* Custom download button */}
              <button
                onClick={handleDownload}
                disabled={downloading}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  background: "#111",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: downloading ? "not-allowed" : "pointer",
                  opacity: downloading ? 0.6 : 1,
                }}
              >
                {downloading ? "Processing..." : "Download with Custom Settings"}
              </button>
            </div>
          )}

          {error && (
            <div style={{ fontSize: 12, color: "#e53e3e", marginTop: 8 }}>{error}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
