import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { visits } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/visits/track
 * Update a visit record with the action the visitor took.
 * Body: { visitId: string, action: "clicked_google" | "submitted_feedback" | "bounced", durationMs?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { visitId, action, durationMs } = body as {
      visitId: string;
      action: "clicked_google" | "submitted_feedback" | "bounced";
      durationMs?: number;
    };

    if (!visitId || !action) {
      return NextResponse.json({ error: "visitId and action required" }, { status: 400 });
    }

    const validActions = ["clicked_google", "submitted_feedback", "bounced"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "invalid action" }, { status: 400 });
    }

    await db
      .update(visits)
      .set({
        action,
        durationMs: typeof durationMs === "number" ? Math.round(durationMs) : null,
      })
      .where(eq(visits.id, visitId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/visits/track]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
