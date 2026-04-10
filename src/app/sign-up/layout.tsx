import type { Metadata } from "next";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Sign up",
  description: `Create your free ${brand.name} account. Start generating AI influencer content in seconds.`,
  alternates: {
    canonical: `${brand.url}/sign-up`,
  },
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
