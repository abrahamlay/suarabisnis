import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";

const UPLOAD_DIR = "/data/uploads/logos";
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.json().catch(() => null);
    if (!formData || typeof formData !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { tenantSlug, dataUrl, fileName, mimeType } = formData as {
      tenantSlug: string;
      dataUrl: string; // base64 data URL
      fileName?: string;
      mimeType?: string;
    };

    if (!tenantSlug || !dataUrl) {
      return NextResponse.json({ error: "tenantSlug and dataUrl required" }, { status: 400 });
    }

    const session = await getSession();
    if (!session || session.tenantSlug !== tenantSlug) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenantSlug) });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    // Parse data URL: data:image/png;base64,XXXX
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Invalid data URL" }, { status: 400 });
    }
    const [, type, base64] = match;
    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
    }

    // Save to /data/uploads/logos/{tenantId}.{ext}
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const ext = type.split("/")[1] === "svg+xml" ? "svg" : type.split("/")[1];
    const filename = `${tenant.id}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(filepath, buffer);

    // Update DB
    const url = `/uploads/logos/${filename}`;
    await db.update(tenants).set({ logoUrl: url }).where(eq(tenants.id, tenant.id));

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[api/upload/logo]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { tenantSlug } = (await req.json()) as { tenantSlug: string };
    const session = await getSession();
    if (!session || session.tenantSlug !== tenantSlug) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenantSlug) });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    // Remove file if it exists
    if (tenant.logoUrl?.startsWith("/uploads/logos/")) {
      const filename = tenant.logoUrl.replace("/uploads/logos/", "");
      try {
        await fs.unlink(path.join(UPLOAD_DIR, filename));
      } catch {}
    }

    await db.update(tenants).set({ logoUrl: null }).where(eq(tenants.id, tenant.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/upload/logo DELETE]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
