'use client';
import { useState } from 'react';
import { defaultAvatar, errorMessage, json, rupiah, dateLabel, type AvatarConfig, type Inventory, type Item, type Transaction, type User } from '../lib/api';
import { accessorySlugs, Avatar, characters } from './avatar';
import { Icon } from './icons';
import { SignInPrompt, useResource, useSession } from './session';
import { Alert, Empty, Loading, Modal } from './ui';
const isFree = (item: Item) => !item.isPremium && item.price === 0;
function ItemArt({ item }: { item: Item }) {
  const character = characters.find(c => c.id === item.slug);
  return character || accessorySlugs.includes(item.slug) ? <Avatar config={{ character: character?.id ?? 'panda', accessories: character ? [] : [item.slug] }} label={item.name}/> : <span className="unknown-art"><Icon name="store" width="48" height="48"/><small>Tanpa pratinjau</small></span>;
}
export function AvatarEditor({ onStore }: { onStore: () => void }) {
  const { user, request, setUser, requireUser, notify } = useSession();
  const items = useResource<Item[]>('/avatar/items');
  const inventory = useResource<Inventory>(user ? '/users/me/inventory' : null);
  const [config, setConfig] = useState<AvatarConfig>(user?.profile?.avatarConfig ?? defaultAvatar);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const owns = (item: Item) => isFree(item) || !!inventory.data?.some(entry => entry.itemId === item.id);
  return <section><div className="section-heading"><div><span className="eyebrow">BUKAN FOTO PROFIL PROFESIONAL</span><h2>Versi paling kamu.</h2></div></div><p className="section-intro">Kantung mata, kopi, dan sedikit harapan. Pilih teman seperjuanganmu.</p>
    <div className="avatar-workshop"><div className="avatar-preview card"><span className="eyebrow">RUANG GANTI</span><div className="preview-stage"><Avatar config={config} label="Pratinjau avatar pilihanmu"/></div><h3>{characters.find(character => character.id === config.character)?.name ?? characters[0].name}</h3><p className="muted">Tidak perlu terlihat selalu siap kerja.</p><button className="button primary full" disabled={busy || (!!user && (items.loading || inventory.loading || !!items.error || !!inventory.error))} onClick={async () => {
      if (!requireUser() || busy) return; setBusy(true); setError('');
      try { const result = await request<User>('/users/me', { method: 'PATCH', body: json({ avatarConfig: { character: config.character, accessories: config.accessories } }) }); setUser(result); setConfig(result.profile?.avatarConfig ?? defaultAvatar); notify('Avatar tersimpan di profilmu.'); }
      catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
    }}>{busy ? 'Menyimpan…' : user ? 'Simpan avatar' : 'Masuk untuk menyimpan'}<Icon name="check"/></button><Alert>{error}</Alert>{!user && <p className="field-hint">Boleh coba dulu. Pilihan belum tersimpan sampai kamu masuk dan menyimpan.</p>}</div>
    <div className="avatar-options"><fieldset disabled={busy}><legend>01 / Pilih karaktermu</legend><div className="character-grid">{characters.map(character => <label key={character.id} className={`character-choice ${config.character === character.id ? 'selected' : ''}`}><input type="radio" name="character" value={character.id} checked={config.character === character.id} onChange={() => setConfig({ ...config, character: character.id })}/><Avatar config={{ character: character.id, accessories: [] }} label={character.name}/><strong>{character.name}</strong><small>{character.short}</small></label>)}</div></fieldset>
    <fieldset disabled={busy}><legend>02 / Bawa yang esensial</legend><p className="field-hint">Aksesori gratis langsung bisa dipakai. Item berbayar harus ada di inventori akunmu.</p>
      {(items.loading || inventory.loading) && <Loading label="Memuat aksesori dan inventori…"/>}<Alert>{items.error || inventory.error}</Alert>{(items.error || inventory.error) && <button type="button" className="text-button" onClick={() => { items.reload(); inventory.reload(); }}>Muat ulang aksesori</button>}
      {items.data && <div className="accessory-list">{items.data.filter(item => accessorySlugs.includes(item.slug)).map(item => { const owned = owns(item); const selected = config.accessories.includes(item.slug); return <div className={`accessory-option ${selected ? 'selected' : ''}`} key={item.id}><label><input type="checkbox" checked={selected} disabled={!owned || busy || inventory.loading || !!inventory.error} onChange={e => setConfig({ ...config, accessories: e.target.checked ? [...config.accessories, item.slug] : config.accessories.filter(slug => slug !== item.slug) })}/><span><strong>{item.name}</strong><small>{isFree(item) ? 'Gratis' : owned ? 'Ada di inventorimu' : 'Belum dimiliki'}</small></span></label>{!owned && <button type="button" className="text-button" onClick={onStore}>Lihat toko<Icon name="arrow"/></button>}</div>; })}</div>}
      {items.data && !items.data.some(item => accessorySlugs.includes(item.slug)) && <p className="muted">Belum ada aksesori tersedia dari server.</p>}
    </fieldset></div></div>
  </section>;
}
export function Store({ onAvatar }: { onAvatar: () => void }) {
  const { user, request, requireUser, notify } = useSession();
  const items = useResource<Item[]>('/avatar/items'); const config = useResource<{ mode: 'simulation' | 'disabled' }>('/store/config');
  const inventory = useResource<Inventory>(user ? '/users/me/inventory' : null); const transactions = useResource<Transaction[]>(user ? '/store/transactions' : null);
  const [busy, setBusy] = useState<string | null>(null); const [error, setError] = useState(''); const [transaction, setTransaction] = useState<Transaction | null>(null);
  const simulation = config.data?.mode === 'simulation';
  return <section><div className="section-heading"><div><span className="eyebrow">SEDIKIT BEKAL, SEDIKIT GAYA</span><h2>Toko yang nggak ambisius.</h2></div><Icon name="store" width="30" height="30"/></div><p className="section-intro">Pelengkap kecil untuk avatar yang sudah cukup apa adanya.</p>
    {config.loading && <Loading label="Memeriksa mode toko…"/>}<Alert>{config.error}</Alert>{config.error && <button className="text-button" onClick={config.reload}>Periksa mode lagi</button>}
    {simulation && <div className="simulation-banner"><Icon name="shield"/><div><strong>SIMULASI — bukan pembayaran QRIS asli</strong><p>Tidak ada uang ditagih atau kode QR pembayaran. Harga hanya untuk skenario simulasi.</p></div></div>}
    {config.data?.mode === 'disabled' && <div className="gentle-note"><Icon name="store"/><p>Pembelian sedang dinonaktifkan. Item gratis dan item yang sudah dimiliki tetap bisa dipakai.</p></div>}
    {(items.loading || inventory.loading) && <Loading label="Menata etalase…"/>}<Alert>{items.error || inventory.error || error}</Alert>{(items.error || inventory.error) && <button className="text-button" onClick={() => { items.reload(); inventory.reload(); }}>Muat ulang item</button>}
    {items.data && (items.data.length ? <div className="store-grid">{items.data.map(item => { const owned = inventory.data?.some(entry => entry.itemId === item.id); const free = isFree(item); return <article className="card store-item" key={item.id}><div className="store-art"><span className="item-tag">{free ? 'GRATIS' : owned ? 'DIMILIKI' : 'AKSESORI'}</span><ItemArt item={item}/></div><div className="store-item-body"><h3>{item.name}</h3><p>{free ? 'Bekal tanpa biaya.' : `${rupiah(item.price)}${simulation ? ' · simulasi' : ''}`}</p><button className={`button full ${owned || free ? 'secondary' : 'primary'}`} disabled={!!busy || (!free && !owned && (!simulation || (!!user && (inventory.loading || !!inventory.error))))} onClick={async () => {
      if (free || owned) { onAvatar(); return; } if (!requireUser() || busy || !simulation) return; setBusy(item.id); setError('');
      try { const result = await request<Transaction>('/store/purchase', { method: 'POST', body: json({ itemId: item.id }) }); transactions.reload(); if (result.mode !== 'simulation' || result.qrisPayload !== null) throw new Error('Respons tidak sesuai mode simulasi. Transaksi tidak akan dikonfirmasi.'); setTransaction(result); }
      catch (e) { setError(errorMessage(e)); } finally { setBusy(null); }
    }}>{busy === item.id ? 'Menyiapkan…' : free ? 'Pakai gratis' : owned ? 'Pakai di avatar' : simulation ? 'Simulasikan pembelian' : 'Pembelian nonaktif'}</button></div></article>; })}</div> : <Empty title="Etalasenya masih kosong."><p>Item akan tampil saat tersedia di server.</p></Empty>)}
    <section className="transaction-section"><h3>Riwayat simulasi akunmu</h3>{!user ? <SignInPrompt title="Inventori tersimpan di akunmu."/> : <>{transactions.loading && <Loading label="Memuat riwayat…"/>}<Alert>{transactions.error}</Alert>{transactions.error && <button className="text-button" onClick={transactions.reload}>Muat ulang riwayat</button>}{transactions.data && (transactions.data.length ? <ul className="transaction-list">{transactions.data.map(tx => <li key={tx.id}><div><strong>{tx.item?.name ?? items.data?.find(item => item.id === tx.itemId)?.name ?? 'Item tidak tersedia'}</strong><small>{dateLabel(tx.createdAt)}</small><small className="transaction-id">ID: {tx.id}</small></div><div><b>{rupiah(tx.amount)}</b><span className="status-label">{tx.paymentStatus === 'simulated' ? 'Simulasi selesai' : tx.paymentStatus === 'pending' ? 'Menunggu simulasi' : tx.paymentStatus}</span>{tx.paymentStatus === 'pending' && simulation && <button className="text-button" disabled={!!busy} onClick={() => setTransaction(tx)}>Lanjutkan simulasi</button>}</div></li>)}</ul> : <p className="muted">Belum ada transaksi. Tidak perlu membeli apa pun untuk ikut bercerita.</p>)}</>}</section>
    {transaction && <PurchaseDialog transaction={transaction} enabled={simulation} onClose={() => setTransaction(null)} onComplete={() => { inventory.reload(); transactions.reload(); notify('Simulasi selesai. Inventori akan dimuat ulang dari server.'); setTransaction(null); }}/>} 
  </section>;
}
function PurchaseDialog({ transaction, enabled, onClose, onComplete }: { transaction: Transaction; enabled: boolean; onClose: () => void; onComplete: () => void }) {
  const { request } = useSession(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <Modal title="Coba alurnya. Bukan bayar asli." onClose={onClose} busy={busy}><div className="simulation-banner"><Icon name="shield"/><strong>SIMULASI — bukan pembayaran QRIS asli</strong></div><p>Tidak ada transfer uang, pemindaian QR, atau tagihan sungguhan. Inventori baru berubah setelah server mengonfirmasi simulasi.</p><dl className="purchase-details"><div><dt>Item</dt><dd>{transaction.item?.name ?? 'Aksesori avatar'}</dd></div><div><dt>Nilai simulasi</dt><dd>{rupiah(transaction.amount)}</dd></div><div><dt>Status server</dt><dd>{transaction.paymentStatus}</dd></div></dl><Alert>{error}</Alert><div className="form-actions"><button className="button secondary" disabled={busy} onClick={onClose}>Nanti saja</button><button autoFocus className="button primary" disabled={busy || !enabled || transaction.paymentStatus !== 'pending'} onClick={async () => {
    setBusy(true); setError(''); try { const result = await request<Transaction>(`/store/purchase/confirm/${encodeURIComponent(transaction.id)}`, { method: 'POST' }); if (result.paymentStatus !== 'simulated') throw new Error('Server belum mengonfirmasi simulasi. Periksa riwayat sebelum mencoba lagi.'); onComplete(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }}>{busy ? 'Mengonfirmasi…' : 'Selesaikan simulasi'}</button></div></Modal>;
}
