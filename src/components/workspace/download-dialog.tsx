"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { processDownload } from "@/server/actions/download-actions";
import { DEVICE_PROFILES, type DownloadSettings } from "@/types/download";

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
  const [quality, setQuality] = useState(95);
  const [injectGps, setInjectGps] = useState(false);
  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);

    // Videos download directly (no metadata stripping for video yet)
    if (contentType === "video") {
      try {
        const response = await fetch(`/api/download?key=${encodeURIComponent(s3Key)}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `VID_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        setError("Download failed");
      }
      setDownloading(false);
      onOpenChange(false);
      return;
    }

    // Images: process with metadata stripping
    const settings: Partial<DownloadSettings> = {
      deviceId,
      quality,
      injectGps,
      ...(injectGps && gpsLat && gpsLng ? { gpsLat: parseFloat(gpsLat), gpsLng: parseFloat(gpsLng) } : {}),
    };

    const result = await processDownload(s3Key, settings);

    if (result.success) {
      // Convert base64 to blob and download
      const byteArray = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onOpenChange(false);
    } else {
      setError(result.error);
    }

    setDownloading(false);
  }

  // Quick download — just download with defaults, no dialog interaction needed
  async function handleQuickDownload() {
    setDownloading(true);
    const result = await processDownload(s3Key);
    if (result.success) {
      const byteArray = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onOpenChange(false);
    } else {
      setError(result.error ?? "Download failed");
    }
    setDownloading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="add-ref-dialog" showCloseButton={false}>
        <div style={{ padding: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Download</div>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
            AI metadata stripped automatically. Looks like a real phone photo.
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
            {downloading ? "Processing..." : "Download Clean Photo"}
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
                  EXIF data will show this device took the photo
                </div>
              </div>

              {/* Quality */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>
                  Quality: {quality}%
                </label>
                <input
                  type="range"
                  min={80}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
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
                  Makes it look like the photo was taken at a specific location
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
