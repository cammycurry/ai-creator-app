import { headers } from "next/headers";
import { Webhook } from "svix";
import { db } from "@/lib/db";

type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses?: { email_address: string }[];
    first_name?: string;
    last_name?: string;
    image_url?: string;
  };
};

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: ClerkWebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const { type, data } = evt;

  if (type === "user.created" || type === "user.updated") {
    const email = data.email_addresses?.[0]?.email_address;
    if (!email) return new Response("No email", { status: 400 });

    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

    await db.user.upsert({
      where: { clerkId: data.id },
      update: {
        email,
        name,
        imageUrl: data.image_url,
      },
      create: {
        clerkId: data.id,
        email,
        name,
        imageUrl: data.image_url,
      },
    });
  }

  if (type === "user.deleted") {
    await db.user.deleteMany({ where: { clerkId: data.id } });
  }

  return new Response("OK", { status: 200 });
}
