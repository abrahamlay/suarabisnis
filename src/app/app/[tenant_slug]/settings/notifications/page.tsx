import { redirect, notFound } from "next/navigation";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { tenants, deviceTokens, notificationPreferences, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { headers } from "next/headers";
import { NotificationSettings } from "./notification-settings";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({ params }: { params: Promise<{ tenant_slug: string }> }) {
  const { tenant_slug } = await params;
  const h = await headers();
  if (h.get("x-tenant-is-public") === "1") {
    // Should never happen for /settings but defensive
    redirect(`/app/${tenant_slug}/login/`);
  }
  const session = await getSession();
  if (!session || session.tenantSlug !== tenant_slug) {
    redirect(`/app/${tenant_slug}/login/`);
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenant_slug) });
  if (!tenant) notFound();

  // Get user
  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user) notFound();

  // Get prefs
  let prefs = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.userId, user.id),
  });
  if (!prefs) {
    // Create default
    await db.insert(notificationPreferences).values({
      userId: user.id,
      tenantId: tenant.id,
      pushEnabled: 1,
      emailEnabled: 1,
      notifyOnPositive: 0,
      notifyOnNegative: 1,
      notifyOnNeutral: 0,
      quietHoursEnabled: 0,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    });
    prefs = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, user.id),
    });
  }

  // Get devices
  const devices = await db.query.deviceTokens.findMany({
    where: and(eq(deviceTokens.userId, user.id), eq(deviceTokens.active, 1)),
    orderBy: [desc(deviceTokens.lastActive)],
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Notifikasi</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        Atur push notification ke HP dan browser kamu.
      </p>
      <NotificationSettings
        initialPrefs={{
          pushEnabled: !!(prefs?.pushEnabled),
          notifyOnPositive: !!(prefs?.notifyOnPositive),
          notifyOnNegative: !!(prefs?.notifyOnNegative),
          notifyOnNeutral: !!(prefs?.notifyOnNeutral),
          quietHoursEnabled: !!(prefs?.quietHoursEnabled),
          quietHoursStart: prefs?.quietHoursStart ?? "22:00",
          quietHoursEnd: prefs?.quietHoursEnd ?? "07:00",
        }}
        initialDevices={devices.map((d) => ({
          id: d.id,
          deviceName: d.deviceName,
          platform: d.platform,
          lastActive: d.lastActive ? d.lastActive.getTime() / 1000 : null,
          active: d.active,
        }))}
      />
    </div>
  );
}
