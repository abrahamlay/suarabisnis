"use server";

import { db } from "@/db";
import { tenants, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";

export type LoginResult = { error: string } | undefined;

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email dan kata sandi wajib diisi." };
  }

  // Look up user
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    return { error: "Email atau kata sandi salah." };
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Email atau kata sandi salah." };
  }

  // Load tenant for slug
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, user.tenantId) });
  if (!tenant) {
    return { error: "Tenant untuk akun ini tidak ditemukan." };
  }

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