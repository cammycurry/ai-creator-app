import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Production lockdown: only these Clerk user IDs can access the app.
// Everyone else sees the landing page / sign-in but can't reach /workspace or /api.
// Remove this list (or set ALLOWED_USER_IDS env var to "*") to open access.
const ALLOWED_IDS = process.env.ALLOWED_USER_IDS?.split(",").map((s) => s.trim()) ?? [];

const isProtectedRoute = (pathname: string) =>
  pathname.startsWith("/workspace") || pathname.startsWith("/admin") ||
  (pathname.startsWith("/api") && !pathname.startsWith("/api/webhooks"));

export default clerkMiddleware(async (auth, req) => {
  // Skip lockdown in development
  if (process.env.NODE_ENV !== "production") return;
  // Skip if no allowlist configured (open access)
  if (ALLOWED_IDS.length === 0 || ALLOWED_IDS[0] === "*") return;

  const { pathname } = req.nextUrl;
  if (!isProtectedRoute(pathname)) return;

  const { userId } = await auth();
  // Not signed in on a protected route → redirect to sign-in
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
  // Signed in but not on the allowlist → redirect to landing with message
  if (!ALLOWED_IDS.includes(userId)) {
    return NextResponse.redirect(new URL("/?access=beta", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api(?!/reference)|trpc)(.*)",
  ],
};
