# Legacy archive

Folder ini berisi kode yang **tidak aktif** dan sengaja diarsipkan pada audit P1 (SEC-01).

## Isi
- `backend/` — aplikasi Express lama (wallet, flashsale, affiliate, video) yang **tidak** dibangun oleh `docker-compose.yml`.
- `prisma/` — schema/migrasi lama (outbox, wallet) yang **bukan** sumber kebenaran database unlinked+.

## Sumber kebenaran yang aktif
- API: `apps/api/` (NestJS modular monolith), schema: `apps/api/prisma/schema.prisma`, migrasi: `apps/api/prisma/migrations/`.
- Web: `apps/web/` (Next.js).
- Infra: `docker-compose.yml`, `docker/host-nginx.conf`.

## Yang sengaja tetap di root (bukan legacy)
- `index.html`, `styles/public-landing.css` — landing statis pendukung/rollback yang masih direferensikan test dan aset Nginx.
- `app.html`, `js/` — demo statis dengan label jujur yang diverifikasi `apps/api/test/fake-success.test.cjs`.
- `images/` — aset maskot/ilustrasi yang masih dipakai.

Jangan menghapus isi folder ini tanpa persetujuan tertulis. Arsip ini dipertahankan untuk jejak audit, bukan untuk dijalankan.
