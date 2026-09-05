"use server";

import { db } from "@/db";
import { tenants, users, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";

export type TenantSignupResult = { error: string } | undefined;

const DEFAULT_CATEGORIES = [
  { name: "Pelayanan", icon: "smile", order: 0 },
  { name: "Produk", icon: "package", order: 1 },
  { name: "Kebersihan", icon: "sparkles", order: 2 },
  { name: "Lainnya", icon: "message", order: 3 },
];

export async function tenantSignupAction(tenantSlug: string, formData: FormData): Promise<TenantSignupResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!name || !email || !password || !confirmPassword) {
    return { error: "Semua field wajib diisi." };
  }
  if (password.length < 8) {
    return { error: "Kata sandi minimal 8 karakter." };
  }
  if (password !== confirmPassword) {
    return { error: "Konfirmasi kata sandi tidak cocok." };
  }
  if (!email.includes("@")) {
    return { error: "Format email tidak valid." };
  }

  // 1. Lookup tenant by slug
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenantSlug) });
  if (!tenant) {
    return { error: "Bisnis tidak ditemukan." };
  }

  // 2. Check email uniqueness for this tenant
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    return { error: "Email sudah terdaftar. Silakan masuk." };
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // 4. Create user (owner role since per-tenant signup is for the existing business)
  const userId = crypto.randomUUID();
  await db.insert(users).values({
    id: userId,
    tenantId: tenant.id,
    email,
    passwordHash,
    name,
    role: "owner",
  });

  // 5. If tenant has no categories yet, seed defaults
  const catCount = await db.query.categories.findFirst({ where: eq(categories.tenantId, tenant.id) });
  if (!catCount) {
    for (const cat of DEFAULT_CATEGORIES) {
      await db.insert(categories).values({
        tenantId: tenant.id,
        name: cat.name,
        icon: cat.icon,
        order: cat.order,
        active: 1,
      });
    }
  }

  // 6. Create session
  await createSession({
    userId,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    role: "owner",
    email,
    name,
  });

  redirect(`/app/${tenant.slug}`);
}
