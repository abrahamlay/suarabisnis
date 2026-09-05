import { NextRequest, NextResponse } from "next/server";
import { getQrPngBuffer } from "@/app/app/[tenant_slug]/reviews/actions";
import { db } from "@/db";
import { reviewQrTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

/**
 * GET /api/qr/[token]?size=1024&source=table
 * Returns PNG image of the QR code. Auth required (only owner of the token can download).
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const sizeParam = sp.get("size");
  const size = (["256", "512", "1024", "2048"].includes(sizeParam ?? "")
    ? parseInt(sizeParam!)
    : 1024) as 256 | 512 | 1024 | 2048;
  const source = sp.get("source") ?? "download";

  const tokenRow = await db.query.reviewQrTokens.findFirst({
    where: eq(reviewQrTokens.token, token),
  });
  if (!tokenRow) {
    return NextResponse.json({ error: "QR tidak ditemukan" }, { status: 404 });
  }

  // Auth: only the owner of the tenant can download
  const session = await getSession();
  if (!session || session.tenantId !== tokenRow.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const buffer = await getQrPngBuffer(token, { size, utmSource: source });
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="qr-${size}px-${source}.png"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("[api/qr]", err);
    return NextResponse.json({ error: "Failed to generate QR" }, { status: 500 });
  }
}
