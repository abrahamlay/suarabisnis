"use client";

import { useEffect, useState } from "react";
import { requestNotificationPermission, registerServiceWorker } from "@/lib/firebase/client";
import { Bell, Smartphone, Laptop, X, Check, AlertTriangle, Send } from "lucide-react";

type Device = {
  id: string;
  deviceName: string | null;
  platform: string;
  lastActive: number | null;
  active: number;
};

type Prefs = {
  pushEnabled: boolean;
  notifyOnPositive: boolean;
  notifyOnNegative: boolean;
  notifyOnNeutral: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export function NotificationSettings({ initialPrefs, initialDevices }: { initialPrefs: Prefs; initialDevices: Device[] }) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  async function handleEnablePush() {
    try {
      await registerServiceWorker();
      const token = await requestNotificationPermission();
      if (token) {
        const res = await fetch("/api/notifications/register-device", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fcmToken: token, platform: "web", deviceName: navigator.userAgent }),
        });
        if (res.ok) {
          setPermission("granted");
          setPrefs((p) => ({ ...p, pushEnabled: true }));
          // Refresh page to show new device
          window.location.reload();
        }
      } else {
        setPermission("denied");
      }
    } catch (err) {
      console.error("Enable push failed:", err);
    }
  }

  async function handleSavePrefs() {
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        setTestResult("Pengaturan tersimpan");
        setTimeout(() => setTestResult(null), 3000);
      }
    } catch (err) {
      console.error("Save prefs failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestPush() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/notifications/test", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTestResult(`Test terkirim ke ${data.sent} device`);
      } else {
        setTestResult(`Gagal: ${data.error ?? "unknown"}`);
      }
    } catch (err) {
      setTestResult("Gagal kirim test");
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 5000);
    }
  }

  async function handleRemoveDevice(id: string) {
    if (!confirm("Hapus device ini? Push notification tidak akan terkirim lagi ke device ini.")) return;
    try {
      const res = await fetch(`/api/notifications/devices/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDevices((d) => d.filter((dev) => dev.id !== id));
      }
    } catch (err) {
      console.error("Remove device failed:", err);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Permission status */}
      {permission !== "granted" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900">
              {permission === "denied" ? "Notifikasi diblokir browser" : "Notifikasi belum aktif"}
            </h3>
            <p className="text-sm text-amber-800 mt-1">
              {permission === "denied"
                ? "Kamu pernah menolak izin notifikasi. Buka pengaturan browser untuk mengaktifkan kembali."
                : "Aktifkan notifikasi untuk dapat kabar langsung saat ada kritik dan saran baru."}
            </p>
            {permission !== "denied" && (
              <button
                onClick={handleEnablePush}
                className="mt-3 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700"
              >
                Aktifkan Sekarang
              </button>
            )}
          </div>
        </div>
      )}

      {/* Push toggle */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Push Notification</h3>
            <p className="text-sm text-slate-500 mt-1">
              Kirim notifikasi ke HP dan browser saat ada feedback baru.
            </p>
          </div>
          <Toggle
            checked={prefs.pushEnabled}
            onChange={(v) => setPrefs((p) => ({ ...p, pushEnabled: v }))}
          />
        </div>
      </div>

      {/* Event triggers */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="font-semibold text-slate-900">Kirim notifikasi untuk</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">Pilih jenis feedback yang akan kirim notifikasi.</p>
        <div className="space-y-3">
          <ToggleRow
            label="Feedback positif (4-5 bintang)"
            description="Bisa bikin spam. Disarankan OFF kecuali kamu benar-benar butuh."
            checked={prefs.notifyOnPositive}
            onChange={(v) => setPrefs((p) => ({ ...p, notifyOnPositive: v }))}
          />
          <ToggleRow
            label="Feedback negatif (1-2 bintang)"
            description="Sangat disarankan ON agar kamu bisa cepat follow up."
            checked={prefs.notifyOnNegative}
            onChange={(v) => setPrefs((p) => ({ ...p, notifyOnNegative: v }))}
          />
          <ToggleRow
            label="Feedback netral (3 bintang)"
            description="Bisa bikin spam."
            checked={prefs.notifyOnNeutral}
            onChange={(v) => setPrefs((p) => ({ ...p, notifyOnNeutral: v }))}
          />
        </div>
      </div>

      {/* Quiet hours */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-900">Jam Tenang</h3>
            <p className="text-sm text-slate-500 mt-1">Tidak kirim notifikasi di jam tertentu.</p>
          </div>
          <Toggle
            checked={prefs.quietHoursEnabled}
            onChange={(v) => setPrefs((p) => ({ ...p, quietHoursEnabled: v }))}
          />
        </div>
        {prefs.quietHoursEnabled && (
          <div className="flex gap-3 items-center text-sm">
            <input
              type="time"
              value={prefs.quietHoursStart}
              onChange={(e) => setPrefs((p) => ({ ...p, quietHoursStart: e.target.value }))}
              className="border border-slate-300 rounded-lg px-3 py-2"
            />
            <span className="text-slate-500">sampai</span>
            <input
              type="time"
              value={prefs.quietHoursEnd}
              onChange={(e) => setPrefs((p) => ({ ...p, quietHoursEnd: e.target.value }))}
              className="border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
        )}
      </div>

      {/* Devices */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="font-semibold text-slate-900">Device Terdaftar</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          Push notification akan dikirim ke semua device di bawah ini.
        </p>
        {devices.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada device terdaftar.</p>
        ) : (
          <ul className="space-y-2">
            {devices.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
              >
                {d.platform === "ios" || d.platform === "android" ? (
                  <Smartphone className="w-5 h-5 text-slate-500" />
                ) : (
                  <Laptop className="w-5 h-5 text-slate-500" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {d.deviceName ?? `${d.platform} device`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {d.lastActive
                      ? `Aktif ${new Date(d.lastActive * 1000).toLocaleDateString("id-ID")}`
                      : "Aktif"}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveDevice(d.id)}
                  className="text-slate-400 hover:text-red-500"
                  aria-label="Hapus device"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4 bg-white/80 backdrop-blur p-4 -mx-4 sm:mx-0 sm:rounded-2xl sm:border sm:border-slate-200">
        <button
          onClick={handleTestPush}
          disabled={testing || permission !== "granted"}
          className="flex items-center justify-center gap-2 border border-slate-300 px-4 py-2.5 rounded-xl font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {testing ? "Mengirim..." : "Kirim Test Push"}
        </button>
        <button
          onClick={handleSavePrefs}
          disabled={saving}
          className="flex-1 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
      </div>

      {testResult && (
        <div className="fixed top-4 right-4 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm shadow-xl">
          {testResult}
        </div>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        checked ? "bg-sky-500" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}
