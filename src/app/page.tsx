import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { LandingNav } from "@/components/landing/landing-nav";
import "./landing.css";

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description: brand.description,
  alternates: {
    canonical: brand.url,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: brand.name,
  description: brand.description,
  url: brand.url,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

const niches = [
  { name: "Fitness", icon: "💪" },
  { name: "Lifestyle", icon: "✨" },
  { name: "Beauty", icon: "💄" },
  { name: "Fashion", icon: "👗" },
  { name: "Travel", icon: "✈️" },
  { name: "UGC", icon: "🎯" },
  { name: "Exclusive", icon: "🔥" },
  { name: "E-commerce", icon: "🛍️" },
];

const showcaseCards = [
  { name: "Sienna", niche: "Exclusive", image: "/showcase/sienna.jpg" },
  { name: "Valentina", niche: "Fitness", image: "/showcase/valentina.jpg" },
  { name: "Jordyn", niche: "Fashion", image: "/showcase/jordyn.jpg" },
  { name: "Nara", niche: "K-Beauty", image: "/showcase/nara.jpg" },
  { name: "Camila", niche: "Travel", image: "/showcase/camila.jpg" },
  { name: "Marcus", niche: "Fitness", image: "/showcase/marcus.jpg" },
];

const oldTools = [
  { name: "Image gen", cost: "$10–30/mo" },
  { name: "Video gen", cost: "$15–29/mo" },
  { name: "Voice clone", cost: "$5–22/mo" },
  { name: "Video editor", cost: "$10–15/mo" },
  { name: "Metadata tool", cost: "$5–10/mo" },
  { name: "Scheduling", cost: "$6–18/mo" },
];

export default function Home() {
  return (
    <div className="landing-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <LandingNav />

      {/* HERO */}
      <div className="hero-wrap">
        <section className="hero">
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            <span className="hero-badge-text">Now in beta</span> start free
          </div>
          <h1>Create AI influencers.<br/>Generate content as them.</h1>
          <p className="hero-sub">Build a custom AI creator in 60 seconds. Photos, videos, talking-head clips. Same face every time. Manage one creator or a hundred from one dashboard.</p>
          <div className="hero-actions">
            <Link className="btn-primary" href="/sign-up">
              Start creating free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <a className="btn-secondary" href="#how">See how it works</a>
          </div>
          <div className="hero-note">
            <span>No credit card</span>
            <span className="hero-note-dot"></span>
            <span>10 free credits</span>
            <span className="hero-note-dot"></span>
            <span>Cancel anytime</span>
          </div>

          {/* Creator showcase grid */}
          <div className="hero-showcase">
            {showcaseCards.map((card) => (
              <div key={card.name} className="showcase-card">
                <img
                  src={card.image}
                  alt={`${card.name} - AI ${card.niche} influencer`}
                  className="showcase-image"
                />
                <div className="showcase-overlay">
                  <div className="showcase-name">{card.name}</div>
                  <div className="showcase-niche">{card.niche}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* NICHES */}
      <section className="niches">
        <div className="niches-label">Works for any niche</div>
        <div className="niches-row">
          {niches.map((n) => (
            <div key={n.name} className="niche-tag">
              <span>{n.icon}</span>
              <span>{n.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="problem">
        <div className="section-label">The problem</div>
        <div className="section-title">Running an AI influencer<br/>shouldn&apos;t require 6 tools</div>
        <p className="section-subtitle">Most operators juggle a fragmented stack that costs $200–500/month and breaks character consistency at every step.</p>
        <div className="problem-grid">
          {oldTools.map((tool) => (
            <div key={tool.name} className="problem-tool">
              <div className="problem-tool-name">{tool.name}</div>
              <div className="problem-tool-cost">{tool.cost}</div>
            </div>
          ))}
        </div>
        <div className="problem-arrow">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </div>
        <div className="problem-solution">
          <div className="problem-solution-logo">
            <div className="nav-logo-mark">Vi</div>
          </div>
          <div className="problem-solution-text">
            <div className="problem-solution-name">realinfluencer.ai</div>
            <div className="problem-solution-desc">Creator wizard → photos → video → voice → lip sync → metadata strip → download. One app.</div>
          </div>
          <div className="problem-solution-price">From $19/mo</div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="section-label">Features</div>
        <div className="section-title">The full pipeline, not just image gen</div>
        <div className="bento-grid">
          <div className="bento-card span-2">
            <div className="bento-icon orange">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
            </div>
            <div className="bento-name">Same Face, Every Time</div>
            <div className="bento-desc">The #1 problem in AI influencer content is consistency. Our reference image system locks your character&apos;s identity across every generation. Same face, same body, every single time.</div>
            <div className="bento-stats">
              <span className="bento-stat">Up to 14 reference images</span>
              <span className="bento-stat">Identity lock</span>
            </div>
          </div>
          <div className="bento-card">
            <div className="bento-icon blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </div>
            <div className="bento-name">Photo Generation</div>
            <div className="bento-desc">Photorealistic images in ~10 seconds. Type a prompt or pick a template.</div>
            <div className="bento-stats">
              <span className="bento-stat">~10s</span>
              <span className="bento-stat">1 credit</span>
            </div>
          </div>
          <div className="bento-card">
            <div className="bento-icon green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <div className="bento-name">Video &amp; Voice</div>
            <div className="bento-desc">Turn any photo into a 5–10s video clip. Add voice. Lip sync. Full pipeline.</div>
            <div className="bento-tag-coming">Coming soon</div>
          </div>
          <div className="bento-card">
            <div className="bento-icon pink">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div className="bento-name">No AI Fingerprints</div>
            <div className="bento-desc">Every download has AI metadata stripped and real iPhone EXIF injected. No &ldquo;Made with AI&rdquo; labels.</div>
          </div>
          <div className="bento-card span-2">
            <div className="bento-icon purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"/><path d="M4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"/><path d="M16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>
            </div>
            <div className="bento-name">Templates &amp; Carousels</div>
            <div className="bento-desc">One-click templates across fitness, lifestyle, aesthetic, and UGC. Plus structured Instagram carousels. The format that gets 43% more engagement than single posts.</div>
            <div className="bento-stats">
              <span className="bento-stat">4 categories</span>
              <span className="bento-stat">3–10 slide carousels</span>
            </div>
          </div>
          <div className="bento-card">
            <div className="bento-icon" style={{ background: "rgba(20,184,166,0.08)", color: "#14B8A6" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </div>
            <div className="bento-name">AI Prompt Director</div>
            <div className="bento-desc">Type &ldquo;coffee shop vibes&rdquo; and an AI photography director writes the real prompt. Zero prompt engineering required.</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" id="how">
        <div className="section-label">How it works</div>
        <div className="section-title">Three steps. Sixty seconds.</div>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <div className="step-title">Design your creator</div>
            <div className="step-desc">Pick traits visually, describe them in plain English, or choose from pre-made creators. Your AI influencer is generated in seconds.</div>
          </div>
          <div className="step-arrow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <div className="step-title">Generate content</div>
            <div className="step-desc">Type what you want or pick a template. AI enhances your prompt and generates photorealistic images with your creator&apos;s face. Every time.</div>
          </div>
          <div className="step-arrow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <div className="step-title">Download &amp; post</div>
            <div className="step-desc">Every download is metadata-clean with iPhone EXIF. Post to Instagram, TikTok, Fanvue. Anywhere. No AI fingerprints.</div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="use-cases">
        <div className="section-label">Use cases</div>
        <div className="section-title">Built for people who ship content</div>
        <div className="use-cases-grid">
          <div className="use-case">
            <div className="use-case-icon">📱</div>
            <div className="use-case-title">Niche pages</div>
            <div className="use-case-desc">Run AI influencer accounts on Instagram and TikTok. Daily content, consistent character, zero photoshoots.</div>
          </div>
          <div className="use-case">
            <div className="use-case-icon">🎯</div>
            <div className="use-case-title">UGC &amp; ads</div>
            <div className="use-case-desc">Product reviews, testimonials, and talking-head ads at a fraction of what you&apos;d pay a real creator.</div>
          </div>
          <div className="use-case">
            <div className="use-case-icon">🏢</div>
            <div className="use-case-title">Agencies</div>
            <div className="use-case-desc">Manage 10, 20, 50 AI creators from one dashboard. Generate content at scale. Run it like a real agency.</div>
          </div>
          <div className="use-case">
            <div className="use-case-icon">💰</div>
            <div className="use-case-title">Monetization</div>
            <div className="use-case-desc">Build a following, promote affiliate products, or sell exclusive content on Fanvue. One person can run multiple creators.</div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="pricing">
        <div className="section-label">Pricing</div>
        <div className="section-title">Pay for what you generate</div>
        <p className="section-subtitle">Every generation costs credits because every generation costs real API money. No surprise bills, no hidden limits.</p>
        <div className="pricing-grid">
          <div className="price-card">
            <div className="price-name">Free</div>
            <div className="price-amount">$0<span>/mo</span></div>
            <div className="price-credits">10 credits / month</div>
            <ul className="price-features">
              <li>Pre-made creators only</li>
              <li>Photo generation</li>
              <li>All templates</li>
            </ul>
            <Link className="price-btn" href="/sign-up">Get started</Link>
          </div>
          <div className="price-card">
            <div className="price-name">Starter</div>
            <div className="price-amount">$19<span>/mo</span></div>
            <div className="price-credits">100 credits / month</div>
            <ul className="price-features">
              <li>3 custom creators</li>
              <li>Photo generation</li>
              <li>All templates</li>
              <li>Prompt enhancement</li>
              <li>Metadata stripping</li>
            </ul>
            <Link className="price-btn" href="/sign-up">Get started</Link>
          </div>
          <div className="price-card featured">
            <div className="price-badge">Most popular</div>
            <div className="price-name">Pro</div>
            <div className="price-amount">$49<span>/mo</span></div>
            <div className="price-credits">300 credits / month</div>
            <ul className="price-features">
              <li>10 custom creators</li>
              <li>Photo + video generation</li>
              <li>Carousels</li>
              <li>Prompt enhancement</li>
              <li>Metadata stripping</li>
              <li>Priority generation</li>
            </ul>
            <Link className="price-btn primary" href="/sign-up">Get started</Link>
          </div>
          <div className="price-card">
            <div className="price-name">Business</div>
            <div className="price-amount">$99<span>/mo</span></div>
            <div className="price-credits">1,000 credits / month</div>
            <ul className="price-features">
              <li>Unlimited creators</li>
              <li>All content types</li>
              <li>Carousels</li>
              <li>Prompt enhancement</li>
              <li>Metadata stripping</li>
              <li>Priority generation</li>
            </ul>
            <Link className="price-btn" href="/sign-up">Get started</Link>
          </div>
        </div>
        <div className="pricing-packs">
          Need more credits? Buy packs anytime. <Link href="/sign-up">25 for $5</Link>, <Link href="/sign-up">100 for $15</Link>, <Link href="/sign-up">350 for $45</Link>
        </div>
        <div className="pricing-costs">
          <div className="pricing-costs-title">What credits cost</div>
          <div className="pricing-costs-grid">
            <div className="pricing-cost-item">
              <span className="pricing-cost-label">Photo</span>
              <span className="pricing-cost-value">1 credit</span>
            </div>
            <div className="pricing-cost-item">
              <span className="pricing-cost-label">New creator</span>
              <span className="pricing-cost-value">5 credits</span>
            </div>
            <div className="pricing-cost-item">
              <span className="pricing-cost-label">5s video <span className="pricing-cost-soon">soon</span></span>
              <span className="pricing-cost-value">3 credits</span>
            </div>
            <div className="pricing-cost-item">
              <span className="pricing-cost-label">10s video <span className="pricing-cost-soon">soon</span></span>
              <span className="pricing-cost-value">5 credits</span>
            </div>
            <div className="pricing-cost-item">
              <span className="pricing-cost-label">Voice clip <span className="pricing-cost-soon">soon</span></span>
              <span className="pricing-cost-value">2 credits</span>
            </div>
            <div className="pricing-cost-item">
              <span className="pricing-cost-label">Lip sync <span className="pricing-cost-soon">soon</span></span>
              <span className="pricing-cost-value">5 credits</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-card">
          <h2>Build your first AI influencer in 60 seconds</h2>
          <p>10 free credits. No credit card. See what the hype is about.</p>
          <Link className="cta-btn" href="/sign-up">
            Start creating now
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="nav-logo-mark">Vi</div>
              realinfluencer.ai
            </div>
            <div className="footer-tagline">Create AI influencers. Generate content as them.</div>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Product</div>
            <Link href="/sign-up">Get started</Link>
            <a href="#pricing">Pricing</a>
            <a href="#features">Features</a>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Legal</div>
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">© 2026 realinfluencer.ai. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
