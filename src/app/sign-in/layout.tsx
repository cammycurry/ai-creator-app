import type { Metadata } from "next";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Sign in",
  description: `Sign in to ${brand.name} to create AI influencers and generate content.`,
  alternates: {
    canonical: `${brand.url}/sign-in`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
