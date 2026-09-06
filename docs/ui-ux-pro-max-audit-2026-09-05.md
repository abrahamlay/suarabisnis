# UI/UX Pro Max Audit — SuaraBisnis

Tanggal: 2026-09-05
Target: `/data/docker/feedback-saas-demo`
Skill: `ui-ux-pro-max`

## Executive summary

Project ini sudah memiliki UI yang fungsional, responsive dasar, dan konsisten memakai Tailwind + Lucide. Namun secara visual masih terasa seperti dashboard SaaS generik: dominan slate/sky, banyak rounded cards, gradient CTA, dan beberapa emoji di interface.

Rekomendasi UI/UX Pro Max untuk produk feedback/review:

- Style: **Bento Box Grid** untuk dashboard, tetapi digunakan secukupnya
- Palette: warm trust palette — gold rating, green positive CTA, red negative state, neutral navy text
- Typography: Inter untuk body; display font hanya jika benar-benar mendukung brand
- UX focus: rating dan status feedback harus menjadi hierarchy utama
- Mobile: public feedback form harus tetap one-column, large tap targets, no horizontal overflow

## Current findings

### 1. Brand visual belum spesifik

Current Tailwind brand:

```text
brand-500 #0ea5e9
brand-600 #0284c7
brand-700 #0369a1
```

Global body:

```text
bg-slate-50 text-slate-900 antialiased
```

UI Pro Max design search merekomendasikan untuk produk review/ratings:

```text
Primary: #F59E0B  (rating gold)
Accent:  #16A34A  (positive CTA)
Background: #FFFBEB
Foreground: #0F172A
```

Assessment: **Medium friction**. Sky blue masih usable, tetapi belum mengomunikasikan review/rating sekuat gold + green. Jangan mengganti seluruh brand secara massal tanpa visual review; mulai dari CTA review dan rating hierarchy.

### 2. Public feedback form terlalu banyak gradient

Ditemukan gradient pada:

- Background public form
- Positive flow
- Logo/avatar fallback
- Dashboard free-plan CTA

UI Pro Max/antislop warning: gradient dan glow harus punya fungsi hierarchy, bukan dekorasi default.

Assessment: **Medium**.

Rekomendasi:

- Hilangkan full-page gradient pada public form.
- Gunakan background neutral/off-white.
- Pertahankan satu brand accent pada tombol utama.
- Rating gold hanya dipakai pada rating.
- Green hanya dipakai untuk CTA Google review atau success state.

### 3. Dashboard memakai pola default

Dashboard saat ini:

```text
welcome card
→ 4 stat cards
→ rating/branch cards
→ recent feedback table/list
→ upgrade CTA
```

UI Pro Max mengategorikan ini sebagai default dashboard shell. Fungsional, tetapi hierarchy belum sepenuhnya dibangun dari keputusan user.

Rekomendasi:

- Jadikan `Belum Ditangani` sebagai primary operational metric.
- Letakkan feedback negatif/high priority lebih dekat ke atas.
- Rating average dan branch count menjadi secondary context.
- Jangan menambah stat card baru jika tidak menghasilkan keputusan/action.

### 4. Emoji di UI

Ditemukan antara lain:

- `Halo ... 👋`
- `Tingkatkan ke Basic 🚀`
- Emoji pada instruksi review/feedback

UI Pro Max menyarankan icon Lucide/SVG yang relevan, bukan emoji dekoratif.

Assessment: **Low-to-medium**.

Rekomendasi:

- Hapus emoji dekoratif dari dashboard.
- Pertahankan Lucide icons yang sudah digunakan.
- Emoji customer-facing hanya jika memang bagian dari brand voice, bukan sebagai icon layout.

### 5. Radius dan card treatment cukup seragam

Banyak penggunaan:

```text
rounded-lg
rounded-xl
rounded-2xl
bg-white border border-slate-200
```

Ini memberikan consistency, tetapi bila dipakai di semua elemen hierarchy menjadi datar.

Rekomendasi:

- `rounded-xl` untuk card utama.
- `rounded-lg` untuk input/control.
- `rounded-full` hanya untuk badge/status.
- Shadow hanya untuk modal/primary elevated surface.
- Jangan menambahkan shadow ke semua card.

### 6. Empty states sudah ada, tetapi perlu dipastikan actionable

Dashboard memiliki empty state feedback dengan link ke form publik. Ini pola yang benar.

Hal yang perlu dipertahankan:

```text
alasan data kosong
→ tindakan berikutnya
```

Audit lanjutan diperlukan untuk:

- QR kosong
- Analytics kosong
- Social proof kosong
- Notification device kosong
- Search/filter tanpa hasil

Masing-masing sebaiknya menjelaskan penyebab dan satu action berikutnya, bukan hanya `No data`.

### 7. Public form mobile adalah area prioritas

Public form sudah memakai:

- max-width mobile
- one-column layout
- large rating buttons
- sticky header
- map preview
- full-width submit CTA

Ini sudah sesuai arah mobile-first. Risiko UX yang perlu diuji secara visual:

- Sticky header + keyboard Android
- Rating tap target pada layar 320–375px
- Modal/feedback positive flow saat browser membuka Maps
- OSM iframe height
- Long branch name/address truncation
- Focus state keyboard/accessibility

## Prioritized changes

### P0 — Tidak perlu redesign besar

1. Hilangkan gradient full-page dari public feedback form.
2. Bedakan warna semantic:
   - gold = rating
   - green = positive/review CTA
   - amber = neutral/warning
   - red = negative/urgent
3. Pastikan CTA utama hanya satu per state.
4. Hapus emoji dekoratif dari dashboard.
5. Perbaiki empty state agar selalu punya next action.

### P1 — Dashboard workflow

1. Ubah hierarchy dashboard agar feedback open/negative lebih dominan.
2. Tambahkan filter cepat:
   - Semua
   - Belum ditangani
   - Negatif
   - High priority
3. Pertahankan stat card maksimum 2–3 metric penting.
4. Gunakan bento layout hanya untuk metric yang benar-benar berbeda bobotnya.

### P1 — QR/review flow UX

1. Label input harus konsisten: `Link Share Google Maps`.
2. Tampilkan hasil validasi bisnis sebelum generate QR:
   - nama bisnis
   - alamat
   - koordinat bila ada
3. Setelah QR dibuat, tampilkan satu CTA utama `Download QR` dan satu CTA sekunder `Test QR`.
4. Bedakan `Link lokasi` dan `Link review resmi` bila field tersebut ditambahkan.

### P2 — Design system

Tambahkan token sederhana:

```css
--color-primary: #f59e0b;
--color-success: #16a34a;
--color-warning: #d97706;
--color-danger: #dc2626;
--color-foreground: #0f172a;
--color-background: #fffbeb;
```

Jangan langsung mengganti semua class. Migrasikan per area:

1. public feedback form
2. QR review CTA
3. dashboard status/rating
4. settings pages

## What should not be changed yet

- Jangan menambahkan dark mode hanya karena dashboard.
- Jangan menambahkan glassmorphism.
- Jangan menambahkan animation library.
- Jangan menambahkan hero/feature cards ke dashboard.
- Jangan mengganti font project secara massal sebelum visual comparison.
- Jangan menambahkan chart baru tanpa pertanyaan bisnis yang jelas.

## Acceptance checklist

- [ ] Public form nyaman di 320px, 375px, 768px
- [ ] Semua CTA utama punya focus state
- [ ] Rating gold terlihat jelas tetapi tidak mewarnai semua UI
- [ ] Negative feedback terlihat urgent tanpa membuat customer takut mengisi
- [ ] Google CTA terlihat sebagai next action yang jelas
- [ ] Tidak ada gradient dekoratif yang tidak punya fungsi
- [ ] Tidak ada emoji dekoratif di dashboard
- [ ] Empty state punya cause + next action
- [ ] Tidak ada horizontal overflow
- [ ] `prefers-reduced-motion` dihormati
- [ ] Kontras teks minimal 4.5:1

## Conclusion

UI saat ini **fungsional tetapi generic**. Friksi utama bukan kekurangan komponen, melainkan hierarchy dan semantic clarity. Perbaikan terbaik bukan redesign total, tetapi focused visual pass pada public feedback form, QR review CTA, dan dashboard open/negative feedback.

Generated from actual source inspection and UI/UX Pro Max design-system search.
## Suggested next implementation

Mulai dengan satu vertical slice:

```text
public feedback form → positive rating state → Google CTA → thank-you state
```

Setelah itu lakukan visual test di 375px Android dan 390px iPhone sebelum menyentuh seluruh dashboard.

---

Generated by Hermes Agent on 2026-09-05.
.