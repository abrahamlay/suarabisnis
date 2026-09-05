/**
 * POST /api/notifications/register-device
 * Register (or refresh) an FCM device token for the current user.
 * Body: { fcmToken: string, platform: "web" | "android" | "ios", deviceName?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fcmToken, platform, deviceName } = body as {
      fcmToken?: string;
      platform?: "web" | "android" | "ios";
      deviceName?: string;
    };

    if (!fcmToken || typeof fcmToken !== "string") {
      return NextResponse.json({ error: "Missing fcmToken" }, { status: 400 });
    }
    if (!platform || !["web", "android", "ios"].includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    // Check if token already exists
    const existing = await db.query.deviceTokens.findFirst({
      where: eq(deviceTokens.fcmToken, fcmToken),
    });

    const now = new Date();
    const userAgent = req.headers.get("user-agent") ?? null;

    if (existing) {
      // Update ownership + lastActive (or refresh if same user)
      if (existing.userId !== session.userId) {
        // Token rotated to a different user (e.g. user logged out, new user logged in on same device)
        await db
          .update(deviceTokens)
          .set({
            userId: session.userId,
            tenantId: session.tenantId,
            platform,
            deviceName: deviceName ?? existing.deviceName,
            userAgent: userAgent ?? existing.userAgent,
            active: 1,
            lastActive: now,
            revokedAt: null,
          })
          .where(eq(deviceTokens.id, existing.id));
      } else {
        // Same user - just refresh
        await db
          .update(deviceTokens)
          .set({
            deviceName: deviceName ?? existing.deviceName,
            userAgent: userAgent ?? existing.userAgent,
            active: 1,
            lastActive: now,
            revokedAt: null,
          })
          .where(eq(deviceTokens.id, existing.id));
      }

      return NextResponse.json({ success: true, action: "updated" });
    }

    // Insert new token
    await db.insert(deviceTokens).values({
      userId: session.userId,
      tenantId: session.tenantId,
      fcmToken,
      platform,
      deviceName: deviceName ?? null,
      userAgent,
      active: 1,
      lastActive: now,
    });

    return NextResponse.json({ success: true, action: "created" });
  } catch (err) {
    console.error("[register-device] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE /api/notifications/register-device - revoke a device token */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fcmToken } = body as { fcmToken?: string };

    if (!fcmToken) {
      return NextResponse.json({ error: "Missing fcmToken" }, { status: 400 });
    }

    await db
      .update(deviceTokens)
      .set({ active: 0, revokedAt: new Date() })
      .where(eq(deviceTokens.fcmToken, fcmToken));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[revoke-device] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
