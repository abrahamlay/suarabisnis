/**
 * DELETE /api/notifications/devices/[id]
 * Remove a device token (so push stops going to that device).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;

    // Only allow removing own devices
    await db
      .update(deviceTokens)
      .set({ active: 0, revokedAt: new Date() })
      .where(and(eq(deviceTokens.id, id), eq(deviceTokens.userId, session.userId)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[remove device] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
