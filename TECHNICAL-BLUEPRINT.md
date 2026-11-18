# unlinked+ — Product Philosophy & Technical Blueprint

> Memutus yang Toksik, Menambah yang Esensial.

---

## 1. Identitas & Filosofi Resmi

**unlinked+**  
Tagline: *Memutus yang Toksik, Menambah yang Esensial.*  
Sub-tagline: *No flex. No fake success. Just real humans.*

### Makna Unlinked
Melepaskan diri dari rantai ekspektasi korporat, budaya pencitraan, humblebrag, dan hustle culture yang tidak sehat.

### Makna Plus (+)
Menambahkan kejujuran, empati, kesehatan mental, inklusivitas, dan koneksi manusiawi.

### Manifesto unlinked+

Dunia profesional terlalu sering mengajarkan kita untuk terlihat sukses, bahkan ketika sebenarnya sedang tidak baik-baik saja.

Semua orang berlomba memamerkan pencapaian, jabatan, promosi, dan perjalanan karier yang terlihat sempurna.

Namun, siapa yang menyediakan ruang bagi mereka yang sedang gagal?

Bagi mereka yang ditolak HRD setelah lima tahap interview. Bagi mereka yang kelelahan mengejar target. Bagi freelancer yang belum dibayar. Bagi karyawan yang ingin menyerah tetapi masih harus bekerja besok pagi.

**unlinked+ hadir untuk mereka.**

Unlinked berarti memutus rantai budaya pencitraan, ekspektasi karier palsu, dan tekanan untuk selalu terlihat berhasil.

Tanda Plus (+) berarti menambahkan sesuatu yang selama ini hilang: kejujuran, empati, kewarasan, inklusivitas, dan koneksi manusia yang apa adanya.

Di sini, kegagalan bukan aib. Cerita jujur bukan kelemahan. Dan nilai seseorang tidak ditentukan oleh jabatan atau isi CV-nya.

Kami percaya bahwa manusia lebih besar daripada pekerjaannya.

Karena hidup bukan sekadar tentang bekerja, mendapatkan promosi, dan mengumpulkan pencapaian.

Ada kehidupan setelah jam kantor.

**unlinked+ — Less Flex, More Human.**

---

## 2. Arsitektur Sistem

```
unlinked+ Web App (Mobile-first • Desktop responsive • PWA-ready)
         │
    Nginx Reverse Proxy
    Routing • HTTPS • Compression • Rate limiting
         │
    ┌────┴────┐
    │         │
Frontend    Backend API — NestJS
Next.js     Authentication • Business Logic • REST API
TypeScript       │
Tailwind    ┌────┼─────────────────┐
            │    │                 │
         PostgreSQL  Redis       Local File Storage
         (primary)  (cache +     (Docker volume)
                    BullMQ)
                    │
                 Worker Service
                 (background jobs,
                  PNG export,
                  moderation)
```

### Stack Teknologi

| Komponen      | Teknologi                        |
|---------------|----------------------------------|
| Frontend      | Next.js + TypeScript             |
| UI            | Tailwind CSS                     |
| Backend       | NestJS (modular monolith)        |
| Database      | PostgreSQL 17                    |
| ORM           | Prisma                           |
| Cache         | Redis 7                          |
| Queue         | BullMQ                           |
| Avatar        | SVG + React                      |
| Sertifikat    | html2canvas                      |
| Authentication| Secure session / JWT             |
| Container     | Docker Compose                   |
| Reverse proxy | Nginx                            |
| Testing       | Vitest + Playwright              |

---

## 3. Strategi Penyimpanan: Local-first

Tiga jenis penyimpanan yang dibedakan:
1. **PostgreSQL** — sumber data utama (posts, users, reactions, transactions)
2. **Redis** — data sementara, session, rate limiting, BullMQ queue
3. **Local filesystem** — gambar avatar, foto postingan, hasil sertifikat PNG

### Struktur Direktori Server

```
unlinked-plus/
├── storage/
│   ├── uploads/
│   │   ├── avatars/
│   │   ├── posts/
│   │   └── certificates/
│   ├── exports/
│   └── backups/
├── docker/
│   └── nginx/
├── apps/
│   ├── web/          ← Next.js frontend
│   └── api/          ← NestJS backend + worker
├── packages/         ← shared types, utils
├── prisma/           ← schema & migrations
├── docker-compose.yml
└── .env
```

---

## 4. Docker Compose

```yaml
services:
  frontend:
    build: ./apps/web
    restart: unless-stopped
    environment:
      API_URL: http://backend:3001
    depends_on:
      - backend

  backend:
    build: ./apps/api
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_URL: postgresql://unlinked:${DB_PASSWORD}@postgres:5432/unlinked
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      STORAGE_PATH: /data
    volumes:
      - app_storage:/data
    depends_on:
      - postgres
      - redis

  worker:
    build: ./apps/api
    command: npm run worker
    restart: unless-stopped
    env_file: .env
    volumes:
      - app_storage:/data
    depends_on:
      - redis
      - postgres

  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: unlinked
      POSTGRES_USER: unlinked
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx:/etc/nginx/conf.d:ro
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:
  app_storage:
```

> **Catatan:** Ini fondasi konfigurasi, bukan deployment final. Healthcheck, migrasi database, TLS, dan proxy routing perlu dilengkapi sebelum produksi. Jangan buka port PostgreSQL atau Redis ke internet.

---

## 5. Modul Aplikasi

| Modul               | Fungsi                                              |
|---------------------|-----------------------------------------------------|
| Anonymous Identity  | Username + avatar, bukan nama asli                  |
| Fail Feed           | Berbagi pengalaman kerja secara anonim              |
| Anti-Flex Sensor    | Deteksi humblebrag, bukan keberhasilan manusiawi    |
| Mental Baja         | Level berdasarkan kontribusi positif                |
| Human Reactions     | Puk-Puk, Ngakak Maaf, Sama Banget                  |
| Avatar Studio       | Karakter SVG + aksesori                             |
| Failure Awards      | Sertifikat kegagalan siap viral                     |
| unlinked+ Store     | Avatar, lencana, item premium                       |
| Community           | Komentar, diskusi, interaksi                        |
| Moderation          | Pelaporan, blokir, perlindungan komunitas           |
| Admin Dashboard     | Statistik, moderasi, pengelolaan pengguna           |

---

## 6. Skema Database PostgreSQL

```sql
-- Users & Auth
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email_hash VARCHAR(255) UNIQUE,         -- hashed, never shown publicly
  password_hash VARCHAR(255) NOT NULL,    -- Argon2id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avatar_config JSONB,
  mental_level INT DEFAULT 1,
  mental_xp INT DEFAULT 0,
  bio TEXT,
  is_anonymous BOOLEAN DEFAULT TRUE
);

-- Content
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active'
);

CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL,  -- pukpuk, ngakak, sama
  UNIQUE(post_id, user_id, reaction_type)  -- cegah reaksi ganda
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Avatar & Store
CREATE TABLE avatar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  item_type VARCHAR(50),
  price INT DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE
);

CREATE TABLE user_inventory (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES avatar_items(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(user_id, item_id)
);

-- Certificates
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  image_path VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  item_id UUID REFERENCES avatar_items(id),
  amount INT NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moderation
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_type VARCHAR(20) NOT NULL,  -- post, comment, user
  target_id UUID NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Keamanan & Ketangguhan

- Email tidak pernah ditampilkan secara publik (hanya email_hash)
- Password hashing: **Argon2id**
- HTTPS + secure, HttpOnly, SameSite cookies
- Rate limiting via Redis
- Validasi semua input di backend (class-validator + NestJS pipes)
- Sanitasi konten untuk mencegah XSS (DOMPurify di frontend)
- Batasi ukuran & tipe file upload (max 5MB, images only)
- Pelaporan, blokir, dan moderasi konten
- Pisahkan data identitas pribadi dari profil publik
- Backup database & file secara berkala
- Jangan simpan kredensial pembayaran sensitif
- QRIS tahap pertama: simulasi only — jangan buka item berbayar tanpa verifikasi gateway nyata

---

## 8. Roadmap Pembangunan

### Tahap 1 — Foundation
Docker, PostgreSQL, Redis, NestJS, Next.js, authentication, sistem penyimpanan.

### Tahap 2 — Social Core
Feed, kategori kegagalan, postingan, komentar, reaksi, profil anonim, level Mental Baja.

### Tahap 3 — Avatar & Viral Engine
Avatar Builder, sertifikat PNG, preview interaktif, fitur berbagi ke medsos.

### Tahap 4 — Monetization
Store, inventory, item premium, simulasi QRIS, integrasi payment gateway.

### Tahap 5 — Production Hardening
Load testing, backup otomatis, monitoring (Prometheus + Grafana), keamanan audit, moderasi, deployment multi-server.

---

## 9. Strategi Pertumbuhan Infrastruktur

| Sekarang                 | Ketika Berkembang                        |
|--------------------------|------------------------------------------|
| Local PostgreSQL         | Managed PostgreSQL / cluster             |
| Local Redis              | Redis terkelola (Upstash / ElastiCache)  |
| Local filesystem         | S3-compatible object storage             |
| Satu backend             | Backend modular + layanan terpisah       |
| Satu worker              | Worker horizontal scaling                |
| Satu server              | Multi-server deployment + CDN            |

> Gunakan storage adapter sejak awal agar perpindahan dari local filesystem ke object storage tidak mengharuskan perubahan seluruh aplikasi.

---

## 10. Engineering Principles

- **Privacy first** — identitas pengguna dilindungi by design
- **Data ownership & persistence** — data penting tidak pernah hanya di Redis atau localStorage
- **Dockerized infrastructure** — portable dari laptop ke cloud
- **Redis-powered performance** — cache, queue, rate limit
- **Human-first community** — fitur mendukung empati, bukan kompetisi

---

*unlinked+ — Less Flex, More Human.*
