"use client";

import Link from "next/link";

export function WorkspaceGate() {
  return (
    <div className="workspace-gate">
      <div className="workspace-gate-inner">
        <div className="workspace-gate-logo">Vi</div>
        <h1 className="workspace-gate-title">Your AI Creator Workspace</h1>
        <p className="workspace-gate-desc">
          Design custom AI influencers, generate photorealistic content, and
          manage everything from one powerful workspace. Create images, videos,
          and talking-head clips — all with consistent character identity.
        </p>

        <div className="workspace-gate-actions">
          <Link href="/sign-up" className="workspace-gate-btn primary">
            Get started free
          </Link>
          <Link href="/sign-in" className="workspace-gate-btn">
            Sign in
          </Link>
        </div>

        <div className="workspace-gate-features">
          <div className="workspace-gate-feature">
            <h3>AI Creator Studio</h3>
            <p>
              Build unique AI personas with our visual wizard. Pick ethnicity,
              face shape, hair, body type, and style — then generate a
              consistent character that looks the same in every photo.
            </p>
          </div>
          <div className="workspace-gate-feature">
            <h3>Content Generation</h3>
            <p>
              Type a prompt or pick a template. Generate photorealistic images
              of your AI creator in any setting, outfit, or pose. Every image
              maintains perfect character consistency.
            </p>
          </div>
          <div className="workspace-gate-feature">
            <h3>Smart Templates</h3>
            <p>
              One-click presets for product showcases, try-ons, unboxings,
              lifestyle shots, and more. Customizable fields let you tailor
              each template to your brand.
            </p>
          </div>
          <div className="workspace-gate-feature">
            <h3>Video &amp; Voice</h3>
            <p>
              Turn any image into a cinematic video clip. Add realistic
              voiceover and lip-synced talking-head content for UGC ads,
              reviews, and social posts.
            </p>
          </div>
          <div className="workspace-gate-feature">
            <h3>Pre-Made Creators</h3>
            <p>
              Don&apos;t want to start from scratch? Browse our library of
              ready-to-use AI influencers across fitness, fashion, lifestyle,
              travel, and beauty niches.
            </p>
          </div>
          <div className="workspace-gate-feature">
            <h3>Pay Per Use</h3>
            <p>
              No wasteful subscriptions. Buy credits and only pay for what you
              generate. Start with 10 free credits — no credit card required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
