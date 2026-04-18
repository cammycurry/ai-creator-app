"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export function LandingNav() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <nav>
      <div className="nav-inner">
        <a className="nav-logo" href="#">
          <div className="nav-logo-mark">Vi</div>
          realinfluencer.ai
        </a>
        <div className="nav-links">
          <a className="nav-link" href="#features">Features</a>
          <a className="nav-link" href="#how">How it works</a>
          <a className="nav-link" href="#pricing">Pricing</a>
          {isLoaded && isSignedIn ? (
            <Link className="nav-cta" href="/workspace">Go to Dashboard</Link>
          ) : (
            <>
              <Link className="nav-signin" href="/sign-in">Sign in</Link>
              <Link className="nav-cta" href="/waitlist">Join waitlist</Link>
            </>
          )}
        </div>
        {isLoaded && isSignedIn ? (
          <Link className="nav-cta-mobile" href="/workspace">Dashboard</Link>
        ) : (
          <Link className="nav-cta-mobile" href="/waitlist">Join waitlist</Link>
        )}
      </div>
    </nav>
  );
}
