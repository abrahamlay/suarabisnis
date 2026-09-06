# Laporan Verifikasi BRD/PRD vs Project SuaraBisnis

Tanggal: 2026-09-06
Reviewer: OpenCode (`opencode-go/minimax-m2.7`)
Dokumen:
- `/home/opc/SuaraBisnis/docs/BRD-SuaraBisnis-v1.md`
- `/home/opc/SuaraBisnis/docs/PRD-SuaraBisnis-v1.md`
Project: `/data/docker/feedback-saas-demo`

> Laporan ini berdasarkan inspeksi source code dan dokumen. OpenCode tidak menjalankan browser/device test dan tidak mengubah source code.

## Executive summary

Estimasi coverage requirements: **~65%**.

Core yang sudah cukup kuat:

- Mini CRM feedback/tiket: status, detail, reply, internal notes
- Basic funnel analytics dan visit tracking
- Branding settings
- QR PNG generation
- Social proof generator dengan 3 template
- Push notification infrastructure via FCM

Gap kritis sebelum public launch:

1. Email notification requirement FR-14 belum ada; implementasi sekarang FCM push.
2. Consent checkbox UU PDP belum ada.
3. Rate limiting form feedback belum ada.
4. Daily digest tiket belum ditambahkan.
5. Beberapa requirement analytics belum lengkap.
6. QR SVG belum tersedia.
7. Flow publik berbeda dari BRD/PRD: source memakai rating 1–5, dokumen mendeskripsikan dua CTA Puas/Kecewa.

## Traceability matrix

| Ref | Requirement | Status | Evidence |
|---|---|---|---|
| FR-1 | Public bio-link dua CTA | Partial | `src/app/f/[branch_slug]/page.tsx`, `form.tsx`; implementasi memakai rating flow |
| FR-2 | Slug unik/permanen | Partial | `schema.ts`, settings branches; slug dapat diubah tanpa audit log |
| FR-3 | Visit tracking | Implemented | `visits`, `/api/visits/track` |
| FR-4 | Form keluhan kontak opsional | Partial | `form.tsx`, `actions.ts`; consent dan min 20 karakter belum ada |
| FR-5 | Konfirmasi submit | Implemented/partial | `form.tsx`; estimasi saat ini 1×24 jam, bukan 4 jam |
| FR-6 | Tabel tiket/status | Implemented | `feedback/page.tsx`, `status-badge.tsx` |
| FR-7 | Detail tiket/history | Implemented/partial | detail feedback, replies, notes; status-change timeline belum lengkap |
| FR-8 | 4 metrik analytics | Partial | analytics page; metrik Tiket Baru 7d belum tersedia |
| FR-9 | Filter waktu | Partial | ada 24h/7d/30d; 90d dan all-time belum ada |
| FR-10 | Branding | Implemented/partial | branding settings; batas greeting berbeda dari PRD |
| FR-11 | QR high-res PNG/SVG | Partial | PNG ada; SVG belum ada |
| FR-12 | Review-to-image 9:16 | Partial | generator ada; output/dimensi perlu diselaraskan dengan PRD 1080×1920 |
| FR-13 | 3 template | Implemented | `star-five`, `star-quote`, `minimal-card` |
| FR-14 | Email tiket baru | Missing | FCM ada di `src/lib/firebase/triggers.ts`, email belum ada |
| FR-15 | Daily digest | Missing | tidak ada scheduler/digest implementation |

## Kontradiksi BRD/PRD vs implementasi

### Public interaction

Dokumen:

```text
Puas → Google Review
Kecewa → form internal
```

Implementasi:

```text
Rating 4–5 → Google Review CTA
Rating 1–2 → feedback internal
Rating 3 → neutral flow
```

Ini bukan bug otomatis; ini keputusan UX yang berbeda dari dokumen dan perlu diputuskan Product Owner.

### URL publik

Dokumen menggunakan format konseptual:

```text
suarabisnis.app/{slug}
```

Implementasi menggunakan:

```text
/f/{branch_slug}
```

### Notification channel

Dokumen mensyaratkan email. Implementasi utama saat ini FCM push. Schema memang memiliki preferensi email, tetapi pengiriman email belum terhubung.

### Social proof dimensions

PRD/BRD menargetkan output 1080×1920 (9:16). Verifikasi OpenCode menemukan implementasi generator perlu diselaraskan dengan requirement ini; validasi visual/dimensi runtime tetap perlu dijalankan terpisah.

## Risiko kritis

### Compliance

Tidak ditemukan consent checkbox eksplisit untuk nama/WhatsApp/contact data, padahal BRD NFR-8 dan PRD mensyaratkannya.

### Spam/abuse

Tidak ditemukan rate limiting form feedback max 5 submit/IP/jam. Honeypot, suspicious flag, dan quota image generation juga belum lengkap.

### Operational response time

Tanpa email notification dan daily digest, target BG-2 median response ≤4 jam berisiko tidak tercapai.

### Slug/QR stability

Slug dapat berubah tanpa audit trail. QR yang sudah dicetak dapat menjadi invalid bila slug branch berubah.

### Input validation

Validasi min 20 karakter dan nomor WhatsApp Indonesia belum sesuai edge cases PRD.

## Prioritas rekomendasi

### P0 — sebelum public launch

1. Tambah consent checkbox wajib untuk data pribadi.
2. Implementasikan email notification ticket.created.
3. Tambahkan rate limiting form feedback.
4. Validasi min 20 karakter.
5. Pastikan status-change dan response-time timestamp tercatat.

### P1

1. Tambah daily digest tiket >24 jam.
2. Tambah card Tiket Baru 7d.
3. Tambah filter 90d dan all-time.
4. Tambah QR SVG.
5. Tambahkan audit log perubahan slug.
6. Tambahkan quota image generation.

### P2

1. Selaraskan public interaction dengan keputusan product final.
2. Selaraskan social proof ke 1080×1920 jika requirement tetap 9:16.
3. Tambahkan Playwright acceptance tests dari Given/When/Then PRD.
4. Tambahkan Lighthouse CI untuk LCP p95 ≤1500ms.
5. Formalisasi migration database versioned.

## Kesimpulan

Project sudah memiliki fondasi teknis yang baik dan sebagian besar core workflow berjalan. Namun berdasarkan BRD/PRD, project **belum siap public launch** sampai minimal consent, email notification, dan rate limiting tersedia. Gap terbesar bukan pada halaman dashboard, melainkan compliance, operational notification, abuse prevention, dan perbedaan keputusan UX public flow.

OpenCode model awal `opencode-go/minimax-m2.1` tidak tersedia; review berhasil dijalankan dengan `opencode-go/minimax-m2.7`.

---

Generated by Hermes Agent from OpenCode review on 2026-09-06.
