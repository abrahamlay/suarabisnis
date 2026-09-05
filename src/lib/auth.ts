// Simple cookie-based session for MVP. Uses HMAC-signed JWT in httpOnly cookie.
// In production, swap with Auth.js or Clerk — current implementation is single-process only.

import { cookies } from "next/headers";
import crypto from "crypto";
import { db } from "@/db";
import { tenants, type Tenant } from "@/db/schema";
import { eq } from "drizzle-orm";

const SECRET = process.env.AUTH_SECRET || "demo-secret-change-me-in-prod-32chars-min";
const COOKIE_NAME = "suara_session";
const SESSION_TTL_DAYS = 30;

export type SessionPayload = {
  userId: string;
  tenantId: string;
  tenantSlug: string;
  role: "owner" | "admin" | "staff";
  email: string;
  name: string | null;
};

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function encode(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString("base64url");
  const sig = sign(b64);
  return `${b64}.${sig}`;
}

function decode(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  const expected = sign(b64);
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(b64, "base64url").toString());
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encode(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decode(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

/**
 * Require owner/admin access to a tenant. Verifies session belongs to that tenant slug.
 * Returns the session and the tenant row.
 */
export async function requireOwner(tenantSlug: string): Promise<{ user: SessionPayload; tenant: Tenant | null }> {
  const session = await requireSession();
  if (session.tenantSlug !== tenantSlug) {
    // Wrong tenant — return null tenant, caller should notFound/redirect
    return { user: session, tenant: null };
  }
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenantSlug) });
  return { user: session, tenant: tenant ?? null };
}
