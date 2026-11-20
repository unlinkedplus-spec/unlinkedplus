# Blueprint Arsitektur — Unlinked Plus (High Concurrency, HA, Aman)

Dokumen ini melengkapi `TECHNICAL-BLUEPRINT.md` dengan fokus **ketahanan
production**: lonjakan traffic, keamanan dasar, ketersediaan tinggi, dan
degradasi bertingkat.

**Batasan:** landing page statis (`index.html`, `app.html`, `js/`, `styles/`,
`images/`) **tidak diubah**. Seluruh perubahan berada di `apps/api`,
konfigurasi Docker/Nginx, dan dokumen ini.

---

## 1. Diagram alur arsitektur

```
                              INTERNET
                                 │
                 ┌───────────────▼────────────────┐
                 │ Cloudflare (opsional)          │
                 │ TLS · WAF · DDoS L3/L4         │
                 └───────────────┬────────────────┘
                                 │
                 ┌───────────────▼────────────────┐
                 │ Nginx host (port 80)           │
                 │ · serve landing statis         │  ← TIDAK DIUBAH
                 │ · /api → Nginx aplikasi        │
                 │ · limit_req per IP             │
                 └───────────────┬────────────────┘
                                 │
                 ┌───────────────▼────────────────┐
                 │ Nginx aplikasi (compose)       │
                 │ resolver DNS dinamis           │
                 │ limit_req · limit_conn         │
                 └───┬───────────┬────────────┬───┘
                     │           │            │
            ┌────────▼──┐  ┌─────▼─────┐  ┌───▼────────┐
            │ backend 1 │  │ backend 2 │  │ backend N  │  stateless
            │ NestJS    │  │ NestJS    │  │ NestJS     │  (scale bebas)
            └─┬──┬──┬───┘  └───────────┘  └────────────┘
              │  │  │
     ┌────────┘  │  └───────────────┐
     │           │                  │
┌────▼──────┐ ┌──▼───────────┐ ┌────▼──────────────┐
│ Redis 7   │ │ PostgreSQL 17│ │ BullMQ (Redis)    │
│ · cache   │ │ PRIMARY      │ │ queue:            │
│ · rate lim│ │ tulis + baca │ │ certificates      │
│ · lock    │ │ konsisten    │ └────┬──────────────┘
└───────────┘ └──┬───────────┘      │ job
                 │ WAL              │
           ┌─────▼─────────┐  ┌─────▼──────────────┐
           │ Read replica  │  │ worker container   │
           │ (opsional)    │  │ render sertifikat  │
           └───────────────┘  └────────────────────┘

Setiap instance backend mengekspos /metrics ──► Prometheus ──► Grafana/Alert
```

### Perjalanan satu request

1. **Cloudflare** (opsional) menyaring DDoS/WAF sebelum ke server.
2. **Nginx host** melayani landing statis dan meneruskan `/api` ke Nginx
   aplikasi. Landing tetap file statis — tidak ada perubahan perilaku.
3. **Nginx aplikasi** membatasi laju per IP, lalu memilih instance backend.
   Dengan `resolver 127.0.0.11 valid=10s`, instance baru hasil scaling langsung
   terpakai tanpa reload.
4. **NestJS** menjalankan: rate limit (Redis Lua) → JWT guard → controller →
   service.
5. **CacheService** mencoba Redis. Cache miss memakai distributed lock agar
   hanya satu instance menembak PostgreSQL.
6. **PostgreSQL** adalah sumber kebenaran. Operasi yang rawan balapan memakai
   `SELECT ... FOR UPDATE` atau `UPDATE ... WHERE` bersyarat.
7. Pekerjaan lambat (render sertifikat) dikirim ke **BullMQ** dan diproses
   worker, bukan ditahan di request HTTP.

---

## 2. Mengapa komponen ini

| Komponen | Pilihan | Alasan |
|---|---|---|
| Framework | **NestJS 12 + Express 5** (dipertahankan) | Sudah menjadi fondasi aplikasi; modul, guard, DI, dan BullMQ terintegrasi. Menulis ulang ke Go/Fastify berisiko tinggi tanpa bottleneck terukur. NestJS sanggup ribuan RPS bila cache & pooling benar. |
| Database | **PostgreSQL 17** | ACID, constraint, row lock, `FOR UPDATE`, replikasi streaming. Sudah dipakai dan sesuai untuk transaksi saldo/inventori. |
| Cache & counter | **Redis 7** | Sub-milidetik, Lua atomik untuk rate limit dan lock, TTL. Satu Redis melayani cache, limiter, dan antrean. |
| Antrean | **BullMQ 5 (Redis)** | Sudah ada untuk sertifikat; mendukung retry, backoff, dedupe `jobId`, dan worker terpisah. Tidak perlu Kafka pada skala ini. |
| Load balancer | **Nginx** | Ringan, `limit_req`/`limit_conn`, proxy keepalive, DNS dinamis. Cloudflare di depan untuk DDoS. |
| Observability | **prom-client + Prometheus/Grafana** | Standar de-facto; histogram untuk p95, counter untuk hit ratio & error. |

> Jika kelak butuh >20k RPS atau isolasi bahasa, pecah domain terpanas
> (feed/checkout) ke service Go/Rust di belakang Nginx yang sama.

---

## 3. Caching & pengurangan beban database

Implementasi: `apps/api/src/common/cache/cache.service.ts`.

### Pola Cache-Aside

```
GET /api/posts?page=1
   │
   ├─► Redis GET posts:feed:<versi>:1:20
   │      ├─ FRESH  ─────────────────────► 200 (p95 < 20 ms)
   │      ├─ STALE  ──► 200 data lama ──┐
   │      │                             └─► refresh di background
   │      └─ MISS
   │             │
   │        SET cache:lock:<key> NX PX 3000   (1 instance saja)
   │             │
   │        SELECT ... (PostgreSQL)
   │             │
   │        SET key + TTL + jitter
   │             ▼
   └──────── 200 data baru
```

### Empat mekanisme anti–cache stampede

1. **Single-flight per proses** (`Map<key, Promise>`) — request paralel di satu
   instance hanya menjalankan loader sekali.
2. **Distributed lock** — `SET NX PX` + release via Lua compare-and-delete.
   Instance lain menunggu maksimal 400 ms, lalu memakai data stale.
3. **Stale-While-Revalidate** — data lama tetap disajikan sampai `hardUntil`,
   sementara satu proses memperbarui cache.
4. **TTL jitter ±10%** — mencegah semua key kedaluwarsa bersamaan.

Tambahan:

- **Version key** (`cache:ver:posts-feed`) — saat ada post baru/dihapus, versi
  dinaikkan. Semua halaman feed otomatis memakai namespace baru tanpa `SCAN`.
- **Negative caching** — hasil `null` disimpan singkat (2 detik) agar query
  kosong tidak menghantam DB berulang.
- **Fail-open** — semua operasi Redis dibungkus circuit breaker; Redis mati
  berarti cache dilewati, bukan aplikasi mati.

### Data apa yang di-cache

| Endpoint | Key | TTL | Invalidasi |
|---|---|---|---|
| `GET /api/posts` | `posts:feed:<ver>:<page>:<limit>` | 5 s (+10 s stale) | bump versi saat create/delete |
| `GET /api/polls/active` | `polls:active:v1` | 3 s (+5 s stale) | hapus saat vote/create |

Jangan cache: saldo, stok, status order, data pribadi yang berubah cepat.
Endpoint tersebut harus selalu membaca primary.

---

## 4. Antrean & pemrosesan asinkron

Implementasi yang sudah ada: `certificates/certificate.queue.ts` +
`worker/certificate.processor.ts`.

```
POST /api/certificates
   │
   ├─ validasi + buat row Certificate (status=pending)
   ├─ queue.add(job, jobId=certificateId)   ← dedupe request paralel
   └─ 202/201 ke klien (tidak menunggu render)

Worker (concurrency 2)
   ├─ lock post + certificate (FOR UPDATE)
   ├─ render SVG → PNG (sharp)
   ├─ tulis file .tmp → rename (atomik)
   └─ update status=ready
```

Prinsip yang dipakai:

- **Retry eksponensial** (3 percobaan) dan `removeOnFail: false` sebagai DLQ
  sederhana untuk inspeksi.
- **Idempotensi**: `jobId` deterministik + status `ready` tidak dirender ulang.
- **Graceful shutdown**: worker menunggu job aktif selesai sebelum Prisma
  ditutup (`SIGTERM` → `processor.close()`).
- **Backpressure**: concurrency dibatasi 2 karena render CPU/disk-heavy.

Untuk kebutuhan berikutnya (email, invoice, notifikasi pembelian), gunakan pola
yang sama: tulis state `pending` di DB dalam transaksi, enqueue setelah commit,
dan buat consumer idempotent. Jika kehilangan job saat Redis mati harus
mustahil, tambahkan **outbox table** dan relay.

---

## 5. Rate limiting & keamanan

Implementasi: `apps/api/src/common/guards/rate-limit.guard.ts`.

### Sliding Window Log (Redis ZSET + Lua)

```
ZREMRANGEBYSCORE  buang anggota di luar jendela 60 s
ZCARD             hitung request dalam jendela
ZADD              catat request bila masih di bawah limit
PEXPIRE           key kedaluwarsa sendiri
```

Keunggulan dibanding fixed window: tidak ada burst ganda di pergantian menit.
Seluruh operasi atomik dalam satu skrip Lua, sehingga 10 instance tidak bisa
saling menipu kuota.

| Bucket | Limit | Perilaku saat Redis down |
|---|---|---|
| `read` (GET) | 180/menit | **fail-open** — situs tetap terbaca |
| `write` (POST/PUT/DELETE) | 30/menit | fail-closed (503) — lindungi DB |
| `auth` (login/register) | 10/menit | fail-closed — cegah brute force |

Respons menyertakan `RateLimit-Limit`, `RateLimit-Remaining`,
`RateLimit-Reset`, dan `Retry-After` saat 429.

### Lapisan keamanan lain yang sudah/baru aktif

- `helmet`, `x-powered-by` dimatikan, body limit **16 KB**.
- Validasi DTO `class-validator` + `whitelist` + `forbidNonWhitelisted`.
- Cek `Origin` untuk request non-GET (CSRF dasar) + CORS terbatas ke
  `FRONTEND_URL`.
- JWT + `bcryptjs`; `JWT_SECRET` divalidasi minimal 48 karakter dan bukan
  placeholder.
- Prisma menggunakan query parameter (aman SQL injection).
- `trust proxy = 1`; jangan dinaikkan tanpa proxy tepercaya.
- `.env` tidak di-commit; gunakan secret manager saat pindah host.
- Nginx: `client_max_body_size 16k`, `server_tokens off`, blokir dotfile.

---

## 6. Optimasi database & race condition

### 6.1 Connection pooling

- Prisma default: `num_cpu * 2 + 1`. Batasi eksplisit lewat URL:

```
DATABASE_URL=postgresql://.../unlinked?schema=public&connection_limit=10&pool_timeout=10
```

- Anggaran: `jumlah_instance_backend × connection_limit + worker < max_connections`.
  Contoh 3 × 10 + 5 = 35 (Postgres default 100).
- Bila instance > 20, tambahkan **PgBouncer** mode `transaction`
  (`?pgbouncer=true`).

### 6.2 Indexing

Index yang sudah ada sudah baik (feed, komentar, poll, transaksi). Yang
ditambahkan di migrasi `20261120120000_hardening_indexes`:

```sql
-- agregasi reaksi per post (reactionCountsByPost)
CREATE INDEX "Reaction_postId_reactionType_idx"
  ON "reactions"("post_id", "reaction_type");

-- pencarian order pending per user+item (StoreService.purchase)
CREATE INDEX "Transaction_userId_itemId_paymentStatus_idx"
  ON "transactions"("user_id", "item_id", "payment_status");
```

Prinsip: index komposit mengikuti `WHERE` lalu `ORDER BY`; partial index untuk
status minoritas (mis. payout pending); hindari index berlebih karena
memperlambat write.

### 6.3 Mencegah race condition (contoh nyata di aplikasi ini)

**A. Pembelian avatar — `StoreService`**

```
BEGIN
  SELECT id FROM users WHERE id=$user FOR UPDATE   ← serialisasi per pembeli
  cek item & kepemilikan
  pakai order pending yang sama (anti duplikat)
COMMIT
```

Konfirmasi pembelian juga mengunci baris transaksi:
`SELECT ... FOR UPDATE`, lalu `userInventory.upsert` dengan primary key
komposit `(userId, itemId)` sebagai jaring terakhir. Ini **pessimistic locking**
yang tepat karena keputusan melibatkan beberapa baris.

**B. Reaksi & komentar — `lockPost`**

Semua penulisan sosial mengunci baris post lebih dulu (`FOR UPDATE`) dengan
urutan lock yang konsisten, mencegah deadlock dan update XP yang hilang.

**C. Voting — `PollVote`**

`upsert` pada `@@unique([pollId, userId])` membuat satu user hanya punya satu
suara; perhitungan hasil memakai agregasi `_count` di dalam transaksi yang sama.

**Perbandingan strategi**

| Strategi | Dipakai untuk | Trade-off |
|---|---|---|
| **Pessimistic** `FOR UPDATE` | pembelian, reaksi, sertifikat | benar untuk multi-baris; lock lebih lama |
| **Atomic conditional UPDATE** | counter/stok (`WHERE saldo >= n`) | 1 round-trip; update menunggu row lock |
| **Optimistic** (`version`) | update jarang bentrok | perlu retry loop |
| **Redis Lua** | rate limit, cache lock | cepat; bukan sumber kebenaran |

Aturan emas: **jangan** `SELECT` lalu `UPDATE` dalam dua langkah untuk nilai
yang diperebutkan. Lakukan pengurangan/pengecekan dalam satu statement
bersyarat atau di dalam lock yang sama.

---

## 7. Skalabilitas & infrastruktur

### Checklist stateless

- Sesi memakai JWT, bukan sticky session.
- Cache hanya akselerasi; sumber kebenaran di PostgreSQL.
- **Catatan:** sertifikat disimpan di volume `app_storage`. Untuk multi-host,
  pindahkan ke S3/MinIO agar benar-benar stateless.
- `SIGTERM` → Nest shutdown hooks → worker drain → Prisma/Redis ditutup.
- `/health` memeriksa DB, Redis, dan storage (dipakai healthcheck container).

### Menjalankan lebih dari satu instance

```bash
# 1 instance (default, sesuai RAM host saat ini)
docker compose up -d

# 3 instance backend + 2 worker
API_REPLICAS=3 WORKER_REPLICAS=2 \
  docker compose -f docker-compose.yml -f docker-compose.hardening.yml up -d
```

Overlay `docker-compose.hardening.yml` menambahkan:

- `deploy.replicas` + resource limit,
- `stop_grace_period` (backend 30 s, worker 60 s),
- rotasi log JSON (maks. 10 MB × 3 file),
- `init: true` sudah ada di compose dasar.

Nginx aplikasi memakai resolver Docker + `proxy_pass` variabel, sehingga
instance baru terdeteksi tanpa reload. Untuk Kubernetes, gunakan HPA CPU 65%
dan KEDA berbasis panjang antrean BullMQ untuk worker.

> **Peringatan kapasitas:** host saat ini memiliki RAM 1,6 GB. Total `mem_limit`
> di compose dasar sudah mendekati/melebihi kapasitas tersebut. Jalankan
> `API_REPLICAS=1` di host ini, atau tambah RAM sebelum scale-out. Swap 2 GB
> membantu tetapi bukan pengganti RAM.

### High availability

| Lapisan | Strategi |
|---|---|
| Edge | Cloudflare + TLS |
| Nginx | 2 instance / VIP, atau LB cloud |
| API | ≥3 replica, rolling update `maxUnavailable: 0` |
| PostgreSQL | backup PITR harian; replica + failover (Patroni/managed) |
| Redis | Sentinel/Cluster; AOF `everysec` |
| Worker | ≥2 replica; job idempotent |

Read replica: tambahkan `DATABASE_REPLICA_URL` dan arahkan query listing/agregat
ke client read-only. Data yang baru ditulis (saldo, stok, status order) tetap ke
primary untuk menghindari lag.

---

## 8. Observability & graceful degradation

### Metrik (`GET /metrics`, internal)

| Metrik | Fungsi |
|---|---|
| `http_request_duration_seconds` | p50/p95/p99 per route |
| `http_requests_total{status}` | error rate |
| `cache_events_total{result}` | hit ratio, stampede, lock wait |
| `rate_limit_decisions_total{bucket,decision}` | bot/DDoS, limit terlalu ketat |
| `circuit_breaker_state{name}` | Redis sedang bermasalah |
| `queue_jobs_total{queue,result}` | kesehatan worker |
| `process_*`, `nodejs_*` | CPU, memory, event loop, GC |

Contoh alert:

- `up{job="backend"} == 0` selama 1 menit → **critical**
- rasio 5xx > 2% selama 5 menit → **critical**
- p95 > 500 ms selama 10 menit → **warning**
- `circuit_breaker_state == 2` → **warning**
- cache hit ratio < 50% → **warning**
- rate limit blocked > 20/s → **warning** (bot atau limit terlalu ketat)
- job gagal > 1/5 menit → **warning**

### Circuit breaker

`apps/api/src/common/resilience/circuit-breaker.ts`:

```
closed ──(5 gagal)──► open ──(10 s)──► half_open ──(2 sukses)──► closed
                                              └──(1 gagal)──► open
```

Dipakai `CacheService` untuk semua operasi Redis. Saat terbuka, request langsung
melewati cache dan memakai database — tidak menunggu timeout berulang.

### Matriks degradasi

| Gangguan | Perilaku |
|---|---|
| Redis down | Cache dilewati; rate limit read fail-open, write/auth 503; aplikasi tetap hidup. |
| PostgreSQL down | `/health` 503 → container dianggap tidak sehat; response cache masih mungkin sampai TTL habis. |
| Worker mati | Request tetap dibuat; sertifikat `pending` diproses ulang saat worker hidup (jobId idempotent). |
| Satu instance backend mati | Nginx/DNS mengarahkan ke instance lain. |
| Traffic 10× | Nginx menolak kelebihan; cache menyerap mayoritas read; DB hanya menerima miss/write. |

### Logging

- Format log Nest sudah menyertakan konteks; tambahkan `requestId` bila butuh
  korelasi lintas service (langkah berikutnya: OpenTelemetry).
- Jangan log isi confession/pesan pribadi; gunakan ID.

---

## 9. Kapasitas (perkiraan)

- Host 2 vCPU / 1,6 GB: **1 instance backend** (NestJS ~150–250 MB) + worker
  (~100–200 MB) + Postgres (256 MB) + Redis (128 MB).
- Cache hit 90% pada feed → DB hanya menerima ~10% read + seluruh write.
- Redis 1 node: 50–100k ops/s; rate limit + cache jauh di bawah itu.
- Bottleneck pertama biasanya koneksi DB dan query tanpa index — bukan CPU.

---

## 10. Runbook deploy & pemulihan

### 10.1 Blocker saat ini: `migrate` gagal `P3005`

Gejala:

```
Error: P3005
The database schema is not empty.
```

Artinya database sudah berisi tabel (kemungkinan dibuat dengan `prisma db push`)
tetapi `_prisma_migrations` kosong. **Jangan** langsung `migrate deploy`.

Prosedur aman:

```bash
# 1. Backup wajib
docker compose exec -T postgres pg_dump -U unlinked unlinked > backup-$(date +%F).sql

# 2. Bandingkan schema DB dengan schema.prisma
docker compose run --rm --entrypoint sh migrate -c \
  "npx prisma migrate diff --from-url \"\$DATABASE_URL\" \
   --to-schema-datamodel prisma/schema.prisma --script"
```

- Jika diff **hanya** berisi dua index baru (dan tidak ada perubahan tabel),
  schema sudah sinkron → baseline semua migrasi lama, lalu deploy:

```bash
for m in 20261119000000_init 20261119000001_add_indexes \
         20261119030000_add_polls 20261119050000_add_polls_cms \
         20261119060000_add_confession_fields; do
  docker compose run --rm --entrypoint sh migrate -c \
    "npx prisma migrate resolve --applied $m"
done
docker compose run --rm migrate
```

- Jika diff berisi perubahan struktur lain, **jangan** baseline. Terapkan diff
  secara manual setelah review, atau buat database baru dan migrasikan data.

### 10.2 Deploy normal

```bash
cd /var/www/unlinked-plus
docker compose build backend worker
docker compose up -d postgres redis
docker compose run --rm migrate
docker compose up -d backend worker frontend nginx
```

Verifikasi:

```bash
curl -fsS localhost:8080/api/health
curl -fsS localhost:8080/api/posts?page=1
curl -fsS localhost:8080/metrics | head   # dari jaringan internal
```

Landing tetap:

```bash
curl -fsS localhost/ | head -5
```

### 10.3 Rollback

- Backup source sebelum patch: `/root/backups/unlinked-plus-*.tgz`.
- Image diberi tag; kembali ke tag sebelumnya dengan `docker compose up -d`.
- Migrasi index bersifat aditif (`CREATE INDEX IF NOT EXISTS`); rollback aplikasi
  tidak perlu drop index.

---

## 11. Peta file perubahan

```
apps/api/src/common/cache/cache.service.ts        cache-aside + anti-stampede
apps/api/src/common/cache/cache.module.ts
apps/api/src/common/metrics/metrics.service.ts    registry Prometheus
apps/api/src/common/metrics/http-metrics.interceptor.ts
apps/api/src/common/metrics/metrics.controller.ts GET /metrics
apps/api/src/common/metrics/metrics.module.ts
apps/api/src/common/resilience/circuit-breaker.ts
apps/api/src/common/guards/rate-limit.guard.ts    sliding window Lua
apps/api/src/posts/posts.service.ts               feed cache + versi
apps/api/src/polls/polls.service.ts               cache polling aktif
apps/api/src/app.module.ts                        wiring modul & interceptor
apps/api/prisma/schema.prisma                     index baru
apps/api/prisma/migrations/20261120120000_hardening_indexes/migration.sql
docker-compose.hardening.yml                      replica, limit, log
docker/nginx/default.conf                         resolver + limit_req
deploy/sync-to-server.ps1                         kirim patch + backup otomatis
docs/ARCHITECTURE.md                              dokumen ini
```

---

## 12. Status verifikasi

| Langkah | Status |
|---|---|
| `npm install` (regenerasi lockfile) | ✅ |
| `npx prisma generate` | ✅ |
| `nest build` (TypeScript) | ✅ exit 0 |
| Sinkron ke server | ⏳ menunggu host `192.168.1.20` hidup |
| `nginx -t` untuk `docker/nginx/default.conf` | ⏳ harus dijalankan di server |
| Migrasi index | ⏳ **setelah** P3005 dibereskan |

**Catatan tooling:** build diverifikasi dengan Node 24.15 karena
`@nestjs/cli@12` mensyaratkan `^22.22.3 || ^24.15.0`. Image runtime tetap
`node:22-bookworm-slim`; yang perlu dipastikan hanyalah versi Node di tahap
*build* image memenuhi `engines`, atau turunkan `@nestjs/cli` ke 11.x bila
ingin tetap di Node 22.14.

**Catatan dependency:** `prom-client@15.1.3` kini ditandai deprecated di npm
(diarahkan ke `@prometheus-io/client`). Tetap dipakai karena versi 15 adalah
lini stabil yang matang; migrasi bisa dilakukan terpisah tanpa mengubah kode
selain import.

`docker/nginx/default.conf` **belum divalidasi** — jalankan
`docker compose exec nginx nginx -t` sebelum reload. Bila konfigurasi lama
memiliki location khusus (mis. penyajian file sertifikat), gabungkan location
tersebut ke file baru; jangan menimpanya buta.
