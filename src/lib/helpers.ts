// Generate random URL-safe tokens for QR codes
export function generateToken(length = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Hash IP for privacy (GDPR/UU PDP)
export async function hashIp(ip: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(ip + (process.env.IP_SALT || "demo-salt"));
  const hash = await crypto.subtle.digest("SHA-256", data);
  const arr = Array.from(new Uint8Array(hash));
  return arr.slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}

export function formatDate(d: Date | number, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }): string {
  const date = typeof d === "number" ? new Date(d * 1000) : d;
  return date.toLocaleString("id-ID", opts);
}
