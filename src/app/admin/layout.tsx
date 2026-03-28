import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata = {
  title: "Admin — realinfluencer.ai",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId || userId !== process.env.ADMIN_CLERK_ID) {
    redirect("/");
  }

  return <AdminShell>{children}</AdminShell>;
}
