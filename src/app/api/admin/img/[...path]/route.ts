import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { userId } = await auth();
  if (!userId || userId !== process.env.ADMIN_CLERK_ID) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { path: segments } = await params;
  const imgPath = path.join(process.cwd(), "scripts", "output", ...segments);

  if (!fs.existsSync(imgPath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(imgPath).toLowerCase();
  const contentType = ext === ".png" ? "image/png" : "image/jpeg";
  const buffer = fs.readFileSync(imgPath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
