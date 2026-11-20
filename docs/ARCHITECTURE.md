# Blueprint Arsitektur — Creative Partner AI

**Peran:** Principal System Architect & Senior DevOps Engineer
**Konteks:** aplikasi SaaS AI creative (konten, video, affiliate, advertiser,
wallet, automation) yang sudah berjalan di Node.js + Express + Prisma +
PostgreSQL + Redis + Nginx.

**Batasan yang dipegang:** *landing page / frontend tidak diubah sama sekali.*
Seluruh hardening ada di backend, konfigurasi infrastruktur, dan dokumentasi.

**Tujuan non-fungsional:**

| Properti | Target |
|---|---|
| Throughput baca | 5.000+ RPS dengan cache (3 pod) |
| p95 latency API | < 200 ms (cache hit < 20 ms) |
| Ketersediaan | 99,9% (rolling deploy tanpa downtime) |
| Integritas stok/saldo | 0 oversell, 0 saldo minus |
| Pemulihan dependency | degradasi bertingkat, bukan total outage |

---

## 1. Diagram alur arsitektur

```
                                  INTERNET
                                     │
                    ┌────────────────▼─────────────────┐
                    │ Cloudflare (opsional, sangat     │
                    │ disarankan)                      │
                    │ TLS · WAF · DDoS L3/L4 · cache   │
                    └────────────────┬─────────────────┘
                                     │ HTTPS
                    ┌────────────────▼─────────────────┐
                    │ Nginx (edge)                     │
                    │ limit_req 50 r/s · limit_conn 50 │
                    │ resolver DNS → replica backend   │
                    │ keepalive · X-Request-Id         │
                    └───┬───────────┬───────────┬──────┘
                        │           │           │
              ┌─────────▼──┐ ┌──────▼─────┐ ┌───▼────────┐
              │ API pod 1  │ │ API pod 2  │ │ API pod N  │  stateless
              │ Express    │ │ Express    │ │ Express    │  (scale bebas)
              └─┬───┬───┬──┘ └────────────┘ └────────────┘
                │   │   │
      ┌─────────┘   │   └──────────────┐
      │             │                  │
┌─────▼──────┐ ┌────▼─────────┐ ┌──────▼──────────┐
│ Redis      │ │ PostgreSQL   │ │ BullMQ (Redis)  │
│ · cache    │ │ PRIMARY      │ │ queue:          │
│ · rate lim │ │ tulis + baca │ │ flashsale-jobs  │
│ · stok gate│ │ konsisten    │ └──────┬──────────┘
└────────────┘ └────┬─────────┘        │ job
                    │ WAL streaming    │
              ┌─────▼─────────┐  ┌─────▼──────────┐
              │ Read replica  │  │ Worker pods    │
              │ query berat,  │  │ invoice, email │
              │ listing, agg. │  │ retry+backoff  │
              └───────────────┘  └────────────────┘

Observability: setiap pod mengekspos /metrics ──► Prometheus ──► Grafana/Alertmanager
```

### Perjalanan satu request

1. **Cloudflare** menyaring DDoS/WAF sebelum menyentuh infrastruktur.
2. **Nginx** membatasi laju per IP (`limit_req`) dan meneruskan ke pod backend
   mana pun. Karena memakai `resolver`, replica baru hasil auto-scaling langsung
   terpakai tanpa restart Nginx.
3. **Pod backend** (stateless) menjalankan urutan: `requestContext` →
   `httpMetrics` → rate limit global → auth → rate limit endpoint → handler.
4. **Redis** melayani cache dan counter rate limit; untuk stok menjadi gerbang
   cepat. **PostgreSQL** tetap sumber kebenaran.
5. Pekerjaan lambat (invoice, email) dikirim ke **BullMQ**, bukan ditunggu di
   request.
6. **Prometheus** menarik `/metrics` dari semua replica; alert memicu Grafana.

---

## 2. Mengapa komponen ini

| Komponen | Pilihan | Alasan |
|---|---|---|
| Bahasa/framework | **Node.js 20 + Express** (dipertahankan) | Seluruh route, Prisma, dan worker sudah ada. Rewrite ke Fastify/Go berisiko tinggi tanpa manfaat proporsional; dengan cache + pooling, Express sanggup 1.500–3.000 RPS/pod. Jalur upgrade: Fastify (drop-in per router) bila profiling menunjukkan bottleneck framework. |
| Database | **PostgreSQL 15** | Transaksi ACID, constraint, `UPDATE ... WHERE stok >= n` atomik, JSONB, replikasi streaming. Sudah dipakai. |
| Cache & counter | **Redis 7** | Sub-milidetik, operasi atomik via Lua, TTL, struktur sorted-set/hash. Satu Redis melayani cache, rate limit, dan gerbang stok — mengurangi komponen baru. |
| Antrean | **BullMQ (Redis)** | Sudah ada di stack (`ai-jobs`), mendukung retry, backoff eksponensial, jobId dedupe, concurrency. Tidak perlu Kafka untuk volume ini. |
| Load balancer | **Nginx** | Ringan, `limit_req`/`limit_conn` bawaan, proxy keepalive, DNS dinamis. Cloudflare di depannya untuk DDoS. |
| Metrik | **Prometheus + Grafana** | Standar de-facto, pull-based, histogram untuk p95, alerting ringkas. |
| Container | **Docker Compose** → **Kubernetes/HPA** | Compose cukup untuk 1 host; manifest siap untuk auto-scaling horizontal. |

> Jika suatu saat butuh >20.000 RPS atau isolasi Bahasa: pecah domain panas
> (checkout/stok) ke Go/Rust, tetap di belakang Nginx dan DB yang sama.

---

## 3. Caching & pengurangan beban database

Implementasi: `backend/src/lib/cache.ts`, dipakai `modules/flashsale/service.ts`.

### Pola Cache-Aside

```
GET /items
   │
   ├─► Redis GET fs:items:v1
   │      ├─ FRESH  ──────────────────────► 200 (p95 < 20 ms)
   │      ├─ STALE  ──► 200 data lama ──┐
   │      │                             └─► refresh di background
   │      └─ MISS
   │             │
   │        SET lock NX (hanya 1 pod menembak DB)
   │             │
   │        SELECT ... FROM read replica
   │             │
   │        SET key + TTL + jitter
   │             ▼
   └──────── 200 data baru
```

### Empat mekanisme anti–cache stampede

1. **Single-flight per proses** — `Map<key, Promise>`; 1.000 request paralel di
   satu pod hanya menjalankan loader sekali.
2. **Distributed lock** — `SET lock:<key> <token> NX PX 3000`. Antar pod hanya
   satu yang mengisi cache; pod lain menunggu hasilnya (maks. 400 ms) lalu
   memakai nilai stale bila ada.
3. **Stale-While-Revalidate** — data disajikan sampai `hardUntil` sementara satu
   proses memperbarui. Pengguna tidak pernah menunggu refresh.
4. **TTL jitter ±10%** — mencegah semua key kedaluwarsa serempak.

Tambahan: **negative caching** (`negativeTtlSeconds`) mencegah cache penetration
untuk ID yang tidak ada, dan semua operasi Redis **fail-open** (Redis mati →
loader tetap jalan, aplikasi tidak ikut mati).

### Pola pakai

```ts
const items = await cached(
  'fs:items:v1',
  { ttlSeconds: 10, staleSeconds: 20, negativeTtlSeconds: 5 },
  () => prismaReplica.flashSaleItem.findMany({ where: { active: true } }),
);
```

### Apa yang layak di-cache

| Data | TTL | Catatan |
|---|---|---|
| Listing katalog/plan | 30–120 s | stale 2× TTL, aman |
| Profil user & permission | 60 s | invalidasi saat role berubah |
| Dashboard aggregate | 15–30 s | hitung ulang di background |
| Stok | **jangan** di-cache sebagai kebenaran | hanya gerbang Redis + validasi DB |
| Saldo wallet | **jangan** di-cache | selalu primary, transaksional |

Invalidasi eksplisit setelah write: `invalidate('fs:items:v1')`.

---

## 4. Antrean & pemrosesan asinkron

Implementasi: `modules/flashsale/queue.ts` (producer) dan
`modules/flashsale/invoiceWorker.ts` (consumer).

```
POST /reserve ──► COMMIT order ──► queue.add('order.confirmed', jobId=order:<id>)
                                          │
                                          ▼
                          Worker (concurrency 10)
                          ├─ tulis AuditLog id deterministik
                          ├─ buat Notification id deterministik
                          └─ (integrasi email/PDF di sini)
```

Prinsip yang dipakai:

- **Response tidak menunggu** pekerjaan lambat. Checkout cukup commit + enqueue.
- **Retry eksponensial**: 5 percobaan, delay 1 s → 2 s → 4 s → 8 s.
- **Deduplikasi**: `jobId` deterministik + ID efek samping deterministik
  (`notif:invoice:<orderId>`) ⇒ aman terhadap at-least-once delivery.
- **DLQ praktis**: job gagal disimpan 24 jam (`removeOnFail`), bisa diinspeksi
  dan di-retry dari Bull Board.
- **Backpressure**: `concurrency` dibatasi agar provider email/DB tidak tumbang.

**Outbox pattern (implementasi).** Tabel `Outbox` ditulis dalam transaksi yang
sama dengan commit order; setelah commit, enqueue dikirim lewat relay
(`relayPendingOutbox`). Jika enqueue gagal, baris tetap `status = 'pending'`
dan relay berikutnya akan mencoba mengirimnya kembali. `jobId` `order:<id>`
memastikan idempotensi. Untuk volume saat ini, ini sudah cukup kuat untuk
invoice/email.

**Kapan pindah ke Kafka/RabbitMQ?** Jika butuh replay historis, ordering per
partisi, fan-out ke banyak konsumen, atau >50k pesan/detik. Untuk invoice/email,
BullMQ lebih sederhana dan sudah ada.

---

## 5. Rate limiting & keamanan

Implementasi: `backend/src/lib/rateLimit.ts`, dipasang di `index.ts` dan
`modules/flashsale/routes.ts`.

### Dua algoritma, dua kebutuhan

| Algoritma | Karakter | Dipakai untuk |
|---|---|---|
| **Sliding Window Log** (ZSET + Lua) | presisi per jendela, memori O(limit) | auth (30/menit), checkout (10/10 s) |
| **Token Bucket** (Hash + Lua) | O(1) memori, burst terkontrol | limiter global per IP berskala besar |

Keduanya atomik: skrip Lua menjalankan *cek + catat* dalam satu operasi Redis,
sehingga 100 pod tidak bisa "saling menipu" kuota.

```lua
-- inti sliding window
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count < limit then
  redis.call('ZADD', key, now, member)
  return {1, limit - count - 1, 0}
end
-- ... hitung retry_after dari anggota tertua
```

Respons memakai header `RateLimit-Limit`, `RateLimit-Remaining`,
`RateLimit-Reset`, dan `Retry-After` saat 429.

**Fail-open vs fail-closed.** Limiter ini `failOpen: true`: Redis bermasalah tidak
boleh mematikan aplikasi. Integritas tetap dijaga DB (conditional update +
constraint). Untuk endpoint yang benar-benar sensitif (mis. OTP), set
`failOpen: false` agar 503 — pilih sesuai risiko.

### Lapisan keamanan lain

- **Nginx**: `limit_req` 50 r/s burst 100, `limit_conn` 50 per IP — menahan
  flood sebelum Node.js.
- **Cloudflare**: WAF, bot fight, DDoS L3/L4/L7, rate limit edge.
- **Helmet** + `x-powered-by` dimatikan.
- **Validasi input** dengan Zod di setiap endpoint baru.
- **SQL injection**: Prisma memakai prepared statement/parameter binding.
- **JWT**: `JWT_SECRET` wajib dirotasi dan disimpan di secret manager, bukan
  `.env` yang ter-commit.
- **Body limit** 10 MB; endpoint upload sebaiknya dipisah ke object storage.
- **`trust proxy = 1`**: jangan dinaikkan tanpa proxy tepercaya, karena
  `X-Forwarded-For` bisa dipalsukan dan rate limit per-IP bisa dilewati.
- **CORS** saat ini permisif (`cors()`); di production batasi ke domain frontend:
  `cors({ origin: process.env.WEB_ORIGIN!.split(','), credentials: true })`.
- **Container**: jalankan sebagai non-root, image di-scan (Trivy), dependency
  diaudit (`npm audit --omit=dev`).

---

## 6. Optimasi database & race condition

### 6.1 Connection pooling

- Prisma default: `num_cpus * 2 + 1`. **Set eksplisit** agar tidak meledak saat
  auto-scaling:

```
DATABASE_URL=postgresql://.../creative_partner?schema=public&connection_limit=10&pool_timeout=10
```

- Anggaran koneksi: `replicas × connection_limit + workers + admin < max_connections`.
  Contoh: `3 × 10 + 2 × 5 + 20 = 60` dari `max_connections=200` — aman.
- Untuk >20 replica, tambahkan **PgBouncer** mode `transaction`
  (`?pgbouncer=true`). Catatan: advisory lock/`SET` sesi tidak berlaku lintas
  transaksi.
- Query lambat > 500 ms dicatat (`log_min_duration_statement=500`) dan ditinjau
  dengan `EXPLAIN (ANALYZE, BUFFERS)`.

### 6.2 Indexing

Index yang sudah ada di schema dipertahankan. Yang ditambahkan untuk modul baru:

```sql
CREATE UNIQUE INDEX "FlashSaleOrder_idempotencyKey_key"
  ON "FlashSaleOrder"("idempotencyKey");           -- idempotensi O(log n)
CREATE INDEX "FlashSaleOrder_userId_createdAt_idx"
  ON "FlashSaleOrder"("userId", "createdAt");      -- riwayat user
CREATE INDEX "FlashSaleOrder_itemId_status_idx"
  ON "FlashSaleOrder"("itemId", "status");         -- rekap per item
```

Rekomendasi lanjutan (ukur dulu dengan `pg_stat_statements`):

```sql
-- payout yang menunggu verifikasi (hot, sangat selektif)
CREATE INDEX "Payout_pending_idx" ON "Payout"("requestedAt")
  WHERE "status" = 'pending';

-- audit log per user (belum ada index)
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt" DESC);
```

Prinsip: index **komposit** mengikuti urutan `WHERE` lalu `ORDER BY`; hindari
index berlebih karena memperlambat write; partial index untuk status minoritas.

### 6.3 Race condition: stok tidak boleh minus

Tiga lapis pertahanan (implementasi: `modules/flashsale/service.ts`):

```
Lapis 1  Redis Lua        DECRBY hanya jika stok >= qty
         (gerbang cepat)  → menolak 90%+ request habis tanpa menyentuh DB

Lapis 2  PostgreSQL       UPDATE ... SET availableStock = availableStock - $1
         (kebenaran)      WHERE sku = $2 AND availableStock >= $1
                          → baris dikunci selama update; 0 row = kalah balapan

Lapis 3  Constraint       CHECK (availableStock >= 0)
         (jaring aman)    → mustahil minus walau ada bug aplikasi
```

Kuncinya: **jangan pernah** `SELECT stok` lalu `UPDATE` dalam dua langkah —
itu pola baca-ubah-tulis yang race. Lakukan pengurangan **dalam satu statement
bersyarat**.

Perbandingan strategi:

| Strategi | Kapan dipakai | Trade-off |
|---|---|---|
| **Atomic conditional UPDATE** (dipakai) | counter tunggal (stok, saldo, kuota) | 1 round-trip, tanpa retry; update menunggu row lock |
| **Pessimistic** `SELECT ... FOR UPDATE` | keputusan butuh beberapa baris/validasi kompleks | lock lebih lama, risiko deadlock |
| **Optimistic** (`version`) | kontensi rendah, update jarang bentrok | perlu loop retry |
| **Redis atomic** (Lua) | gerbang burst, bukan sumber kebenaran | bisa drift; wajib validasi DB |

**Idempotensi.** `Idempotency-Key` unik di DB ⇒ retry jaringan tidak
menghasilkan order ganda. Jika dua request paralel memakai key sama, satu
menang (`P2002`), yang lain mengembalikan order yang sama; stok Redis
dikompensasi.

**Kompensasi.** Jika transaksi DB gagal setelah Redis `DECRBY`, stok
dikembalikan via Lua `INCRBY` (hanya jika key masih ada, agar tidak
"menghidupkan" stok yang sudah kedaluwarsa). TTL 1 jam membatasi drift.

**Contoh nyata yang sudah ada:** `routes/wallet.ts` memakai pola yang sama —
`updateMany({ where: { balance: { gte: amount } }, data: { decrement } })`
sebelum membuat payout. Itu sudah benar; jangan diubah menjadi baca-lalu-tulis.

**Kuota AI (`Subscription.tokenQuota`)** saat ini dihitung dari agregasi
`TokenUsage`, sehingga dua job paralel bisa melewati kuota. Perbaikan yang
disarankan: tambah kolom `tokensUsed` di `Subscription` dan lakukan
`UPDATE ... SET tokensUsed = tokensUsed + $1 WHERE userId = $2 AND tokensUsed + $1 <= tokenQuota`.
Alternatif cepat: `pg_advisory_xact_lock(hashtext(userId))` di dalam transaksi.

---

## 7. Skalabilitas & infrastruktur

### Checklist stateless (sudah dipenuhi)

- Tidak ada state di memori proses yang harus dibagi (cache hanya akselerasi,
  sumber kebenaran di DB).
- Tidak ada file lokal untuk data penting; `video-storage` adalah volume bersama
  — untuk multi-host, pindahkan ke S3/MinIO.
- Sesi memakai JWT, bukan sticky session.
- Graceful shutdown: `SIGTERM` → stop terima koneksi → tunggu 25 s → tutup
  queue/Prisma/Redis. `stop_grace_period: 30s`.
- `/health` = liveness (tanpa dependency), `/readyz` = readiness (DB + Redis).
  LB hanya mengirim traffic ke pod yang ready; pod tidak dibunuh hanya karena
  DB sesaat lambat.

### Docker & auto-scaling

```bash
# 3 replica backend + 2 worker + observability
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d --build

# migrasi dijalankan sekali, bukan dari setiap replica
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml \
  run --rm backend npx prisma migrate deploy

# scale dinamis
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml \
  up -d --scale backend=5 --scale worker=4
```

Nginx memakai `resolver 127.0.0.11 valid=10s` + `proxy_pass` variabel, sehingga
replica baru terdeteksi tanpa reload. Trade-off: koneksi upstream tidak
di-pool antar request (biaya ~1 ms di jaringan Docker). Untuk pola keepalive
penuh, gunakan upstream statis dan reload Nginx saat scale.

**Kubernetes (ringkas):**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: backend }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: backend }
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 65 } }
```

Untuk antrean, pakai **KEDA** dengan trigger panjang antrean BullMQ, sehingga
worker ikut scale saat backlog naik.

### High availability

| Lapisan | Strategi |
|---|---|
| Edge | Cloudflare + 2 IP/anycast |
| Nginx | >1 instance di belakang LB cloud, atau keepalived VIP |
| API | ≥3 replica, anti-affinity, rolling update `maxUnavailable: 0` |
| PostgreSQL | Managed HA / Patroni + streaming replica; backup PITR harian |
| Redis | Sentinel/Cluster; AOF `everysec`; jangan jadikan satu-satunya sumber kebenaran |
| Worker | ≥2 replica; job idempotent |

**Read replica** diaktifkan lewat `DATABASE_REPLICA_URL`. Query listing/agregat
memakai `prismaReplica`; data yang baru ditulis (saldo, stok, status order)
tetap ke primary untuk menghindari lag.

---

## 8. Observability & graceful degradation

### Metrik (sudah diekspos di `/metrics`)

| Metrik | Fungsi |
|---|---|
| `http_request_duration_seconds` (histogram) | p50/p95/p99 per route |
| `http_requests_total{status}` | error rate |
| `cache_events_total{result}` | hit ratio, stampede, error |
| `rate_limit_decisions_total{decision}` | bot/DDoS, limit terlalu ketat |
| `circuit_breaker_state{name}` | dependency sedang down |
| `flashsale_orders_total{result}` | accepted / sold_out |
| `queue_jobs_total{result}` | kesehatan worker |
| `nodejs_*`, `process_*` | CPU, memory, event loop, GC |

Alert contoh ada di `deploy/prometheus/alerts.yml`: `BackendDown`,
`HighErrorRate` (>2% 5xx), `HighLatencyP95` (>500 ms), `CircuitBreakerOpen`,
`CacheHitRatioLow`, `RateLimitBlockSpike`, `QueueJobFailures`.

### Circuit breaker

Implementasi: `backend/src/lib/circuitBreaker.ts`.

```
closed ──(5 gagal beruntun)──► open ──(10 s)──► half_open ──(2 sukses)──► closed
                                                            └─(1 gagal)──► open
```

Dipakai untuk dependency eksternal (provider AI, email, payment). Saat `open`,
request langsung memakai fallback (cache stale / antrean) tanpa menambah beban
layanan yang sedang down — mencegah **cascading failure**.

### Matriks degradasi

| Gangguan | Perilaku sistem |
|---|---|
| Redis down | Cache & rate limit fail-open; checkout tetap aman via DB + constraint. Latensi naik, fitur tetap hidup. |
| Read replica down | `DATABASE_REPLICA_URL` dikosongkan → query kembali ke primary (butuh restart/deploy kecil). |
| Provider AI/email down | Circuit breaker membuka; job masuk retry/backlog; user tetap bisa menjelajah & checkout. |
| PostgreSQL down | `/readyz` 503 → LB mengeluarkan pod; endpoint baca yang masih ter-cache tetap merespons sampai TTL habis. |
| Satu pod mati | Nginx/DNS mengarahkan ke pod lain; rolling update tanpa downtime. |
| Traffic flash sale 100× | Nginx menolak kelebihan; Redis gate menolak cepat; DB hanya menerima request yang lolos. |

### Logging & tracing

- Setiap response membawa `X-Request-Id`; Nginx mencatat `rid=` sehingga log
  edge dan aplikasi bisa dikorelasikan.
- Langkah berikutnya: OpenTelemetry → Tempo/Jaeger untuk trace lintas
  API → Redis → DB → worker.

---

## 9. Kapasitas (contoh perhitungan)

Asumsi: 1 pod = 1 vCPU / 768 MB, cache hit 90%, rasio baca:tulis 95:5.

- 3 pod × ~2.000 RPS ringan ≈ **6.000 RPS**; 90% dilayani Redis.
- DB hanya menerima ~600 RPS (10% miss + semua write) — nyaman untuk primary
  dengan pool 10/pod.
- Redis 1 node menangani 50–100k ops/s; rate limit + cache masih jauh di bawah.
- Flash sale 100 unit: Redis menolak ribuan request dalam <1 ms; DB hanya
  memproses ~100 transaksi pemenang.

Bottleneck pertama biasanya **koneksi DB** dan **query tanpa index**, bukan CPU
Node.js. Karena itu pooling + index + cache diukur sebelum menambah replica.

---

## 10. Deployment & verifikasi

```bash
# 1. Siapkan env (JANGAN commit secret)
cp .env.example .env

# 2. Build & jalankan
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d --build

# 3. Migrasi (termasuk tabel flash sale + seed)
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml \
  run --rm backend npx prisma migrate deploy

# 4. Verifikasi
curl -s localhost/health
curl -s localhost/readyz
curl -s localhost/api/v1/flashsale/items
curl -s localhost:9090/-/ready
```

Uji oversell:

```bash
k6 run -e BASE_URL=http://localhost -e TOKEN=<jwt> loadtest/flashsale.js
# lalu cek: SELECT "availableStock" FROM "FlashSaleItem" WHERE sku='credits-2000';
#harus >= 0, dan COUNT(order) <= totalStock
```

### Rollback

- Image diberi tag versi; `docker compose up -d` dengan tag sebelumnya.
- Migrasi bersifat **aditif** (tabel baru) sehingga aman di-rollback aplikasi
  tanpa drop data.
- Jika perlu drop: `DROP TABLE "FlashSaleOrder", "FlashSaleItem";` (hanya jika
  modul demo tidak dipakai).

---

## 11. Batasan & langkah berikutnya

1. **CORS masih permisif** — batasi ke origin frontend sebelum go-live.
2. **Rate limiter per-IP** bergantung pada `trust proxy` yang benar.
3. **Outbox pattern** untuk menjamin enqueue tidak pernah hilang.
4. **Kuota AI** belum atomik (lihat 6.3) — perbaiki sebelum trafik tinggi.
5. **PgBouncer** jika replica > 20.
6. **Object storage** (S3/MinIO) untuk video agar benar-benar stateless
   multi-host.
7. **Tracing** OpenTelemetry untuk analisis lintas service.
8. **Uji beban berkala** (k6) di staging dengan data mirip production.

---

## 12. Peta file implementasi

```
backend/src/
  lib/redis.ts                 koneksi Redis terkelola
  lib/cache.ts                 cache-aside + anti-stampede + SWR
  lib/rateLimit.ts             sliding window & token bucket (Lua)
  lib/circuitBreaker.ts        circuit breaker + metrik
  lib/metrics.ts               registry Prometheus + middleware HTTP
  lib/prismaReplica.ts         routing baca ke read replica
  middleware/requestContext.ts request id untuk korelasi log
  modules/flashsale/
    routes.ts                  GET /items, POST /reserve, GET /orders
    service.ts                 reservasi atomik + idempotensi + kompensasi
    queue.ts                   producer BullMQ
    invoiceWorker.ts           consumer idempotent (invoice/email)
  index.ts                     wiring, limiter, readiness, graceful shutdown
prisma/
  schema.prisma                + FlashSaleItem, FlashSaleOrder
  migrations/20261120000000_add_flashsale/migration.sql
deploy/
  docker-compose.prod.yml      replica, resource limit, observability
  prometheus/{prometheus,alerts}.yml
  grafana/provisioning/datasources/prometheus.yml
nginx.conf                     edge rate limit + DNS dinamis
loadtest/flashsale.js          uji oversell
```
