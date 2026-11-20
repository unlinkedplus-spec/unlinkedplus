# Unlinked+ 💔

**"LinkedIn untuk Orang yang Lagi Gagal."**

Unlinked+ is a mobile-first Indonesian social platform where users celebrate career failures, workplace grievances, and HRD rejections anonymously — using cute cartoon avatars instead of real photos. It is the Anti-LinkedIn: sarkastik, empatik, and built for *budak korporat* and fresh graduates who are tired of seeing people flex on the other platform.

---

## Active architecture (audit P1)

> Catatan audit:README lama di bawah ini mendeskripsikan demo statis `file://`. Itu **bukan** arsitektur produksi aktif.

- **API aktif:** `apps/api/` (NestJS), schema `apps/api/prisma/schema.prisma`, migrasi `apps/api/prisma/migrations/`.
- **Web aktif:** `apps/web/` (Next.js), melayani `/` (Chibi publik / Same Boat setelah login), `/features/*`, `/app`, `/admin`.
- **Infra:** `docker-compose.yml`, `docker/host-nginx.conf`.
- **`legacy/`**: arsip kode Express lama yang tidak aktif (lihat `legacy/README.md`).
- **`app.html` + `js/`**: demo statis yang tetap dipertahankan untuk regression test label jujur; bukan halaman utama.

### TLS / cookie aman untuk produksi (SEC-02)

Lingkungan LAN saat ini memakai HTTP polos (`COOKIE_SECURE=false`). Untuk produksi:

1. Terminasi TLS di reverse proxy (Nginx/load balancer) dengan sertifikat valid.
2. Set `FRONTEND_URL=https://<domain>` dan `COOKIE_SECURE=true` di `.env`.
3. Redirect HTTP → HTTPS di Nginx; HSTS sudah aktif di `docker/host-nginx.conf`.
4. Pastikan origin yang diizinkan (`FRONTEND_URL`) sama persis dengan origin browser.
5. Cookie `unlinked_session` akan otomatis ber-flag `Secure` saat request melalui HTTPS
   (lihat `auth.controller.ts` — `secure` mengikuti protokol request atau `COOKIE_SECURE`).

Jangan mengaktifkan `COOKIE_SECURE=true` pada HTTP polos: cookie tidak akan dikirim browser dan login gagal.

---

## How to Run

No build step, no server required. The app runs entirely in the browser over `file://`.

1. Clone or download this repository to your machine.
2. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari) to see the **Landing / Waitlist** page.
3. Open `app.html` in the same browser to use the **main app**.

That's it. All features work offline — data is stored in `localStorage`.

---

## The 5 Core Features

### 1. Custom Avatar Builder ("Budak Korporat")
Build your anonymous identity from four character bases and five accessories.

**Characters:**
- Karyawan Kantung Mata Panda
- Anak Magang Polos
- Korban PHP HRD
- Freelancer Kurang Tidur

**Accessories** (click to equip/unequip):
- Kalung ID Card miring — *Gratis*
- Kardus cokelat barang pribadi — *Gratis*
- Gelas kopi ukuran galon — *Gratis*
- Bendera putih — *Gratis*
- Kacamata melorot — *Premium (Rp10.000)*

All avatars are drawn entirely in inline SVG — no images needed.

### 2. Beranda "Jejak Kegagalan" (The Fail Feed)
Post your failures with a required failure category:
- Ditolak HRD
- Salah Kirim Chat
- Dimarahi Bos
- Bisnis Boncos
- Salah Jurusan

**AI Sensor Anti-Pamer:** The post button is disabled in real time if you type any of the following phrases: *alhamdulillah diterima*, *gaji dua digit*, *promosi jabatan*, *bangga mengumumkan*, *humbled and honored*, *excited to share*, *thrilled to announce*, *offer letter*, *senior manager*, *dream company*. A warning message appears: "Maaf, aplikasi ini alergi kesuksesan. Silakan pamer di sebelah."

### 3. Sistem Reaksi & "Poin Mental Baja"
Three custom reaction buttons replace the standard Like:
- 🫂 **Puk-Puk** (Peluk Virtual)
- 😂 **Ngakak Maaf**
- 🤝 **Sama Banget**

Posting and receiving reactions earns **XP** (Mental Baja Points). XP drives your profile level:

| Level | Name | XP Range |
|-------|------|----------|
| 1 | Rapuh | 0 – 49 |
| 2 | Tahan Banting | 50 – 149 |
| 3 | Kebal Revisi | 150 – 299 |
| 4 | Kebal PHP HRD | 300 – 499 |
| 5 | Suhu Unlinked+ | 500+ |

### 4. Generator "Sertifikat Kegagalan" Siap Share
Every post has a **Buat Sertifikat** button. Clicking it opens a modal with an official-looking failure certificate parody:

> *SERTIFIKAT RESMI KEGAGALAN — Dengan bangga mengumumkan bahwa [Username] telah sukses [Kategori Kegagalan]*

The certificate includes your avatar, an "APPROVED BY HRD NERAKA" stamp, and a Unlinked+ watermark. Download it as a PNG via `html2canvas` and share to X, TikTok, or IG Story.

### 5. Toko Avatar & Lencana (Simulasi Monetisasi QRIS)
The **Toko Unlinked+** tab offers exclusive items:
- 🕶️ Kacamata Melorot (Rp10.000)
- 🏆 Lencana Sultan Unlinked+ (Rp15.000)
- 🧙 Lencana Suhu Unlinked+ (Rp12.000)
- 🎭 Pack Ekspresi Lengkap (Rp15.000)

Clicking **Beli** opens an instant QRIS payment simulation modal. Confirming fires a confetti animation, unlocks the item, and makes it available in the Avatar Builder immediately.

---

## File Structure

```
d:\Anti-LinkedIn\
├── index.html              # Landing & waitlist page
├── app.html                # Main app (all 5 features)
├── styles\
│   ├── main.css            # Shared design tokens, utilities, animations
│   ├── landing.css         # Landing page component styles
│   └── app.css             # App shell, tabs, feed, avatar builder, shop
└── js\
    ├── landing.js          # Waitlist form, live certificate preview
    ├── reactions.js        # Reaction system, XP engine, level logic
    ├── avatar-builder.js   # SVG avatar rendering and accessory equipping
    ├── feed.js             # Fail Feed, post creation, AI Sensor
    ├── certificate.js      # Certificate modal, html2canvas download
    ├── shop.js             # Shop catalog, QRIS modal, confetti
    ├── storage.js          # Migrates legacy sambatin_* keys to unlinkedplus_*
    └── app.js              # Tab navigation, XP display, profile tab
```

External CDN dependencies (loaded from `<script>` tags — no install needed):
- [html2canvas](https://html2canvas.hertzen.com/) — certificate PNG export
- [canvas-confetti](https://github.com/catdad/canvas-confetti) — purchase celebration
- [Google Fonts](https://fonts.google.com/) — Nunito (display) + Inter (body)

---

## localStorage Keys

All keys are prefixed `unlinkedplus_` to avoid collisions.

**Backward compatibility:** builds from before the rename stored data under `sambatin_*`. `js/storage.js` runs before every other script, copies any legacy value into the matching `unlinkedplus_*` key (only when the new key is empty), and removes the old key. Existing users keep their posts, avatar, XP, purchases and reactions after upgrading.

| Key | Type | Description |
|-----|------|-------------|
| `unlinkedplus_quota` | number | Remaining waitlist spots (starts at 142) |
| `unlinkedplus_waitlist` | array | Submitted email/phone entries |
| `unlinkedplus_avatar` | object `{character, accessories[]}` | Current avatar character and equipped accessories |
| `unlinkedplus_purchases` | array of strings | IDs of purchased shop items |
| `unlinkedplus_posts` | array of objects | All feed posts (seeded with 5 dummies on first run) |
| `unlinkedplus_reactions` | object keyed by postId | Reaction counts and which reactions the user has given |
| `unlinkedplus_xp` | number | Cumulative XP (Mental Baja Points) |
| `unlinkedplus_username` | string | Display username shown in posts and profile |
| `unlinkedplus_active_tab` | string | Last active bottom-nav tab, restored on reload |

---

## Full-stack app (`apps/api` + `apps/web`)

The routed Next.js application talks to the NestJS API. These endpoints were added for moderation and account recovery:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/overview` | Aggregated stats, recent users/posts/reports and 7-day activity |
| `GET` | `/admin/users` | Paginated user list (includes `role` and `status`) |
| `GET` | `/admin/posts` | Paginated post list |
| `PATCH` | `/admin/users/:id/status` | Activate or disable an account (cannot disable yourself) |
| `POST` | `/auth/email` | Attach an email to the signed-in account for recovery |
| `POST` | `/auth/forgot-password` | Send a single-use, 15-minute reset link (same response for unknown emails) |
| `POST` | `/auth/reset-password` | Redeem a reset token or the one-time recovery code, then revoke all sessions |

All `/admin/*` routes require a JWT session with `role === 'admin'`.

The UI lives at:
- `/admin/dashboard` — the new overview dashboard (stats, activity, users, reports)
- `/admin` — the existing moderation desk
- `/app` — sign-in modal with **Lupa kata sandi?** and reset flows; reset links open `/app?reset=<token>`

`POST /auth/register` returns a one-time `recoveryCode`. Save it — it can be used in place of an emailed link and cannot be retrieved later. Reset tokens are stored only as SHA-256 hashes in `password_reset_tokens`.

Mail delivery is configurable through `apps/api/.env`:
- `MAIL_DRIVER=disabled` (default) — no email sent; use the recovery code
- `MAIL_DRIVER=console` — log the reset link to the API console (local development)
- `MAIL_DRIVER=webhook` — POST the message to `MAIL_WEBHOOK_URL`

### Admin access and reverse proxy

`prisma/seed.cjs` creates an idempotent admin account on every `docker compose up`. Set `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env` before first boot. There is **no** default password: when `ADMIN_PASSWORD` is unset the seed generates a high-entropy password and prints it once to the console. The seed refuses to promote a pre-existing non-admin account (prevents privilege escalation) and never overwrites an existing password. Placeholder or short (<12 char) passwords are rejected.

`docker/host-nginx.conf` is the host-level reverse proxy. It must route the Next.js paths to the frontend container:

- `/_next/` → `127.0.0.1:3000` (otherwise JS/CSS chunks are served as the static landing page's HTML and the UI never hydrates)
- `/app` and `/admin` (including `/admin/dashboard`) → `127.0.0.1:3000`
- `/api` → `127.0.0.1:3001` with the `/api` prefix stripped

It also allows `'unsafe-inline'` in `script-src` because Next.js/Turbopack renders inline flight-data bootstrap scripts; without it the browser blocks hydration. All other CSP directives stay restrictive.

---

## Browser Compatibility

Requires a modern browser with ES5 support, `localStorage`, `CustomEvent`, and `IntersectionObserver`. Tested on Chrome 120+, Edge 120+, Firefox 121+. All JS is written in ES5-compatible syntax (IIFE pattern, no `import`/`export`, no arrow-function-only APIs).
