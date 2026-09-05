# Outscraper Setup Guide — SuaraBisnis

## Step 1: Sign Up (2 menit)

1. Buka **https://outscraper.com/**
2. Klik **"Sign Up"** atau **"Get Free Credits"** (top right)
3. Pilih salah satu:
   - Sign up dengan Google account (paling cepat)
   - Sign up dengan email + password
4. Verify email (cek inbox, klik link konfirmasi)

## Step 2: Dapatkan API Key (1 menit)

1. Setelah login, klik avatar/pojok kanan atas
2. Pilih **"API Settings"** atau langsung ke **https://app.outscraper.com/api**
3. Anda akan lihat API key seperti:
   ```
   abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
   ```
4. **Copy API key** ini — simpan di tempat aman

## Step 3: Cek Free Credits (30 detik)

1. Di dashboard, lihat **"Credits"** section
2. Seharusnya sudah ada **500 free credits** (setara ~$0.25)
3. Cukup untuk testing sekitar 100-200 API calls

## Step 4: Set Env Variable di SuaraBisnis (30 detik)

SSH ke VM bamboy.my.id, lalu:

```bash
# 1. Create env file
nano /home/opc/feedback-saas-demo/.env.production

# 2. Add line (replace with your actual key):
OUTSCRAPER_API_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz

# 3. Save & exit (Ctrl+O, Enter, Ctrl+X)

# 4. Make sure Next.js loads it (add to systemd service)
nano /home/opc/.config/systemd/user/suarabisnis.service
# Add under [Service]:
#   EnvironmentFile=%h/feedback-saas-demo/.env.production

# 5. Reload & restart
systemctl --user daemon-reload
suarabisnis-restart
```

## Step 5: Test API Key (1 menit)

Cek apakah key valid:

```bash
curl -H "X-API-KEY: YOUR_KEY_HERE" \
  "https://api.outscraper.cloud/google-maps-search?query=Yuu+Coffee+Jakarta&limit=1&async=false"
```

Should return JSON array dengan data tempat.

## Step 6: Enable di SuaraBisnis

Setelah API key ada, kasih tau saya — saya akan:
1. Add Outscraper client ke codebase
2. Implement Fitur A (auto-enrich on QR creation)
3. Set up weekly cron job untuk Fitur B (refresh review count)
4. Add reviews dashboard page untuk Fitur C

## FAQ

**Q: Bisa pakai Google Places API juga?**
A: Bisa, kasih API key dari Google Cloud Console. Saya bisa support both — pilih salah satu atau keduanya (fallback).

**Q: Kalau free credits habis?**
A: Top up di https://app.outscraper.com/billing. Mulai $5 untuk 10k credits (cukup 1 bulan untuk ~200 tenant).

**Q: Apakah melanggar Google ToS?**
A: Outscraper scraping publik Google Maps data. Technically gray area, tapi Google gak actively enforce untuk volume rendah-menengah. Untuk SaaS kecil-menengah, aman. Untuk enterprise dengan compliance strict, pakai Google Places API.

**Q: Bisa share API key 1 untuk multiple tenant?**
A: Ya, **satu API key dipakai bersama** oleh semua tenant SuaraBisnis. Cost ditrack global, bukan per-tenant.

**Q: Gimana cara monitoring usage?**
A: Dashboard Outscraper kasih real-time credit usage. Set alert di $X/bulan biar gak over-spend.

## Pricing Plans Outscraper (Quick Reference)

| Plan | Credits | Cost | Best For |
|---|---|---|---|
| Free | 500 (one-time) | $0 | Testing |
| Pay-as-you-go | Per use | $0.05-0.50 per 1k | Small scale |
| Starter | 50k/mo | $49/mo | 100-500 tenants |
| Pro | 250k/mo | $199/mo | 1k-5k tenants |
| Business | 1M/mo | $599/mo | 10k+ tenants |
| Enterprise | Custom | Contact sales | 50k+ tenants |
