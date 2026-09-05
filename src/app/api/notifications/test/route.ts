/**
 * POST /api/notifications/test
 * Send a test push to the current user's devices.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendPushMulticast, isPushConfigured } from "@/lib/firebase/admin";

export async function POST(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isPushConfigured()) {
      return NextResponse.json({ error: "Firebase admin belum dikonfigurasi" }, { status: 503 });
    }

    // Get user's active devices
    const devices = await db.query.deviceTokens.findMany({
      where: and(eq(deviceTokens.userId, session.userId), eq(deviceTokens.active, 1)),
    });

    if (devices.length === 0) {
      return NextResponse.json({ error: "Belum ada device terdaftar. Aktifkan push dulu." }, { status: 400 });
    }

    const result = await sendPushMulticast(
      devices.map((d) => d.fcmToken),
      {
        title: "Test Push dari SuaraBisnis",
        body: "Kalau kamu liat ini, push notification udah jalan!",
        priority: "normal",
        data: {
          type: "test",
          clickAction: `/app/${session.tenantSlug}/settings/notifications/`,
        },
      }
    );

    return NextResponse.json({
      success: true,
      sent: result.successCount,
      failed: result.failureCount,
    });
  } catch (err) {
    console.error("[test push] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
