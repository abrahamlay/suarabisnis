/**
 * PUT /api/notifications/preferences
 * Update the current user's notification preferences.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { notificationPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      pushEnabled,
      notifyOnPositive,
      notifyOnNegative,
      notifyOnNeutral,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
    } = body as {
      pushEnabled?: boolean;
      notifyOnPositive?: boolean;
      notifyOnNegative?: boolean;
      notifyOnNeutral?: boolean;
      quietHoursEnabled?: boolean;
      quietHoursStart?: string;
      quietHoursEnd?: string;
    };

    // Validate time format if provided
    if (quietHoursStart && !/^\d{2}:\d{2}$/.test(quietHoursStart)) {
      return NextResponse.json({ error: "Invalid quietHoursStart format" }, { status: 400 });
    }
    if (quietHoursEnd && !/^\d{2}:\d{2}$/.test(quietHoursEnd)) {
      return NextResponse.json({ error: "Invalid quietHoursEnd format" }, { status: 400 });
    }

    const existing = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, session.userId),
    });

    const values = {
      pushEnabled: pushEnabled ? 1 : 0,
      notifyOnPositive: notifyOnPositive ? 1 : 0,
      notifyOnNegative: notifyOnNegative ? 1 : 0,
      notifyOnNeutral: notifyOnNeutral ? 1 : 0,
      quietHoursEnabled: quietHoursEnabled ? 1 : 0,
      quietHoursStart: quietHoursStart ?? "22:00",
      quietHoursEnd: quietHoursEnd ?? "07:00",
    };

    if (existing) {
      await db
        .update(notificationPreferences)
        .set(values)
        .where(eq(notificationPreferences.userId, session.userId));
    } else {
      await db.insert(notificationPreferences).values({
        userId: session.userId,
        tenantId: session.tenantId,
        ...values,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[notifications/preferences] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
