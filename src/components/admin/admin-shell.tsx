"use client";

import { AdminSidebar } from "./admin-sidebar";
import { useAdminStore } from "@/stores/admin-store";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { lightboxSrc, closeLightbox } = useAdminStore();

  return (
    <div className="admin-shell flex h-screen bg-zinc-950 text-zinc-100">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Global lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 cursor-pointer"
          onClick={closeLightbox}
        >
          <img
            src={lightboxSrc}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-lg"
          />
        </div>
      )}

      <style>{`
        .admin-shell, .admin-shell * {
          box-sizing: border-box;
        }
        .admin-shell a {
          color: inherit;
          text-decoration: none;
          font-weight: inherit;
        }
        .admin-shell a:hover {
          text-decoration: none;
        }
        .admin-shell button {
          color: inherit;
        }
        .admin-shell input, .admin-shell textarea, .admin-shell select {
          color: inherit;
        }
      `}</style>
    </div>
  );
}
