# Implementation Plan — Unlinked+ (Anti-LinkedIn)

> **Architecture summary:** Pure vanilla HTML/CSS/JS, no build step. Two HTML pages (`index.html`, `app.html`), three CSS files, seven JS files. All JS uses the IIFE pattern (`(function(){ ... window.ModuleName = {...}; })()`) to avoid global collisions. Modules communicate via `localStorage` (keys prefixed `unlinkedplus_`) and native `CustomEvent` fired on `window`. SVG avatars are drawn entirely with inline SVG paths/circles/rectangles — no emoji for character bodies.

---

## FEAT-001: Foundation — Shared CSS Design System + Landing Page

- [ ] 1. Create `d:\Anti-LinkedIn\styles\main.css` — global design tokens and utilities.
      Define `:root` CSS custom properties: `--color-yellow: #F5C518`, `--color-orange: #FF6B35`, `--color-navy: #1A2744`, `--color-navy-light: #2D4080`, `--color-white: #FAFAFA`, `--color-gray-100: #F0F0F0`, `--color-gray-400: #9CA3AF`, `--color-danger: #EF4444`, `--color-success: #22C55E`. Font tokens `--font-display: 'Nunito'` and `--font-body: 'Inter'`. Spacing scale `--space-1` through `--space-8` (multiples of 4px). Border-radius tokens `--radius-sm/md/lg/pill`. Global reset (box-sizing, margin/padding 0). Utility classes: `.btn-primary` (yellow bg, navy text, pill), `.btn-secondary` (navy bg, white text, pill), `.btn-ghost` (transparent with navy border), `.btn-full` (width 100%), `.badge` (small inline pill), `.modal-overlay` (fixed fullscreen dark backdrop z-index 100), `.modal-card` (centered white card z-index 101). Keyframe animations: `@keyframes fadeInUp`, `@keyframes pulse-soft`, `@keyframes spin`.
      Files: `d:\Anti-LinkedIn\styles\main.css`
      Verify: Open `index.html` in browser — no style errors in console; button utilities render correctly.

- [ ] 2. Create `d:\Anti-LinkedIn\styles\landing.css` — landing page component styles.
      Mobile-first (base = 320px). Key components: `.hero-section` (min-height 100dvh, yellow gradient bg, flex column centered), `.hero-headline` (`clamp(2rem, 6vw, 4rem)` font-size, font-weight 900, navy color), `.waitlist-form` (white card, border-radius-lg, max-width 480px, margin auto), `.urgency-badge` (orange bg, white text, pulse-soft animation), `.cert-card-preview` (yellow bg, navy border double 3px, border-radius-lg, aspect-ratio 4/3, position relative for stempel overlay), `.feature-cards-section` (1-col mobile, 3-col grid at `min-width: 768px`), `.feature-card` (white bg, border-radius-lg, shadow, hover lift transform). `.cert-stempel` (position absolute bottom-right, red border, font-weight 900, font-size 0.75rem, padding 4px 8px, transform rotate(-15deg)).
      Files: `d:\Anti-LinkedIn\styles\landing.css`
      Verify: Open `index.html` — hero occupies full viewport, feature cards show in 1 column on mobile and 3 columns on desktop.

- [ ] 3. Create `d:\Anti-LinkedIn\index.html` — landing/waitlist page, full HTML5 document.
      Load order in `<head>`: Google Fonts (Nunito + Inter), `styles/main.css`, `styles/landing.css`. Body structure:
      - `<nav class="top-nav">`: logo "Unlinked+ 💔", CTA link `<a href="app.html">Coba App</a>`.
      - `<section class="hero-section">`: hero-badge, `.hero-headline` "LinkedIn untuk Orang yang Lagi Gagal.", `.hero-subheadline`, then `.waitlist-form` card containing: urgency badge with `<span id="quota-count">142</span>`, text input `#waitlist-input`, button `#waitlist-btn`, hidden `<p id="waitlist-success">`.
      - `<section class="cert-preview-section">`: heading, `<textarea id="cert-input" maxlength="120">`, `<div id="cert-card-preview" class="cert-card-preview">` (contains all certificate markup: title, `<span id="cert-name-preview">Kamu</span>`, `<span id="cert-failure-preview">[ketik di atas]</span>`, stempel, watermark), `<button id="cert-download-landing">Download PNG</button>`.
      - `<section class="features-section">`: 3 `.feature-card` divs (🎭 Anonim, 🤖 AI Sensor, 🏆 Sertifikat).
      - `<footer>`: copyright text.
      - Scripts at bottom: html2canvas CDN, canvas-confetti CDN, `<script src="js/landing.js">`.
      Files: `d:\Anti-LinkedIn\index.html`
      Verify: Open `index.html` — all three sections visible, no broken images, no console errors.

- [ ] 4. Create `d:\Anti-LinkedIn\js\landing.js` — IIFE, landing page interactivity.
      Three responsibilities: (a) Waitlist form — on submit, read/decrement `unlinkedplus_quota` from localStorage (init 142), update `#quota-count`, store email in `unlinkedplus_waitlist` array, show `#waitlist-success`. (b) Certificate live preview — bind `input` on `#cert-input`, update `#cert-failure-preview` text in real time; bind click on `#cert-download-landing`, call `html2canvas(document.getElementById('cert-card-preview'), { scale: 2 })` then trigger PNG download as `sertifikat-kegagalan.png`. (c) Feature card entrance — `IntersectionObserver` on `.feature-card` elements, add class `visible` (triggers `fadeInUp`) when 20% in viewport.
      Files: `d:\Anti-LinkedIn\js\landing.js`
      Verify: Type in cert textarea → preview updates. Submit form → counter decrements, success message shows. Click Download PNG → `.png` file downloads.

---

## FEAT-002: App Shell + Avatar Builder

- [ ] 5. Create `d:\Anti-LinkedIn\styles\app.css` — app-specific styles.
      App shell: `.app-shell` (flex column, height 100dvh), `.app-header` (height 56px, bg white, border-bottom, flex row space-between align-center, padding 0 space-4), `.tab-content` (flex 1, overflow-y auto, padding space-4, padding-bottom 80px), `.bottom-nav` (position fixed, bottom 0, full width, 64px, bg white, border-top, flex row). `.nav-item` (flex col, align center, font-size 0.65rem, color gray-400, padding space-2, border-radius-md, transition). `.nav-item.active` (color yellow, font-weight 700). `.tab-panel` (display none). `.tab-panel.active` (display block). XP bar: `.xp-bar` (height 6px, bg gray-100, border-radius-pill), `.xp-fill` (height 100%, gradient yellow→orange, transition width 0.6s). Avatar builder: `.avatar-builder-layout` (flex col on mobile, flex row gap space-6 at 768px+), `.avatar-canvas-wrapper` (max-width 300px, aspect-ratio 1, bg #F5F5F5, border-radius-lg, margin auto), `.character-grid` (2×2 grid), `.character-card` (border 2px solid gray-100, border-radius-md, cursor pointer; `.selected` border yellow bg yellow/10), `.accessory-row` (flex row space-between align-center, padding space-3, border 1px gray-100, border-radius-md; `.equipped` bg yellow/20 border-yellow). Feed: `.post-card` (white bg, border-radius-lg, padding space-4, margin-bottom space-3, shadow-sm), `.post-avatar` (width 48px, height 48px, border-radius-pill, overflow hidden), `.reaction-row` (flex row gap space-2, margin-top space-3), `.reaction-btn` (flex, align center, gap space-1, pill border, hover bg gray-100; `.reacted` bg navy color white). Modal: `.cert-modal-card` (yellow bg, navy text, border 3px double navy, border-radius-lg, padding space-6, text-align center, position relative), `.qris-code-box` (200px square, bg gray-100, border-radius-md, margin auto, flex center). Toast: `.toast` (position fixed, bottom 80px, left 50%, translateX -50%, bg navy, white, pill, z-index 200, opacity 0 transition; `.toast.show` opacity 1). Shop: `.shop-grid` (2-col grid mobile, 3-col at 768px+). `.shop-item-card` (border 2px gray-100, border-radius-lg, padding space-4, text-align center). AI warning: `.ai-warning` (bg danger/10, border danger, border-radius-md, padding space-3, color danger, font-size 0.9rem). `@media (min-width: 768px)` overrides for multi-column layouts.
      Files: `d:\Anti-LinkedIn\styles\app.css`
      Verify: Open `app.html` — bottom nav sticks to bottom, tabs switch, no horizontal overflow at 375px.

- [ ] 6. Create `d:\Anti-LinkedIn\app.html` — main app HTML5 document.
      `<head>`: Google Fonts, `styles/main.css`, `styles/app.css`. `<body class="app-body">`:
      - `<header class="app-header">`: logo div, `<div class="user-level-area">` with `<span id="user-level-badge">Rapuh</span>` and `<div class="xp-bar"><div id="xp-fill" class="xp-fill"></div></div>`.
      - `<main class="tab-content">`: five `<section class="tab-panel" id="tab-NAME">` elements. `#tab-feed`: `<div id="feed-container"></div>`. `#tab-create`: `<h2>`, `<select id="post-category">` (5 options), `<textarea id="post-text" maxlength="280">`, `<div id="ai-sensor-warning" class="ai-warning" hidden>`, `<div id="char-count">0/280</div>`, `<button id="post-submit-btn">`. `#tab-avatar`: `<h2>`, builder layout with `<svg id="avatar-svg" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">` in canvas wrapper, right column with character grid (4 `.character-card` divs with `data-character` attributes) and accessory list (5 `.accessory-row` divs with `data-accessory` attributes). `#tab-shop`: `<h2>`, `<div id="shop-grid">`. `#tab-profile`: `<div id="profile-content">` (populated by JS).
      - Modals (outside `<main>`): `<div id="modal-overlay" class="modal-overlay" hidden></div>`, `<div id="modal-cert" class="modal-card" hidden>` containing `<div id="cert-render-target" class="cert-modal-card">` (certificate layout: logo, SERTIFIKAT RESMI KEGAGALAN title, "Dengan bangga mengumumkan bahwa" `<strong id="cert-username">`, "telah sukses" `<strong id="cert-category">`, stempel div, date span, watermark), plus `<button id="cert-download-btn">`, `<button id="cert-close-btn">`. `<div id="modal-qris" class="modal-card" hidden>`: `<h3 id="qris-item-name">`, `<p id="qris-item-price">`, `<div id="qris-code-box" class="qris-code-box">`, `<button id="qris-confirm-btn">`, `<button id="qris-cancel-btn">`.
      - Scripts at bottom (order matters): html2canvas CDN, canvas-confetti CDN, `js/reactions.js`, `js/avatar-builder.js`, `js/feed.js`, `js/certificate.js`, `js/shop.js`, `js/app.js`.
      Files: `d:\Anti-LinkedIn\app.html`
      Verify: Open `app.html` — no console errors, all 5 nav items present, page structure renders.

- [ ] 7. Create `d:\Anti-LinkedIn\js\avatar-builder.js` — IIFE, exposes `window.AvatarBuilder`.
      **Character SVG definitions** (all shapes use SVG primitives, no emoji for body parts):

      Character base body shared across all 4 (centered in 300×300 viewBox): neck rectangle `(135,165) w30 h25` fill skin color, body trapezoid as `<polygon>` points approximately `110,190 190,190 205,290 95,290`, two arm shapes as rounded `<rect>` rotated, two leg `<rect>` shapes.

      1. **panda** (Karyawan Kantung Mata Panda): head `<circle cx="150" cy="115" r="65">` fill `#FDDCB0`; hair `<path>` blob on top fill `#2D2D2D`; left eye bag `<ellipse cx="127" cy="118" rx="16" ry="8">` fill `#1A1A1A` opacity 0.35; right eye bag `<ellipse cx="173" cy="118" rx="16" ry="8">` same; left pupil `<circle cx="127" cy="116" r="5">` fill `#1A1A1A`; right pupil `<circle cx="173" cy="116" r="5">` same; tired mouth `<path d="M138,138 Q150,145 162,138">` stroke navy no fill; eyebrows `<path>` flat horizontal; body fill `#2D4080` (navy corporate shirt); small tie `<polygon>` fill `#EF4444`.

      2. **intern** (Anak Magang Polos): head same circle fill `#FFE0B2`; neat hair rectangle fill `#4A3728`; wide innocent eyes — white `<circle r="10">` with tiny black pupil `<circle r="4">` and shine `<circle r="2">` fill white; slight smile `<path>`; rosy cheeks two small pink ellipses; body fill `#93C5FD` (light blue polo).

      3. **php-victim** (Korban PHP HRD): head circle fill `#FDDCB0`; disheveled hair spiky `<path>` fill `#5C4033`; worried eyebrows `<path>` angled inward; tired eyes ellipses; frown/worried mouth `<path>`; body fill `#374151` (dark gray formal shirt), open collar `<path>` fill `#FDDCB0`.

      4. **freelancer** (Freelancer Kurang Tidur): head circle fill `#FFE0B2`; very messy hair irregular blob `<path>` fill `#2D2D2D`; massive eye bags `<ellipse>` rx=20 ry=12 fill `#1A1A1A` opacity 0.45; half-open eyes; body fill `#6B7280` (gray hoodie), hood `<path>` behind head; small laptop `<rect>` on body.

      **Accessory SVG definitions** (each is a `<g id="acc-NAME">` appended over the character):
      - `id-card`: string `<polyline points="150,160 140,185 160,185">` stroke gray; card `<rect x="130" y="185" w="40" h="28">` fill white stroke navy, transform `rotate(12 150 199)`; tiny lines inside card for text effect.
      - `kardus`: brown box `<rect x="168" y="210" w="55" h="45">` fill `#8B6914`; box top flap `<path>` open; small items peeking `<rect>` fills.
      - `kopi`: cup body `<polygon points="82,195 102,195 98,245 86,245">` fill `#D2691E`; lid `<rect>` fill white; straw `<line>` fill none stroke `#4A4A4A`; "XXL" `<text>` fill white font-size 8px.
      - `bendera`: pole `<line x1="230" y1="155" x2="230" y2="230">` stroke `#8B6914` stroke-width 3; flag `<path d="M230,155 L260,165 L230,180 Z">` fill white stroke gray.
      - `kacamata` (premium): left lens `<circle cx="127" cy="118" r="18">` fill none stroke `#1A1A1A` stroke-width 3; right lens `<circle cx="173" cy="118" r="18">` same; bridge `<line x1="145" y1="120" x2="155" y2="120">` stroke dark; temple lines extending out; group transform `rotate(5 150 118)` for the "melorot" tilt.

      `AvatarBuilder.getAvatarSVG(characterId, accessories, size)`: returns full SVG string for embedding or use as innerHTML.
      `AvatarBuilder.init()`: reads localStorage `unlinkedplus_avatar` (default: `{character:'panda', accessories:[]}`), renders into `#avatar-svg`, binds `.character-card` clicks and `.accessory-row` clicks.
      `AvatarBuilder.unlockAccessory(id)`: called by Shop after purchase — just re-renders the accessory row without the premium gate.
      `AvatarBuilder.equipAccessory(id)` / `unequipAccessory(id)`: toggle equipped list, re-render SVG, save state.
      Files: `d:\Anti-LinkedIn\js\avatar-builder.js`
      Verify: Open Avatar tab — all 4 character cards show name labels; clicking each changes SVG preview. Equipping free accessories visually adds them to the avatar. Clicking kacamata without purchase opens shop modal.

- [ ] 8. Create `d:\Anti-LinkedIn\js\app.js` — IIFE main controller.
      On `DOMContentLoaded`: (1) Tab navigation — bind click on each `.nav-item[data-tab]`, activate the matching `.tab-panel`, store in `unlinkedplus_active_tab`, restore on load. When switching to `avatar` tab, call `AvatarBuilder.init()`. When switching to `profile` tab, call `populateProfile()`. (2) Call `Feed.init()` and `Shop.init()`. (3) Modal backdrop — `#modal-overlay` click closes all modals. (4) XP/level update — listen for `unlinked+:xp-changed` CustomEvent, call `updateLevelDisplay()`. `updateLevelDisplay()`: read `unlinkedplus_xp`, compute level using thresholds (0-49→L1 Rapuh, 50-149→L2 Tahan Banting, 150-299→L3 Kebal Revisi, 300-499→L4 Kebal PHP HRD, 500+→L5 Suhu Unlinked+), update `#user-level-badge` text, compute `#xp-fill` width as percentage within current band. `populateProfile()`: render avatar SVG (200px), username from `unlinkedplus_username`, level, XP bar, stats (count posts in `unlinkedplus_posts`, sum reactions), owned badges from `unlinkedplus_purchases`. `showToast(msg)`: create `.toast` div, append to body, `.show` class, remove after 2500ms.
      Files: `d:\Anti-LinkedIn\js\app.js`
      Verify: Tab switching works. Level badge updates after posting. Profile tab shows correct data. Toast appears.

---

## FEAT-003: Fail Feed + AI Sensor + Reactions + Certificate

- [ ] 9. Create `d:\Anti-LinkedIn\js\reactions.js` — IIFE, exposes `window.Reactions`.
      LocalStorage: `unlinkedplus_reactions` (object: `{ [postId]: { pukpuk, ngakak, sama, myReactions:{pukpuk:bool, ngakak:bool, sama:bool} } }`), `unlinkedplus_xp` (number, default 0). `addReaction(postId, type)`: toggle — if `myReactions[type]` true, decrement count and XP by 1 and set false; else increment count and XP by 1 and set true. Save to localStorage. Fire `new CustomEvent('unlinked+:xp-changed', { bubbles:true })` on `window`. `addXP(amount)`: read, add, write `unlinkedplus_xp`, fire event. `getReactions(postId)`: return reaction object for post (initialize to `{pukpuk:0, ngakak:0, sama:0, myReactions:{}}` if not set). `getLevelName(xp)` and `getLevel(xp)`: pure functions using threshold constants.
      Files: `d:\Anti-LinkedIn\js\reactions.js`
      Verify: After clicking reactions in the feed, `unlinkedplus_reactions` in DevTools localStorage shows updated counts. `unlinkedplus_xp` increments. Level badge in header updates.

- [ ] 10. Create `d:\Anti-LinkedIn\js\feed.js` — IIFE, exposes `window.Feed`.
       LocalStorage: `unlinkedplus_posts` (array). Seed data (5 posts hardcoded, inserted only on first run when `unlinkedplus_posts` is null): see FEAT-003 description for full post texts. `Feed.init()`: load posts, render all, bind form. `renderPost(post)`: return HTML string for `.post-card`. Post card structure: `.post-header` (avatar SVG 48×48 via `AvatarBuilder.getAvatarSVG(post.characterId, post.accessories, 48)`, username `<strong>`, level badge `<span class="badge" style="background: LEVEL_COLOR">`, category badge colored by category). Post text `<p>`. Timestamp `<small>` (compute relative time: 'baru saja', 'x menit lalu', 'x jam lalu', 'x hari lalu'). `.reaction-row`: three buttons with emoji + label + count — `🫂 Puk-Puk (N)`, `😂 Ngakak Maaf (N)`, `🤝 Sama Banget (N)` — each with `data-post-id` and `data-reaction`. `.cert-btn` button `data-post-id`. After rendering, bind reaction clicks to `Reactions.addReaction()` and re-render just that post's reaction counts in-place (find buttons by `data-post-id`, update text). Bind cert buttons to `Certificate.openModal(post)`. AI Sensor: bind `input` on `#post-text` — bannedPhrases array (10 phrases, lowercase check with `text.toLowerCase().includes(phrase)`); if any match, `#ai-sensor-warning.hidden = false`, `#post-submit-btn.disabled = true`; else reverse. Update `#char-count` text. Post creation: on `#post-submit-btn` click, validate (category !== '' and text non-empty and sensor clean), build post object `{id: Date.now(), username: localStorage.unlinkedplus_username || 'BudakKorporat_'+..., characterId, accessories, category, text, timestamp: Date.now()}`, unshift into posts array, save, `Reactions.addXP(10)`, prepend rendered card to `#feed-container`, scroll to top, clear form.
       Files: `d:\Anti-LinkedIn\js\feed.js`
       Verify: Feed shows 5 dummy posts on first load. Banned phrase disables submit. Valid post appears at top of feed. Reaction counts update in real time.

- [ ] 11. Create `d:\Anti-LinkedIn\js\certificate.js` — IIFE, exposes `window.Certificate`.
       `Certificate.openModal(post)`: populate `#cert-username` with `post.username`, `#cert-category` with post.category + ' — ' + post.text.substring(0, 60) + (post.text.length > 60 ? '...' : ''), set `#cert-date` to today's date formatted as Indonesian ('DD Bulan YYYY'), show `#modal-cert` and `#modal-overlay` (remove `hidden`). `Certificate.downloadCert()`: call `html2canvas(document.getElementById('cert-render-target'), { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#F5C518' })` → `.then(canvas => { ... })` download as `sertifikat-sambatin.png`. On `DOMContentLoaded`, bind `#cert-download-btn` to `downloadCert()`, bind `#cert-close-btn` to close (add `hidden` to `#modal-cert` and `#modal-overlay`).
       Files: `d:\Anti-LinkedIn\js\certificate.js`
       Verify: Clicking Buat Sertifikat on a feed post opens modal with correct text. Download PNG produces a `.png` file.

---

## FEAT-004: Shop + QRIS Simulation + Profile + Polish

- [ ] 12. Create `d:\Anti-LinkedIn\js\shop.js` — IIFE, exposes `window.Shop`.
       Catalog (4 items, hardcoded): kacamata (Rp10.000), badge-sultan (Rp15.000), badge-suhu (Rp12.000), pack-expressi (Rp15.000). `Shop.init()`: render catalog into `#shop-grid`. `renderShopItem(item)`: `.shop-item-card` with emoji (large, font-size 3rem), name, description, price ('Rp' + price.toLocaleString('id-ID')), if already in `unlinkedplus_purchases` show `<span class="badge" style="background:green;color:white">Dimiliki ✓</span>`, else `<button class="btn-primary btn-sm beli-btn" data-item-id="${item.id}">Beli</button>`. Bind `.beli-btn` clicks to `Shop.openModal(item)`. `Shop.openModal(item)`: set `#qris-item-name` text, `#qris-item-price` text, generate fake QR SVG in `#qris-code-box` (10×10 grid of 10×10px `<rect>` elements, each filled black or white using `(charCodeAt(0)*col*row) % 3 === 0` for determinism), show `#modal-qris` and `#modal-overlay`. `confirmPurchase()`: add `item.id` to `unlinkedplus_purchases` array, hide modals, call `triggerConfetti()`, if `item.type === 'accessory'` call `AvatarBuilder.unlockAccessory(item.id)`, call `Shop.init()` to re-render shop, call `window.showToast('Pembelian berhasil! 🎉')`. `triggerConfetti()`: `window.confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ['#F5C518','#FF6B35','#1A2744','#ffffff','#FF6B35'] })`. Bind `#qris-confirm-btn` to `confirmPurchase()`, `#qris-cancel-btn` to close modal.
       Files: `d:\Anti-LinkedIn\js\shop.js`
       Verify: Shop tab shows 4 items. Clicking Beli opens QRIS modal with QR pattern. Confirming purchase fires confetti, re-renders item as owned, toast appears.

- [ ] 13. Add profile tab content and final CSS polish.
       In `app.js`, implement `populateProfile()`: build HTML string for `#profile-content` with avatar SVG (200×200), `<h2 id="profile-username">`, level name, XP bar, stats table (Total Unlinked+an, Total Reaksi). In `app.css`, finalize all hover/focus/active states, verify `padding-bottom: 80px` on `.tab-content`, confirm `@media (min-width: 768px)` overrides for avatar layout (2-col), shop grid (3-col), feed cards (max-width 600px centered). Add `scroll-behavior: smooth` to `html`. Confirm confetti library and html2canvas are loaded before the JS that uses them.
       Files: `d:\Anti-LinkedIn\js\app.js`, `d:\Anti-LinkedIn\styles\app.css`
       Verify: Profile tab renders avatar, username, level, XP, and stats. No horizontal scroll at 375px on any tab. Shop and avatar builder use multi-column at 768px+.

---

## Live Preview Server

After FEAT-004 is complete, start a local HTTP server for live preview in the Kiro IDE:

```
python -m http.server 3000 --directory "D:\Anti-LinkedIn"
```

Then open:
- **Landing Page:** http://localhost:3000/index.html
- **Main App:** http://localhost:3000/app.html

---

## Dependency Order Summary

```
main.css  ← landing.css, app.css both depend on it
index.html ← loads main.css, landing.css, landing.js
app.html   ← loads main.css, app.css, then JS in order:
              reactions.js (no deps)
              avatar-builder.js (no deps)
              feed.js (needs AvatarBuilder, Reactions)
              certificate.js (no deps on other modules)
              shop.js (needs AvatarBuilder)
              app.js (needs all above)
```

## LocalStorage Keys Reference

| Key | Type | Owner | Purpose |
|-----|------|-------|---------|
| `unlinkedplus_quota` | number | landing.js | Waitlist spots remaining |
| `unlinkedplus_waitlist` | array | landing.js | Submitted emails/phones |
| `unlinkedplus_avatar` | object `{character, accessories[]}` | avatar-builder.js | Current avatar state |
| `unlinkedplus_purchases` | array of item IDs | shop.js | Purchased items |
| `unlinkedplus_posts` | array of post objects | feed.js | All posts |
| `unlinkedplus_reactions` | object by postId | reactions.js | Reaction counts + user's reactions |
| `unlinkedplus_xp` | number | reactions.js | Current XP total |
| `unlinkedplus_username` | string | app.js | Display username |
| `unlinkedplus_active_tab` | string | app.js | Last active tab |

## SVG Avatar Drawing Approach

All characters use a shared 300×300 viewBox. The rendering pipeline:
1. Base body layer: neck rectangle, body trapezoid polygon, arm rectangles (slight rotation), leg rectangles.
2. Character-specific layer: head circle (skin tone), hair shape (path/blob), eyes (circles for whites + pupils + eye bags for tired characters), eyebrows (path), mouth (path), clothing (body shape recolored + collar/detail paths).
3. Accessory layer: each active accessory appends a `<g>` element over the character. Accessories are positioned absolutely within the same 300×300 coordinate system so they align correctly regardless of which character is selected.

Body coordinates (consistent across all characters):
- Head center: `(150, 115)`, radius ~65
- Neck: rect at `(135, 170)` w30 h25
- Body: polygon `110,195 190,195 205,290 95,290`
- Left arm: rect `78,195 w28 h80` rotated -8°
- Right arm: rect `194,195 w28 h80` rotated 8°
- Left leg: rect `105,285 w35 h40`
- Right leg: rect `160,285 w35 h40`
