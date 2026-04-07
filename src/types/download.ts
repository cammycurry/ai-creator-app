export type DeviceProfile = {
  id: string;
  label: string;
  make: string;
  model: string;
  software: string;
};

export const DEVICE_PROFILES: DeviceProfile[] = [
  { id: "iphone-15-pro", label: "iPhone 15 Pro", make: "Apple", model: "iPhone 15 Pro", software: "18.3" },
  { id: "iphone-16-pro", label: "iPhone 16 Pro", make: "Apple", model: "iPhone 16 Pro", software: "19.1" },
  { id: "iphone-15", label: "iPhone 15", make: "Apple", model: "iPhone 15", software: "18.3" },
  { id: "iphone-14-pro", label: "iPhone 14 Pro", make: "Apple", model: "iPhone 14 Pro", software: "17.7" },
  { id: "samsung-s24", label: "Samsung Galaxy S24", make: "Samsung", model: "SM-S921B", software: "S921BXXU4AXA1" },
  { id: "pixel-9", label: "Google Pixel 9", make: "Google", model: "Pixel 9", software: "AP4A.250205.002" },
  { id: "none", label: "No device (strip only)", make: "", model: "", software: "" },
];

export type DownloadSettings = {
  deviceId: string;
  quality: number;
  stripMetadata: boolean;
  injectGps: boolean;
  gpsLat?: number;
  gpsLng?: number;
};
