"use client";

import { Waitlist } from "@clerk/nextjs";
import Link from "next/link";
import "../auth.css";

export default function WaitlistPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Link href="/" className="auth-logo">
            <div className="auth-logo-mark">Vi</div>
          </Link>
          <h1 className="auth-title">Join the waitlist</h1>
          <p className="auth-subtitle">
            We&apos;re onboarding creators in small batches. Drop your email and we&apos;ll
            send you access as soon as a spot opens.
          </p>
        </div>

        <Waitlist
          afterJoinWaitlistUrl="/?waitlisted=1"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none bg-transparent p-0",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              footer: "hidden",
              formButtonPrimary:
                "bg-[#C4603A] hover:bg-[#a8502f] text-white font-medium",
            },
          }}
        />

        <p className="auth-footer-text">
          Already approved?{" "}
          <Link href="/sign-in" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
