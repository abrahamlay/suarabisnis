# SuaraBisnis Testing Report

Tanggal: 2026-09-05
Target: production `https://bamboy.my.id`
Workspace: `/data/docker/feedback-saas-demo`

## Executive summary

- TypeScript check: **PASS**
- Next.js production build: **PASS**
- Production service health: **PASS**
- Public page routes: **PASS**
- QR-to-feedback redirect: **PASS**
- Invalid QR handling: **PASS**
- Google redirect fallback: **PASS**
- Parser unit scenarios: **PASS**
- Database schema: **PASS with finding** — 15 tables, but 3 existing QR tokens have no `google_original_url`
- Unauthenticated API protection: **PASS**
- Logo upload empty request: **FAIL** — returns 500 instead of expected 400
- Full authenticated dashboard mutation flow: **NOT EXECUTED** — requires valid user session
- Real Android/iOS app interaction: **NOT EXECUTED** — HTTP user-agent simulation is not equivalent to real-device testing
- Google review completion: **NOT MEASURABLE** — Google provides no callback confirming a posted review

## 1. Build and static checks

Command:

```bash
npx tsc -p tsconfig.json --noEmit
npm run build
```

Result: **PASS**.

Build output:

- Next.js 16.3.3 with webpack
- Compilation successful
- TypeScript completed successfully
- 14 static pages generated
- Dynamic routes generated successfully
- Postbuild copied `.next/static` and `public` to standalone

Non-blocking warning:

```text
The "middleware" file convention is deprecated. Please use "proxy" instead.
```

## 2. Public route smoke tests

All tested with HTTP GET and follow redirects where appropriate.

| Route | Result |
|---|---:|
| `/` | 200 PASS |
| `/demo/` | 200 PASS |
| `/pricing/` | 200 PASS |
| `/login/` | 200 PASS |
| `/signup/` | 200 PASS |
| `/onboarding/` | 200 PASS |
| `/f/warung-demo/` | 200 PASS |
| `/f/kemang/` | 200 PASS |
| `/r/demoQRsudirman01abc/` | 302 to feedback PASS |
| `/r/demoQRkemang01xyz123/` | 302 to feedback PASS |
| `/r/qrbamItmmyWtn7Yw0I5ah/` | 302 to feedback PASS |
| `/r/tokongakada123/` | 404 PASS |

Observed QR redirects:

```text
/r/demoQRsudirman01abc/ -> /f/warung-demo?token=...&source=qr
/r/demoQRkemang01xyz123/ -> /f/kemang?token=...&source=qr
/r/qrbamItmmyWtn7Yw0I5ah/ -> /f/warung-demo?token=...&source=qr
```

## 3. Google redirect tests

`?go=1` was tested with Android, iOS, and desktop user-agent strings.

Current canonical result for Yuu Coffee:

```text
https://www.google.com/maps/place/Yuu+Coffee/@-6.2245118,106.991954,17z
```

This is the current Google canonical format used by the application when coordinates are available.

Important limitation: the HTTP test can verify the generated redirect but cannot prove how the installed Google Maps Android/iOS app handles it. Real-device testing remains required.

## 4. API route tests

| API | Request | Result | Assessment |
|---|---|---:|---|
| `/api/qr/demoQRsudirman01abc/` | unauthenticated GET | 401 | PASS — protected |
| `/api/qr/tokongakada123/` | unauthenticated GET | 404 | PASS — unknown token |
| `/api/visits/track/` | POST `{}` | 400 `visitId and action required` | PASS — validation |
| `/api/notifications/preferences/` | GET | 405 | PASS — method restricted; route expects PUT |
| `/api/notifications/register-device/` | POST `{}` | 401 | PASS — protected |
| `/api/notifications/test/` | POST `{}` | 401 | PASS — protected |
| `/api/upload/logo/` | POST empty | 500 `internal` | **FAIL — should return 400 for missing input** |

The upload endpoint has explicit 400 handling in source for missing `tenantSlug`/`dataUrl`, but the observed production response is 500. This should be investigated before production use.

## 5. Google Maps parser scenarios

Tested through the real `parseGoogleMapsLink` server action implementation:

| Input | Result |
|---|---|
| `https://maps.app.goo.gl/JfDufw4cRxa2XPs86` | PASS — Feature ID + Yuu Coffee name extracted |
| `ChIJtcaxrqlBw4cRwdJ8nA8C5d0` | PASS — Place ID extracted |
| `0x2e698d0032709671:0xd34a0bf3fa0b6af1` | PASS — Feature ID accepted |
| empty string | PASS — rejected as `URL kosong` |
| `not-a-url` | PASS — rejected as invalid |

The tested Share link resolves to Yuu Coffee, Summarecon Bekasi, and the exact business metadata is returned by Google.

## 6. Database checks

Runtime database inspected: `.next/standalone/data/demo.db`.

Observed:

```text
tables: 15
branches: 2
review QR tokens: 3
feedback: 6
```

Finding:

```text
3 QR tokens have google_original_url NULL/empty
```

These are legacy/demo tokens. New QR creation stores the original pasted URL. Existing tokens still work through coordinate/name fallback but do not retain the original Share-link metadata.

The runtime migration for `google_original_url`, `google_place_lat`, and `google_place_lng` is now present in source `src/db/index.ts`.

## 7. Server action test

A rating-only positive feedback was executed through the real `submitFeedback` implementation.

Result:

```text
result: {"success":true}
saved: {"rating":5,"outcome":"positive","message":"(rating 5 bintang saja)"}
```

This verifies the positive funnel's rating-only persistence path.

A non-blocking local test warning appeared because the standalone test environment does not provide the `server-only` package to the direct `tsx` invocation. The action still completed successfully and saved the record. Normal Next.js runtime bundling is separate from this direct test harness.

## 8. Features covered by source/build/smoke verification

- Public landing page
- Demo page
- Pricing pages
- Login/signup/onboarding page rendering
- Feedback form rendering
- Rating-based feedback funnel source path
- Rating-only feedback persistence
- QR token lookup
- QR active/inactive/unknown handling by source inspection and route smoke test
- QR-to-feedback redirect
- Google Maps redirect fallback
- Google Share-link parser
- QR image API auth boundary
- Visit tracking validation
- FCM API auth boundaries
- Logo API route presence and validation path
- Social proof route/build inclusion
- Analytics route/build inclusion
- Branch/category/branding/settings route/build inclusion
- Standalone CSS/JS asset copy

## 9. Features not fully verified

These need a logged-in browser session, Firebase credentials, or real devices:

- Signup form submission
- Login success/session cookie
- Tenant isolation using multiple accounts
- Branch create/update/delete
- Category create/update/reorder
- Branding upload/update
- Notification preference update
- Device registration/revocation
- Real FCM push delivery
- Social proof image visual correctness/download
- QR create from dashboard through browser interaction
- QR toggle/delete through browser interaction
- Authenticated QR PNG generation
- Billing/mock checkout mutation
- Real Android PWA → Google Maps app handoff
- Real iOS PWA → Google Maps app handoff
- Actual Google review posting

## 10. Findings and priorities

### P0/P1 — Fix before broad production testing

1. **Logo upload empty request returns 500**
   - Expected: 400 validation response
   - Observed: 500 `{"error":"internal"}`
   - Investigate runtime schema/database or exception path.

2. **Google Maps needs real-device matrix testing**
   - HTTP status and redirect URL are not enough.
   - Test Android Chrome, installed Android PWA, iOS Safari, installed iOS PWA, and desktop Chrome.

3. **Legacy QR records should be repaired or clearly marked**
   - Three tokens lack `google_original_url`.
   - Coordinate/name fallback exists, but it is less reliable than the original Google Share link.

### P2 — Hardening

4. Add automated tests for parser and redirect builder.
5. Add Playwright smoke tests for public pages and QR funnel.
6. Add authenticated E2E tests for dashboard features.
7. Replace runtime additive migration approach with versioned Drizzle migrations.
8. Migrate deprecated Next.js `middleware` convention to `proxy`.
9. Add a separate `google_review_url` field for official Google Business Profile review links.

## Final assessment

The project builds and the primary public funnel is operational. The QR scan-to-feedback flow works over HTTP, and the Google redirect now uses canonical name+coordinate URLs or preserved owner links.

The project is **not yet fully production-verified** because authenticated dashboard workflows, FCM, upload mutation, and real Android/iOS/PWA behavior were not all exercised. The first concrete defect found by live testing is the logo upload endpoint returning 500 on invalid empty input.

Report generated from actual commands and responses; no unexecuted feature is marked as fully passed.
## 11. Exact test command outputs

### Build

```text
Next.js 16.3.3 (webpack)
Compiled successfully
Finished TypeScript
Generating static pages ... 14/14
```

### QR funnel

```text
QR scan: 302 -> https://bamboy.my.id/f/warung-demo?token=...&source=qr
form page: 200
invalid token: 404
```

### Parser

```text
share -> feature_id + Yuu Coffee name
place -> place_id
feature -> feature_id
empty -> invalid: URL kosong
garbage -> invalid: Bukan URL valid
```

### Runtime service

```text
home 200
```

### Production asset check

```text
CSS: 200
JS: 200
```

## 12. Recommended next action

Fix the logo upload 500 first, then run real-device acceptance tests using one known valid production Share link per branch. Only after that should the Google Maps flow be marked production-ready.

---

Generated by Hermes Agent on 2026-09-05.
