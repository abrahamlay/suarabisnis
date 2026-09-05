import { ensureSchema } from "@/db";
import "./globals.css";

export const metadata = {
  title: "SuaraBisnis — Kritik & Saran untuk Bisnis Anda",
  description: "Platform kritik & saran modern untuk owner bisnis Indonesia",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Ensure DB schema is initialized before any route renders
  await ensureSchema();
  return (
    <html lang="id">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
