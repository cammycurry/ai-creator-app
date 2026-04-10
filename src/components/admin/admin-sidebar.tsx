"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  Image,
  Users,
  Sparkles,
  CreditCard,
  Activity,
  Instagram,
  Wand2,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: null, // no section header
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Create",
    items: [
      { href: "/admin/generate", label: "Generate", icon: Wand2 },
      { href: "/admin/references", label: "References", icon: Instagram },
    ],
  },
  {
    label: "Data",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/creators", label: "Creators", icon: Sparkles },
      { href: "/admin/content", label: "Content", icon: Image },
      { href: "/admin/credits", label: "Credits", icon: CreditCard },
      { href: "/admin/jobs", label: "Jobs", icon: Activity },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/admin/prompt-lab", label: "Prompt Lab", icon: FlaskConical },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-56 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-[#C4603A] text-xs font-bold text-white">
          Vi
        </div>
        <span className="text-sm font-semibold text-zinc-100">Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-4">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <div className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-zinc-800/80 text-white font-medium"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <Link
          href="/workspace"
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← Back to App
        </Link>
      </div>
    </div>
  );
}
