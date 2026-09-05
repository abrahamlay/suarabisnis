"use server";

import { db } from "@/db";
import { tenants, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";

export type TenantLoginResult = { error: string } | undefined;

export async function tenantLoginAction(tenantSlug: string, formData: FormData): Promise<TenantLoginResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email dan kata sandi wajib diisi." };
  }

  // 1. Lookup tenant by slug
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenantSlug) });
  if (!tenant) {
    return { error: "Bisnis tidak ditemukan." };
  }

  // 2. Lookup user — MUST belong to this tenant (security: no cross-tenant login)
  const user = await db.query.users.findFirst({
    where: and(eq(users.email, email), eq(users.tenantId, tenant.id)),
  });
  if (!user) {
    return { error: "Email tidak terdaftar di bisnis ini." };
  }

  // 3. Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Kata sandi salah." };
  }

  // 4. Create session
  await createSession({
    userId: user.id,
    tenantId: user.tenantId,
    tenantSlug: tenant.slug,
    role: user.role as "owner" | "admin" | "staff",
    email: user.email,
    name: user.name,
  });

  redirect(`/app/${tenant.slug}`);
}
