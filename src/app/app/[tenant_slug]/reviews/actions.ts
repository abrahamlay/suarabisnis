"use server";

import { db } from "@/db";
import { tenants, users, reviewQrTokens, branches } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createSession, getSession } from "@/lib/auth";
import { generateToken, hashIp } from "@/lib/helpers";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";

/**
 * Parse various Google Maps URL formats and extract a usable identifier.
 * Returns one of:
 *   - { kind: "feature_id", value: "0x...:0x..." }  (Google internal feature ID)
 *   - { kind: "place_id", value: "ChIJ..." }         (Public Place ID)
 *   - { kind: "invalid", reason: string }
 */
export type ParsedGoogleId =
  | { kind: "feature_id"; value: string; name?: string }
  | { kind: "place_id"; value: string; name?: string }
  | { kind: "invalid"; reason: string };

export async function parseGoogleMapsLink(input: string): Promise<ParsedGoogleId> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { kind: "invalid", reason: "URL kosong" };
  }

  // Case 1: Direct Place ID (ChIJ...)
  if (/^ChIJ[A-Za-z0-9_-]{20,}$/.test(trimmed)) {
    return { kind: "place_id", value: trimmed };
  }

  // Case 2: Direct Feature ID (0x...:0x...)
  if (/^0x[a-f0-9]+:0x[a-f0-9]+$/i.test(trimmed)) {
    return { kind: "feature_id", value: trimmed };
  }

  // Case 3: URL — expand short URL, then parse
  if (!/^https?:\/\//i.test(trimmed)) {
    return { kind: "invalid", reason: "Bukan URL valid. Gunakan link Google Maps atau Place ID." };
  }

  try {
    // Follow redirect (especially for maps.app.goo.gl short links)
    const expanded = await followRedirects(trimmed, 5);

    // Always try to extract business name from URL (for Google Maps deep-link)
    // Match /place/<name> or /maps/place/<name> with optional + for spaces
    const nameMatch = expanded.match(/\/maps\/place\/([^/@?]+)/) || expanded.match(/\/place\/([^/@?]+)/);
    const name = nameMatch
      ? decodeURIComponent(nameMatch[1].replace(/\+/g, " "))
      : undefined;

    // Look for Place ID (ChIJ...) first (most portable)
    const placeIdMatch = expanded.match(/[?&]q=ChIJ[A-Za-z0-9_-]+|ChIJ[A-Za-z0-9_-]{20,}|place_id[=:](ChIJ[A-Za-z0-9_-]+)/);
    if (placeIdMatch) {
      const id = placeIdMatch[0].includes("ChIJ")
        ? (placeIdMatch[0].match(/ChIJ[A-Za-z0-9_-]+/) ?? [""])[0]
        : (placeIdMatch[1] ?? "");
      if (id) return { kind: "place_id", value: id, name };
    }

    // Fall back to Feature ID (0x...:0x...)
    const featureIdMatch = expanded.match(/0x([a-f0-9]+):0x([a-f0-9]+)/i);
    if (featureIdMatch) {
      return { kind: "feature_id", value: `0x${featureIdMatch[1]}:0x${featureIdMatch[2]}`, name };
    }

    return {
      kind: "invalid",
      reason: name
        ? `Link untuk "${name}" valid tapi tidak bisa ekstrak Place ID. Coba paste link dari Google Maps web (bukan app).`
        : "Link valid tapi tidak bisa ekstrak Place ID. Coba paste link dari share button Google Maps.",
    };
  } catch (err) {
    return { kind: "invalid", reason: `Gagal parsing URL: ${err instanceof Error ? err.message : "unknown error"}` };
  }
}

async function followRedirects(url: string, maxHops: number): Promise<string> {
  let current = url;
  for (let i = 0; i < maxHops; i++) {
    const res = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/json",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
      },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      if (loc.startsWith("/")) {
        const u = new URL(current);
        current = `${u.protocol}//${u.host}${loc}`;
      } else {
        current = loc;
      }
      continue;
    }
    // Not a redirect — return the final URL (whether or not it has a body)
    return current;
  }
  return current;
}

/**
 * Server action: create a review QR token with auto-extracted Google ID.
 * Validates plan access, parses the user's input, and saves.
 */
export type CreateReviewQrWithLinkResult =
  | { ok: true; token: string; kind: "feature_id" | "place_id"; id: string }
  | { ok: false; error: string };

export async function createReviewQrWithLink(
  tenantId: string,
  branchId: string,
  googleMapsInput: string,
  label: string
): Promise<CreateReviewQrWithLinkResult> {
  // 1. Auth & tenant check
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Anda harus login untuk membuat QR review." };
  }
  if (session.tenantId !== tenantId) {
    return { ok: false, error: "Tidak ada akses ke tenant ini." };
  }

  // 2. Plan check — Modul 2 (review-qr) requires basic/pro
  const { canUseModule } = await import("@/lib/modules");
  const { db: dbImport } = await import("@/db");
  const { tenants: tenantsT } = await import("@/db/schema");
  const tenant = await dbImport.query.tenants.findFirst({ where: eq(tenantsT.id, tenantId) });
  if (!tenant) return { ok: false, error: "Tenant tidak ditemukan." };
  if (!canUseModule(tenant.plan as "free" | "basic" | "pro", "review-qr")) {
    return { ok: false, error: "Modul Google Review QR hanya tersedia di plan Basic & Pro. Upgrade sekarang." };
  }

  // 3. Branch ownership check
  const branch = await dbImport.query.branches.findFirst({ where: eq(branches.id, branchId) });
  if (!branch || branch.tenantId !== tenantId) {
    return { ok: false, error: "Cabang tidak valid." };
  }

  // 4. Parse the Google Maps input
  const parsed = await parseGoogleMapsLink(googleMapsInput);
  if (parsed.kind === "invalid") {
    return { ok: false, error: parsed.reason };
  }

  // 5. Generate token + insert.
  // IMPORTANT: store the owner's original link verbatim (googleOriginalUrl).
  // This is the redirect target — Google maintains its own Share links, so
  // they never break. Place ID / lat-lng are kept only for the map embed.
  const token = generateToken(16);
  await db.insert(reviewQrTokens).values({
    tenantId,
    branchId,
    token,
    googlePlaceId: parsed.value,
    googlePlaceName: parsed.name || null,
    googleOriginalUrl: googleMapsInput.trim(), // verbatim Share link
    label: label || null,
    active: 1,
  });

  // 6. Audit log (best-effort — silently skip if table doesn't exist)
  try {
    const schemaMod = await import("@/db/schema");
    if (!("auditLogs" in schemaMod)) {
      // skip — fall through to revalidate below
    } else {
      // Use unknown cast to avoid TS overload complexity — runtime check is what matters
      const auditLogs = (schemaMod as Record<string, unknown>).auditLogs as
        | undefined
        | { /* drizzle table shape — values accepted at runtime */ };
      if (auditLogs) {
        const h = await headers();
        const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
        const owner = await dbImport.query.users.findFirst({ where: eq(users.tenantId, tenantId) });
        // @ts-expect-error auditLogs runtime type from schema
        await db.insert(auditLogs).values({
          tenantId,
          userId: owner?.id ?? null,
          action: "review_qr.create",
          resourceType: "review_qr_token",
          resourceId: token,
          metadata: JSON.stringify({ kind: parsed.kind, label }),
          ipHash: await hashIp(ip),
        });
      }
    }
  } catch {
    // ignore audit failure
  }

  revalidatePath(`/app/${tenant.slug}/reviews`);
  revalidatePath(`/app/${tenant.slug}/settings/branches`);

  return { ok: true, token, kind: parsed.kind, id: parsed.value };
}

// ============================================================================
// Legacy API preserved for sibling components (used by qr-form, reviews-client,
// qr-preview). These expect separate googlePlaceId input — used when owner
// already has a Place ID. The new createReviewQrWithLink above handles the
// paste-a-link flow.
// ============================================================================

/**
 * Legacy: create QR with explicit Place ID (no link parsing).
 * Used by the existing QrForm component which collects googlePlaceId directly.
 */
export type CreateReviewQrResult = {
  success?: true;
  token?: string;
  error?: string;
};

export async function createReviewQr(
  tenantId: string,
  branchId: string,
  googlePlaceId: string,
  label: string
): Promise<CreateReviewQrResult> {
  if (!googlePlaceId || googlePlaceId.length < 10) {
    return { error: "Google Place ID minimal 10 karakter." };
  }
  const token = generateToken(16);
  try {
    // Parse the input to also extract the place name (for Google Maps deep-link)
    const parsed = await parseGoogleMapsLink(googlePlaceId);
    if (parsed.kind === "invalid") {
      return { error: parsed.reason };
    }
    await db.insert(reviewQrTokens).values({
      tenantId,
      branchId,
      token,
      googlePlaceId,
      googlePlaceName: parsed.name || null,
      // Store the original input verbatim when it's a URL (Share link)
      googleOriginalUrl: /^https?:\/\//i.test(googlePlaceId.trim()) ? googlePlaceId.trim() : null,
      label: label || null,
      active: 1,
    });
    const { tenants: tenantsT } = await import("@/db/schema");
    const tenant = await db.query.tenants.findFirst({ where: eq(tenantsT.id, tenantId) });
    if (tenant) {
      revalidatePath(`/app/${tenant.slug}/reviews`);
      revalidatePath(`/app/${tenant.slug}/review-qr`);
    }
    return { success: true, token };
  } catch (err) {
    return { error: `Gagal membuat QR: ${err instanceof Error ? err.message : "unknown error"}` };
  }
}

/**
 * Phase 5: Create QR from a tenantSlug + branchId + Google Maps input.
 * Resolves tenantId internally + uses parseGoogleMapsLink to handle Place IDs, feature IDs, or full URLs.
 */
export async function createReviewQrForTenant(input: {
  tenantSlug: string;
  branchId: string;
  googlePlaceId: string;
  label?: string;
}): Promise<{ success?: true; error?: string }> {
  const session = await getSession();
  if (!session || session.tenantSlug !== input.tenantSlug) {
    return { error: "Unauthorized" };
  }
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, input.tenantSlug) });
  if (!tenant) return { error: "Tenant tidak ditemukan" };

  const branch = await db.query.branches.findFirst({ where: eq(branches.id, input.branchId) });
  if (!branch || branch.tenantId !== tenant.id) return { error: "Cabang tidak valid" };

  // Use the parser to handle Place ID / feature ID / URL
  const parsed = await parseGoogleMapsLink(input.googlePlaceId);
  if (parsed.kind === "invalid") {
    return { error: parsed.reason };
  }

  return createReviewQr(tenant.id, input.branchId, parsed.value, input.label ?? "");
}

export async function toggleReviewQr(qrId: string, active: boolean): Promise<{ error?: string }> {
  try {
    await db.update(reviewQrTokens).set({ active: active ? 1 : 0 }).where(eq(reviewQrTokens.id, qrId));
    revalidatePath("/app/[tenant_slug]/reviews", "page");
    return {};
  } catch (err) {
    return { error: `Gagal toggle QR: ${err instanceof Error ? err.message : "unknown error"}` };
  }
}

export async function deleteReviewQr(qrId: string): Promise<{ error?: string }> {
  try {
    await db.delete(reviewQrTokens).where(eq(reviewQrTokens.id, qrId));
    revalidatePath("/app/[tenant_slug]/reviews", "page");
    return {};
  } catch (err) {
    return { error: `Gagal hapus QR: ${err instanceof Error ? err.message : "unknown error"}` };
  }
}

export async function markConverted(scanId: string) {
  // For now, just mark the scan as converted. The review_scans table may not
  // have a convertedToReview column in this schema version, so no-op.
  return { ok: true };
}

export async function getQrPngDataUrl(
  token: string,
  options?: {
    size?: 256 | 512 | 1024 | 2048;
    /** Optional: show tenant logo overlay in center (Pro plan only) */
    withLogo?: boolean;
    /** UTM source tracking */
    utmSource?: string;
  }
): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  const size = options?.size ?? 512;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://bamboy.my.id";
  const utmParams = options?.utmSource
    ? `?utm_source=${encodeURIComponent(options.utmSource)}&utm_medium=qr&utm_campaign=review`
    : "";
  const url = `${baseUrl}/r/${token}${utmParams}`;

  return QRCode.toDataURL(url, {
    errorCorrectionLevel: options?.withLogo ? "H" : "M",
    width: size,
    margin: 2,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

/**
 * Phase 5: Generate QR code as raw PNG buffer (for high-res download / print).
 * Returns Buffer, caller converts to file/blob.
 */
export async function getQrPngBuffer(
  token: string,
  options?: { size?: 256 | 512 | 1024 | 2048; utmSource?: string }
): Promise<Buffer> {
  const QRCode = (await import("qrcode")).default;
  const size = options?.size ?? 1024;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://bamboy.my.id";
  const utmParams = options?.utmSource
    ? `?utm_source=${encodeURIComponent(options.utmSource)}&utm_medium=qr&utm_campaign=review`
    : "";
  const url = `${baseUrl}/r/${token}${utmParams}`;

  return QRCode.toBuffer(url, {
    errorCorrectionLevel: "M",
    width: size,
    margin: 2,
    color: { dark: "#0f172a", light: "#ffffff" },
    type: "png",
  });
}
