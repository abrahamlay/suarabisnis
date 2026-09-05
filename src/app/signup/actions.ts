"use server";

import { db } from "@/db";
import { tenants, users, categories, branches } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { slugify } from "@/lib/helpers";

export type SignupResult = { error: string } | undefined;

const DEFAULT_CATEGORIES = [
  { name: "Pelayanan", icon: "smile", order: 0 },
  { name: "Produk", icon: "package", order: 1 },
  { name: "Kebersihan", icon: "sparkles", order: 2 },
  { name: "Lainnya", icon: "message", order: 3 },
];

async function generateUniqueSlug(baseName: string): Promise<string> {
  const base = slugify(baseName) || "tenant";
  let candidate = base;
  let n = 1;
  // Try up to 10 times to find unique slug
  while (n < 10) {
    const existing = await db.query.tenants.findFirst({ where: eq(tenants.slug, candidate) });
    if (!existing) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
  // Fallback: append random suffix
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function signupAction(formData: FormData): Promise<SignupResult> {
  const businessName = String(formData.get("businessName") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!businessName || !ownerName || !email || !password || !confirmPassword) {
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

  // Check email uniqueness
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    return { error: "Email sudah terdaftar. Silakan masuk." };
  }

  // Generate unique slug
  const slug = await generateUniqueSlug(businessName);

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create tenant
  const tenantId = crypto.randomUUID();
  await db.insert(tenants).values({
    id: tenantId,
    name: businessName,
    slug,
    plan: "free",
    ownerEmail: email,
  });

  // Create user (owner)
  const userId = crypto.randomUUID();
  await db.insert(users).values({
    id: userId,
    tenantId,
    email,
    passwordHash,
    name: ownerName,
    role: "owner",
  });

  // Insert default categories
  for (const cat of DEFAULT_CATEGORIES) {
    await db.insert(categories).values({
      tenantId,
      name: cat.name,
      icon: cat.icon,
      order: cat.order,
      active: 1,
    });
  }

  // Create session
  await createSession({
    userId,
    tenantId,
    tenantSlug: slug,
    role: "owner",
    email,
    name: ownerName,
  });

  redirect("/onboarding");
}