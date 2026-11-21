'use client';

/** CMS panels mirroring the public landing catalog and its modules. */
import { useCallback, useEffect, useState } from 'react';
import {
  getAdminAds, getAdminCertificates, getAdminContent, getAdminPolls, getAdminStoreItems,
  setAdminCertificateStatus, setAdminPollStatus, updateAdminAds, updateAdminContent,
  updateAdminStoreItem,
} from '../lib/api';
import type { AdminCertificate, AdminContentItem, AdminPoll, AdSettings, AdminStoreItem } from '../lib/types';

type Notify = (message: string) => void;

function Shell({ children, title, note }: { children: React.ReactNode; title: string; note?: string }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="font-display font-black text-lg text-navy mb-1">{title}</h2>
      {note && <p className="text-xs text-gray-400 mb-4">{note}</p>}
      {children}
    </section>
  );
}

function useLoad<T>(loader: () => Promise<T>, notify: Notify) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try { setData(await loader()); }
    catch (e) { notify(e instanceof Error ? e.message : 'Gagal memuat data'); }
    finally { setLoading(false); }
  }, [loader, notify]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, loading, reload, setData };
}

export function ContentPanel({ notify }: { notify: Notify }) {
  const { data, loading, reload } = useLoad(getAdminContent, notify);
  const [editing, setEditing] = useState<Record<string, {
    title?: string; description?: string; imagePath?: string; status?: string;
  }>>({});

  async function save(item: AdminContentItem) {
    const draft = editing[item.slug] ?? {};
    try {
      await updateAdminContent(item.slug, {
        title: draft.title ?? item.title,
        body: draft.description ?? item.description ?? '',
        imagePath: draft.imagePath ?? item.imageUrl ?? '',
        status: draft.status ?? item.status,
      });
      notify(`Konten ${item.slug} disimpan. Halaman fitur langsung memakai copy ini.`);
      setEditing((prev) => ({ ...prev, [item.slug]: {} }));
      await reload();
    } catch (e) { notify(e instanceof Error ? e.message : 'Gagal menyimpan'); }
  }

  return (
    <Shell title="Fitur & Konten Landing" note="11 entri sesuai kartu di landing. Judul/deskripsi dipakai halaman fitur; gambar opsional menimpa ilustrasi kartu.">
      <button onClick={() => void reload()} className="text-xs font-bold text-primary hover:underline mb-3">↻ Muat ulang</button>
      {loading && !data && <p className="text-sm text-gray-400">Memuat konten…</p>}
      <div className="space-y-3">
        {(data ?? []).map((item) => {
          const draft = editing[item.slug] ?? {};
          const field = (key: 'title' | 'description' | 'imagePath') => ({
            value: draft[key] ?? (
              key === 'title' ? item.title :
              key === 'description' ? item.description ?? '' :
              item.imageUrl ?? ''
            ),
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              setEditing((prev) => ({ ...prev, [item.slug]: { ...(prev[item.slug] ?? {}), [key]: e.target.value } })),
          });
          return (
            <div key={item.slug} className="border border-gray-100 rounded-xl p-3 grid gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-center justify-between">
                <span className="font-mono text-xs text-gray-400">/features/{item.slug}</span>
                <select className="border border-gray-200 rounded-lg px-2 py-1 text-xs"
                  value={draft.status ?? item.status}
                  onChange={(e) => setEditing((prev) => ({ ...prev, [item.slug]: { ...(prev[item.slug] ?? {}), status: e.target.value } }))}>
                  <option value="published">Tayang</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Judul" {...field('title')} />
              <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Deskripsi" {...field('description')} />
              <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm sm:col-span-2" placeholder="/images/… atau https://…" {...field('imagePath')} />
              <div className="sm:col-span-2 text-right">
                <button onClick={() => void save(item)} className="bg-navy text-white rounded-lg px-4 py-2 text-xs font-bold">Simpan</button>
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

export function PollsPanel({ notify }: { notify: Notify }) {
  const { data, loading, reload } = useLoad(getAdminPolls, notify);
  async function toggle(p: AdminPoll) {
    try {
      await setAdminPollStatus(p.id, p.status === 'active' ? 'closed' : 'active');
      notify(p.status === 'active' ? 'Polling ditutup.' : 'Polling dibuka.');
      await reload();
    } catch (e) { notify(e instanceof Error ? e.message : 'Gagal mengubah polling'); }
  }
  return (
    <Shell title="Polling" note="Daftar polling nyata dari database. Pembuatan polling tersedia lewat API admin.">
      {loading && !data && <p className="text-sm text-gray-400">Memuat polling…</p>}
      {data?.length === 0 && <p className="text-sm text-gray-400">Belum ada polling.</p>}
      <div className="space-y-3">
        {data?.map((p) => (
          <div key={p.id} className="border border-gray-100 rounded-xl p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-navy">{p.question}</p>
                <p className="text-xs text-gray-400">{p._count.votes} suara · {p.status} · sampai {new Date(p.endsAt).toLocaleDateString('id-ID')}</p>
              </div>
              <button onClick={() => void toggle(p)} className="border border-gray-200 rounded-lg px-3 py-1 text-xs font-bold text-navy">
                {p.status === 'active' ? 'Tutup' : 'Buka'}
              </button>
            </div>
            <ul className="mt-2 text-xs text-gray-500 space-y-1">
              {p.options.map((o) => <li key={o.id}>{o.label} — {o._count.votes}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function StorePanel({ notify }: { notify: Notify }) {
  const { data, loading, reload } = useLoad(getAdminStoreItems, notify);
  const [draft, setDraft] = useState<Record<string, { price: string; isPremium: boolean }>>({});
  async function save(item: AdminStoreItem) {
    try {
      const d = draft[item.id] ?? { price: String(item.price), isPremium: item.isPremium };
      await updateAdminStoreItem(item.id, { price: Number(d.price), isPremium: d.isPremium });
      notify(`Harga ${item.name} disimpan (pembayaran tetap simulasi).`);
      await reload();
    } catch (e) { notify(e instanceof Error ? e.message : 'Gagal menyimpan'); }
  }
  return (
    <Shell title="Toko & Avatar" note="Harga dan status premium bersifat kosmetik. Tidak ada keistimewaan sosial dan tidak ada pembayaran nyata.">
      {loading && !data && <p className="text-sm text-gray-400">Memuat item…</p>}
      <div className="space-y-2">
        {data?.map((item) => {
          const d = draft[item.id] ?? { price: String(item.price), isPremium: item.isPremium };
          return (
            <div key={item.id} className="flex flex-wrap items-center gap-2 border border-gray-100 rounded-xl p-3">
              <div className="min-w-[140px] flex-1">
                <p className="text-sm font-bold text-navy">{item.name}</p>
                <p className="text-xs text-gray-400">{item.slug}</p>
              </div>
              <input type="number" min={0} className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-sm"
                value={d.price}
                onChange={(e) => setDraft((p) => ({ ...p, [item.id]: { ...d, price: e.target.value } }))} />
              <label className="text-xs text-gray-500 flex items-center gap-1">
                <input type="checkbox" checked={d.isPremium}
                  onChange={(e) => setDraft((p) => ({ ...p, [item.id]: { ...d, isPremium: e.target.checked } }))} />
                Premium
              </label>
              <button onClick={() => void save(item)} className="bg-navy text-white rounded-lg px-3 py-1 text-xs font-bold">Simpan</button>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

export function AdsPanel({ notify }: { notify: Notify }) {
  const { data, loading, reload } = useLoad(getAdminAds, notify);
  const [draft, setDraft] = useState<AdSettings | null>(null);
  const value = draft ?? data;
  async function save() {
    if (!value) return;
    try {
      await updateAdminAds(value);
      notify('Pengaturan iklan disimpan. Iklan tetap berlabel dan tidak memakai isi Spill.');
      setDraft(null);
      await reload();
    } catch (e) { notify(e instanceof Error ? e.message : 'Gagal menyimpan'); }
  }
  return (
    <Shell title="Iklan" note="Tanpa target sensitif. Iklan diberi label SPONSORED dan dibatasi per sesi.">
      {loading && !data && <p className="text-sm text-gray-400">Memuat pengaturan…</p>}
      {value && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-navy font-semibold">
            <input type="checkbox" checked={value.adsEnabled}
              onChange={(e) => setDraft({ ...value, adsEnabled: e.target.checked })} />
            Tampilkan iklan berlabel
          </label>
          <label className="block text-sm text-navy font-semibold">
            Maksimal tayang per sesi
            <input type="number" min={1} max={20} className="block w-28 mt-1 border border-gray-200 rounded-lg px-2 py-1"
              value={value.maxPerSession}
              onChange={(e) => setDraft({ ...value, maxPerSession: Number(e.target.value) })} />
          </label>
          <button onClick={() => void save()} className="bg-navy text-white rounded-lg px-4 py-2 text-xs font-bold">Simpan</button>
        </div>
      )}
    </Shell>
  );
}

export function CertificatesPanel({ notify }: { notify: Notify }) {
  const { data, loading, reload } = useLoad(getAdminCertificates, notify);
  async function setStatus(c: AdminCertificate, status: string) {
    try {
      await setAdminCertificateStatus(c.id, status);
      notify(status === 'approved' ? 'Sertifikat disetujui.' : 'Sertifikat ditolak.');
      await reload();
    } catch (e) { notify(e instanceof Error ? e.message : 'Gagal mengubah sertifikat'); }
  }
  return (
    <Shell title="Sertifikat" note="Sertifikat menghargai proses, bukan peringkat pencapaian.">
      {loading && !data && <p className="text-sm text-gray-400">Memuat sertifikat…</p>}
      {data?.length === 0 && <p className="text-sm text-gray-400">Belum ada sertifikat.</p>}
      <div className="space-y-2">
        {data?.map((c) => (
          <div key={c.id} className="border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-navy truncate">{c.post.content.slice(0, 90)}</p>
              <p className="text-xs text-gray-400">{c.status} · {new Date(c.createdAt).toLocaleDateString('id-ID')}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => void setStatus(c, 'approved')} className="bg-green-50 text-green-700 rounded-lg px-3 py-1 text-xs font-bold">Setujui</button>
              <button onClick={() => void setStatus(c, 'rejected')} className="bg-red-50 text-red-600 rounded-lg px-3 py-1 text-xs font-bold">Tolak</button>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
