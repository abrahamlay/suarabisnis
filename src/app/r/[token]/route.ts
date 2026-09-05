import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, ensureSchema } from "@/db";
import { reviewQrTokens, reviewScans, branches, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashIp } from "@/lib/helpers";

// Next.js route handler for public review QR scans
// GET /r/:token
// - Looks up token in review_qr_tokens
// - 404 if not found or inactive
// - Logs scan to review_scans (best-effort; do not block redirect on failure)
// - If googlePlaceId is missing/invalid, shows a friendly error page with fallback link
// - Otherwise 302 redirects to Google write-review URL
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;

  // Ensure schema exists (idempotent, cached)
  await ensureSchema();

  // Lookup token
  const row = await db.query.reviewQrTokens.findFirst({
    where: eq(reviewQrTokens.token, token),
  });

  if (!row || row.active !== 1) {
    return notFoundPage("QR Code tidak ditemukan atau sudah nonaktif. Silakan hubungi owner bisnis untuk QR yang baru.");
  }

  // Look up branch + tenant for branding + fallback
  const branch = await db.query.branches.findFirst({ where: eq(branches.id, row.branchId) });
  const tenant = branch ? await db.query.tenants.findFirst({ where: eq(tenants.id, branch.tenantId) }) : null;

  // Validate identifier format. Accept either:
  // - Google Place ID: ChIJ... (alphanumeric + underscore + hyphen, 20+ chars)
  // - Google Feature ID: 0x...:0x... (hex + colon, used when Place ID isn't available)
  const isPlaceId = /^ChIJ[A-Za-z0-9_-]{20,}$/.test(row.googlePlaceId);
  const isFeatureId = /^0x[a-f0-9]+:0x[a-f0-9]+$/i.test(row.googlePlaceId);
  const isValid = isPlaceId || isFeatureId;
  if (!row.googlePlaceId || !isValid) {
    return errorPage({
      title: "Google Review Belum Dikonfigurasi",
      message: `Owner ${tenant?.name ?? "bisnis ini"} belum menambahkan Google Place ID untuk ${branch?.name ?? "cabang ini"}. Hubungi owner untuk setup, atau cari manual di Google Maps.`,
      tenantName: tenant?.name ?? null,
      branchName: branch?.name ?? null,
      googleMapsSearchUrl: branch
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${tenant?.name ?? ""} ${branch.name}`.trim())}`
        : "https://www.google.com/maps/",
    });
  }

  // Phase 1: log visit (best-effort, do not block redirect on failure)
  try {
    const h = await headers();
    const userAgent = h.get("user-agent") ?? null;
    const fwd = h.get("x-forwarded-for") ?? "";
    const ip = (fwd.split(",")[0] ?? "").trim() || h.get("x-real-ip") || "unknown";
    const ipHash = await hashIp(ip);

    const { visits: visitsT } = await import("@/db/schema");
    const utmSource = req.nextUrl.searchParams.get("utm_source");
    const source: "qr_scan" | "direct_link" | "bio_link" =
      utmSource === "bio" ? "bio_link" : "qr_scan";

    await db.insert(visitsT).values({
      tenantId: tenant!.id,
      branchId: row.branchId,
      source,
      qrTokenId: row.id,
      userAgent,
      ipHash,
      action: "viewed",
    });
  } catch (err) {
    console.error("[r/[token]] visit log failed:", err);
  }

  // Best-effort scan logging (don't block redirect)
  try {
    const h = await headers();
    const userAgent = h.get("user-agent") ?? null;
    const fwd = h.get("x-forwarded-for") ?? "";
    const ip = (fwd.split(",")[0] ?? "").trim() || h.get("x-real-ip") || "unknown";
    const ipHash = await hashIp(ip);

    await db.insert(reviewScans).values({
      tokenId: row.id,
      userAgent,
      ipHash,
    });
  } catch (err) {
    // Swallow logging errors — never break the user-facing redirect
    console.error("review scan log failed:", err);
  }

  // REDIRECT STRATEGY (two-stage funnel):
  //
  // Default (plain scan): /r/:token → /f/{branch_slug}?token=...&source=qr
  //   The QR first opens the FEEDBACK FORM. There the customer rates their
  //   experience; happy customers (4-5 stars) get the "Review di Google"
  //   button which comes back here with ?go=1. Unhappy customers leave
  //   private feedback instead of a public 1-star review.
  //
  // ?go=1 (from the feedback form's Google button): redirect straight to the
  //   owner's original Google Maps link, stored verbatim.
  //
  // Why the original Share link and not a constructed write-review URL?
  // Google Maps URL formats are internal and undocumented — every
  // construction approach broke when Google changed formats (2024 data=!4m2
  // deprecation, output=embed 404, X-Frame-Options). The Share link is the
  // only format Google maintains. maps.app.goo.gl short links also open the
  // native Maps app on mobile automatically.
  const originalUrl = (row as any).googleOriginalUrl as string | null;

  const goParam = req.nextUrl.searchParams.get("go");

  // Stage 1: QR scan → feedback form (unless explicitly going to Google)
  if (goParam !== "1" && branch) {
    // Use the public base URL — behind nginx the internal origin is 127.0.0.1:3000
    const base = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    const fbUrl = new URL(`/f/${branch.slug}`, base);
    fbUrl.searchParams.set("token", token);
    fbUrl.searchParams.set("source", "qr");
    return NextResponse.redirect(fbUrl.toString(), { status: 302 });
  }

  // Stage 2 (?go=1) or no branch/fallback: go to Google, per-platform handling
  const placeName = ((row as any).googlePlaceName || branch?.googlePlaceName || branch?.name) as string | null;
  const placeId = row.googlePlaceId as string;
  const rowLat = (row as any).googlePlaceLat as number | null;
  const rowLng = (row as any).googlePlaceLng as number | null;
  const lat = rowLat ?? branch?.googlePlaceLat ?? null;
  const lng = rowLng ?? branch?.googlePlaceLng ?? null;

  let dest: string;
  if (originalUrl && /^https?:\/\//i.test(originalUrl)) {
    // Preserve any valid owner-provided Google link verbatim. This includes
    // maps.app.goo.gl, g.page review links, and future Google formats.
    dest = originalUrl;
  } else if (placeName && lat != null && lng != null) {
    // Google Maps' current canonical format. Coordinates are essential:
    // q=place_id and query_place_id are treated as search text by some
    // Android Maps versions; this path opens the actual place detail page.
    dest = `https://www.google.com/maps/place/${encodeURIComponent(placeName).replace(/%20/g, "+")}/@${lat},${lng},17z`;
  } else if (placeName) {
    // Last resort when this legacy token has no coordinates.
    dest = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
  } else {
    dest = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeId)}`;
  }

  return NextResponse.redirect(dest, { status: 302 });
}

function notFoundPage(message: string): NextResponse {
  const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>QR Tidak Ditemukan — SuaraBisnis</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #eff6ff 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; color: #0f172a; }
    .card { max-width: 28rem; width: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 2rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); text-align: center; }
    .icon { width: 4rem; height: 4rem; background: #fef3c7; border-radius: 9999px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; font-size: 2rem; }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { color: #475569; font-size: 0.875rem; line-height: 1.6; margin-bottom: 1.5rem; }
    .btn { display: inline-block; background: #0f172a; color: #fff; padding: 0.625rem 1.25rem; border-radius: 0.5rem; text-decoration: none; font-size: 0.875rem; font-weight: 500; }
    .footer { margin-top: 1.5rem; font-size: 0.75rem; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <h1>QR Code Tidak Ditemukan</h1>
    <p>${escapeHtml(message)}</p>
    <a href="/" class="btn">← Kembali ke Beranda</a>
    <p class="footer">Ditenagai oleh <strong>SuaraBisnis</strong></p>
  </div>
</body>
</html>`;
  return new NextResponse(html, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function errorPage({
  title,
  message,
  tenantName,
  branchName,
  googleMapsSearchUrl,
}: {
  title: string;
  message: string;
  tenantName: string | null;
  branchName: string | null;
  googleMapsSearchUrl: string;
}): NextResponse {
  const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — SuaraBisnis</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #eff6ff 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; color: #0f172a; }
    .card { max-width: 28rem; width: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 2rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .header { text-align: center; margin-bottom: 1.5rem; }
    .avatar { width: 4rem; height: 4rem; background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); border-radius: 1rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem; color: #fff; font-size: 1.5rem; font-weight: 700; }
    .tenant { font-size: 0.75rem; color: #64748b; }
    .branch { font-size: 0.875rem; color: #0f172a; font-weight: 600; margin-top: 0.125rem; }
    .icon { width: 3rem; height: 3rem; background: #fef3c7; border-radius: 9999px; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem; font-size: 1.5rem; }
    h1 { font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem; text-align: center; }
    p { color: #475569; font-size: 0.875rem; line-height: 1.6; margin-bottom: 1rem; text-align: center; }
    .actions { display: flex; flex-direction: column; gap: 0.5rem; }
    .btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 0.5rem; text-decoration: none; font-size: 0.875rem; font-weight: 500; }
    .btn-primary { background: #0ea5e9; color: #fff; }
    .btn-secondary { background: #fff; color: #0f172a; border: 1px solid #e2e8f0; }
    .footer { margin-top: 1.5rem; font-size: 0.75rem; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="avatar">${escapeHtml((tenantName ?? "S")[0].toUpperCase())}</div>
      <div class="tenant">${escapeHtml(tenantName ?? "Bisnis")}</div>
      ${branchName ? `<div class="branch">${escapeHtml(branchName)}</div>` : ""}
    </div>
    <div class="icon">⭐</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    <div class="actions">
      <a href="${escapeHtml(googleMapsSearchUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
        🔍 Cari di Google Maps
      </a>
      <a href="/" class="btn btn-secondary">
        ← Kembali ke Beranda
      </a>
    </div>
    <p class="footer">Ditenagai oleh <strong>SuaraBisnis</strong></p>
  </div>
</body>
</html>`;
  return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(text).replace(/[&<>"']/g, (c) => map[c] ?? c);
}

