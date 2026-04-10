import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export const metadata: Metadata = {
  title: "Workspace — AI Creator Studio",
  description:
    "Design AI influencers, generate photorealistic photos, videos, and talking-head content. Manage your AI creators and content from one workspace.",
  alternates: {
    canonical: `${brand.url}/workspace`,
  },
  openGraph: {
    title: `Workspace | ${brand.name}`,
    description:
      "Design AI influencers, generate photorealistic photos, videos, and talking-head content.",
  },
};

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
