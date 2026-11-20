# Unlinked+ 💔

**"LinkedIn untuk Orang yang Lagi Gagal."**

Unlinked+ is a mobile-first Indonesian social platform where users celebrate career failures, workplace grievances, and HRD rejections anonymously — using cute cartoon avatars instead of real photos. It is the Anti-LinkedIn: sarkastik, empatik, and built for *budak korporat* and fresh graduates who are tired of seeing people flex on the other platform.

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
    └── app.js              # Tab navigation, XP display, profile tab
```

External CDN dependencies (loaded from `<script>` tags — no install needed):
- [html2canvas](https://html2canvas.hertzen.com/) — certificate PNG export
- [canvas-confetti](https://github.com/catdad/canvas-confetti) — purchase celebration
- [Google Fonts](https://fonts.google.com/) — Nunito (display) + Inter (body)

---

## localStorage Keys

All keys are prefixed `sambatin_` to avoid collisions.

| Key | Type | Description |
|-----|------|-------------|
| `sambatin_quota` | number | Remaining waitlist spots (starts at 142) |
| `sambatin_waitlist` | array | Submitted email/phone entries |
| `sambatin_avatar` | object `{character, accessories[]}` | Current avatar character and equipped accessories |
| `sambatin_purchases` | array of strings | IDs of purchased shop items |
| `sambatin_posts` | array of objects | All feed posts (seeded with 5 dummies on first run) |
| `sambatin_reactions` | object keyed by postId | Reaction counts and which reactions the user has given |
| `sambatin_xp` | number | Cumulative XP (Mental Baja Points) |
| `sambatin_username` | string | Display username shown in posts and profile |
| `sambatin_active_tab` | string | Last active bottom-nav tab, restored on reload |

---

## Browser Compatibility

Requires a modern browser with ES5 support, `localStorage`, `CustomEvent`, and `IntersectionObserver`. Tested on Chrome 120+, Edge 120+, Firefox 121+. All JS is written in ES5-compatible syntax (IIFE pattern, no `import`/`export`, no arrow-function-only APIs).
