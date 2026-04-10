import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const alt = brand.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: brand.colors.dark,
          padding: 60,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 20,
            background: brand.colors.accent,
            marginBottom: 32,
          }}
        >
          <span
            style={{
              color: "#FFFFFF",
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: -1,
            }}
          >
            {brand.logoMark}
          </span>
        </div>

        <span
          style={{
            color: "#FFFFFF",
            fontSize: 52,
            fontWeight: 700,
            letterSpacing: -1,
            marginBottom: 16,
          }}
        >
          {brand.name}
        </span>

        <span
          style={{
            color: "#999999",
            fontSize: 26,
            fontWeight: 400,
          }}
        >
          {brand.tagline}
        </span>
      </div>
    ),
    { ...size }
  );
}
