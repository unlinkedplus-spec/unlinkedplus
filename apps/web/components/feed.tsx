'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { categories, dateLabel, errorMessage, json, type Certificate, type Comment, type Page, type Post, type ReactionState, type ReactionType } from '../lib/api';
import { Avatar } from './avatar';
import { Icon, type IconName } from './icons';
import { useResource, useSession, SignInPrompt } from './session';
import { Alert, Confirm, Empty, Loading, Modal, Pagination } from './ui';
const reactions: { type: ReactionType; label: string; icon: IconName }[] = [
  { type: 'pukpuk', label: 'Puk-puk', icon: 'heart' }, { type: 'ngakak', label: 'Ngakak maaf', icon: 'smile' }, { type: 'sama', label: 'Sama banget', icon: 'people' },
];
type ReportTarget = { type: 'post' | 'comment' | 'user'; id: string };
export function Feed({ revision = 0, own = false, onSpill }: { revision?: number; own?: boolean; onSpill?: () => void }) {
  const [page, setPage] = useState(1);
  const resource = useResource<Page<Post>>(own ? `/users/me/posts?page=${page}` : `/posts?page=${page}&limit=20`, revision);
  const { user } = useSession();
  useEffect(() => { if (resource.data && page > 1 && resource.data.data.length === 0) setPage(p => p - 1); }, [resource.data, page]);
  return <section aria-label={own ? 'Spill milikmu' : 'Feed komunitas'}>
    {!own && <><div className="section-heading"><div><span className="eyebrow">RUANG CERITA KITA</span><h2>Hari ini, apa adanya.</h2></div><button className="text-button" onClick={resource.reload} disabled={resource.loading}>Muat ulang</button></div><button className="composer-teaser" onClick={onSpill}><span className="avatar-circle"><Avatar config={user?.profile?.avatarConfig}/></span><span><strong>Ada yang mau kamu ceritakan?</strong><small>Taruh bebanmu sebentar di sini.</small></span><span className="teaser-pen"><Icon name="pen"/></span></button><div className="feed-label"><span>Cerita terbaru</span><span>Tanpa perlombaan pencapaian.</span></div></>}
    {resource.loading && <Loading label="Mengambil cerita terbaru…"/>}
    {resource.error && <><Alert>{resource.error}</Alert><button className="button secondary" onClick={resource.reload}>Coba lagi</button></>}
    {resource.data && (resource.data.data.length ? <div className="post-list">{resource.data.data.map(post => <PostCard key={post.id} post={post} onChange={resource.reload}/>)}</div> : <Empty title={own ? 'Belum ada cerita darimu.' : 'Belum ada spill di sini.'}><p>Tidak harus punya cerita hebat. Hari yang berat juga layak didengar.</p>{onSpill && <button className="button primary" onClick={onSpill}>Tulis cerita pertama<Icon name="pen"/></button>}</Empty>)}
    <Pagination page={page} pages={resource.data?.totalPages ?? 0} onPage={setPage} busy={resource.loading}/>
  </section>;
}
export function Composer({ onPosted }: { onPosted: () => void }) {
  const { user, request, refreshMe, notify } = useSession();
  const [content, setContent] = useState(''); const [category, setCategory] = useState<string>(categories[0]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const size = content.trim().length;
  return <section><div className="section-heading"><div><span className="eyebrow">TIDAK HARUS BAIK-BAIK SAJA</span><h2>Akhirnya, spill juga.</h2></div><Icon name="pen" width="30" height="30"/></div>
    {!user ? <SignInPrompt title="Ceritamu pantas didengar."/> : <form className="card composer" onSubmit={async event => {
      event.preventDefault(); if (busy || size < 10 || size > 280) return; setBusy(true); setError('');
      try { await request<Post>('/posts', { method: 'POST', body: json({ category, content: content.trim() }) }); setContent(''); notify('Ceritamu sudah dibagikan. Terima kasih sudah jujur.');
        try { await refreshMe(); } catch (e) { notify(`Spill tersimpan, tetapi profil belum termuat ulang: ${errorMessage(e)}`); } onPosted();
      } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
    }}>
      <div className="person"><span className="avatar-circle"><Avatar config={user.profile?.avatarConfig}/></span><div><strong>{user.username}</strong><small>Nama samaranmu terlihat di cerita ini.</small></div></div>
      <label className="field">Kategori cerita<select value={category} onChange={e => setCategory(e.target.value)} disabled={busy}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
      <label className="field">Apa plot twist-mu hari ini?<textarea autoFocus rows={7} maxLength={280} minLength={10} required value={content} onChange={e => setContent(e.target.value)} disabled={busy} placeholder="Katanya akan dikabari minggu depan. Ini sudah minggu depan yang kelima…" aria-describedby="spill-guidance"/></label>
      <div className="composer-meta"><span id="spill-guidance">10–280 karakter, setelah spasi tepi dihapus.</span><span className="char-count">{content.length}/280</span></div>
      <div className="gentle-note"><Icon name="shield"/><p>Cerita boleh jujur, tetap jaga orang lain. Hindari nama asli, data pribadi, dan promosi pencapaian. Cerita diperiksa oleh aturan anti-flex server.</p></div>
      <Alert>{error}</Alert><button className="button primary" disabled={busy || size < 10 || size > 280}>{busy ? 'Mengirim cerita…' : 'Lepaskan, lalu lanjutkan'}<Icon name="arrow"/></button>
    </form>}
    <div className="quote-inline">“Kamu bukan CV-mu. Kamu manusia utuh.”</div>
  </section>;
}
function PostCard({ post, onChange }: { post: Post; onChange: () => void }) {
  const { user, request, requireUser, notify } = useSession();
  const [reaction, setReaction] = useState<ReactionState>({ counts: post.reactionCounts, userReactions: { pukpuk: false, ngakak: false, sama: false } });
  const [reactionLoading, setReactionLoading] = useState(true); const [reactionError, setReactionError] = useState(''); const [reactionRetry, setReactionRetry] = useState(0);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [comments, setComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post._count.comments);
  const [report, setReport] = useState<ReportTarget | null>(null); const [deleting, setDeleting] = useState(false); const [certificate, setCertificate] = useState(false);
  const own = !!user && post.user?.id === user.id; const commentsId = useId();
  useEffect(() => {
    const controller = new AbortController(); setReactionLoading(true); setReactionError('');
    const path = `/posts/${encodeURIComponent(post.id)}/reactions`;
    Promise.all([
      request<ReactionState['counts']>(path, { signal: controller.signal }),
      user ? request<ReactionState['userReactions']>(`${path}/me`, { signal: controller.signal }) : Promise.resolve({ pukpuk: false, ngakak: false, sama: false }),
    ]).then(([counts, userReactions]) => { if (!controller.signal.aborted) setReaction({ counts, userReactions }); }).catch(e => { if (!controller.signal.aborted) setReactionError(errorMessage(e)); }).finally(() => { if (!controller.signal.aborted) setReactionLoading(false); });
    return () => controller.abort();
  }, [post.id, user?.id, request, reactionRetry]);
  function openReport(target: ReportTarget) { if (requireUser()) setReport(target); }
  return <article className="card post">
    <header className="post-head"><div className="person"><span className="avatar-circle"><Avatar config={post.user?.profile?.avatarConfig}/></span><div><strong>{post.user?.username ?? 'Pengguna dihapus'}</strong><time dateTime={post.createdAt}>{dateLabel(post.createdAt)}</time></div></div><details className="post-menu"><summary aria-label="Opsi cerita">···</summary><div className="menu-items">{own ? <><button onClick={() => setCertificate(true)}>Sertifikat cerita</button><button onClick={() => setDeleting(true)}>Hapus cerita</button></> : <><button onClick={() => openReport({ type: 'post', id: post.id })}>Laporkan cerita</button>{post.user && <button onClick={() => openReport({ type: 'user', id: post.user!.id })}>Laporkan pengguna</button>}</>}</div></details></header>
    <span className="category">{post.category}</span><p className="post-content">{post.content}</p>
    <div className="reaction-row" aria-label="Beri dukungan">{reactions.map(({ type, label, icon }) => <button key={type} className={reaction.userReactions[type] ? 'reacted' : ''} aria-pressed={reaction.userReactions[type]} disabled={busy || (!!user && (reactionLoading || !!reactionError))} onClick={async () => {
      if (!requireUser() || busy) return; setBusy(true); setError('');
      try { const result = await request<ReactionState & { added: boolean }>(`/posts/${encodeURIComponent(post.id)}/reactions`, { method: 'POST', body: json({ type }) }); setReaction(result); }
      catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
    }}><Icon name={icon}/><span>{label}</span><b>{reaction.counts?.[type] ?? 0}</b></button>)}</div>
    {reactionError && <div className="inline-error"><Alert>{reactionError}</Alert><button className="text-button" onClick={() => setReactionRetry(n => n + 1)}>Muat ulang reaksi</button></div>}
    <Alert>{error}</Alert><div className="post-footer"><button className="text-button" aria-expanded={comments} aria-controls={commentsId} onClick={() => setComments(!comments)}><Icon name="comment"/>{commentCount} komentar</button>{own && <button className="text-button" onClick={() => setCertificate(true)}><Icon name="download"/>Sertifikat</button>}</div>
    {comments && <div id={commentsId}><Comments postId={post.id} onCount={setCommentCount} onReport={openReport}/></div>}
    {report && <ReportForm target={report} onClose={() => setReport(null)}/>}
    {deleting && <Confirm title="Hapus cerita ini?" description="Cerita dan percakapannya akan dihapus. Tindakan ini tidak bisa dibatalkan." onClose={() => setDeleting(false)} action={async () => { await request(`/posts/${encodeURIComponent(post.id)}`, { method: 'DELETE' }); notify('Cerita sudah dihapus.'); onChange(); }}/>}
    {certificate && <CertificateDialog postId={post.id} onClose={() => setCertificate(false)}/>}
  </article>;
}
function Comments({ postId, onCount, onReport }: { postId: string; onCount: (count: number) => void; onReport: (target: ReportTarget) => void }) {
  const { user, request, requireUser, notify } = useSession(); const [page, setPage] = useState(1);
  const resource = useResource<Page<Comment>>(`/posts/${encodeURIComponent(postId)}/comments?page=${page}`);
  const [content, setContent] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [deleting, setDeleting] = useState<string | null>(null);
  useEffect(() => { if (resource.data) { onCount(resource.data.total); if (page > 1 && !resource.data.data.length) setPage(p => p - 1); } }, [resource.data, onCount, page]);
  return <section className="comments" aria-label="Komentar"><h3>Ruang saling mendengar</h3>{resource.loading && <Loading label="Memuat komentar…"/>}<Alert>{resource.error}</Alert>{resource.error && <button className="text-button" onClick={resource.reload}>Coba lagi</button>}
    {resource.data && (resource.data.data.length ? <ul className="comment-list">{resource.data.data.map(comment => <li key={comment.id}><div className="person"><span className="avatar-circle mini"><Avatar config={comment.user?.profile?.avatarConfig}/></span><div><strong>{comment.user?.username ?? 'Pengguna dihapus'}</strong><time dateTime={comment.createdAt}>{dateLabel(comment.createdAt)}</time></div></div><p>{comment.content}</p><button className="text-button" onClick={() => comment.user?.id === user?.id && user ? setDeleting(comment.id) : onReport({ type: 'comment', id: comment.id })}>{comment.user?.id === user?.id && user ? 'Hapus' : 'Laporkan'}</button></li>)}</ul> : <p className="muted">Belum ada komentar. Mulai dengan mendengarkan.</p>)}
    <Pagination page={page} pages={resource.data?.totalPages ?? 0} onPage={setPage} busy={resource.loading}/>
    <form onSubmit={async e => { e.preventDefault(); if (!requireUser() || busy || !content.trim()) return; setBusy(true); setError(''); try { await request(`/posts/${encodeURIComponent(postId)}/comments`, { method: 'POST', body: json({ content: content.trim() }) }); setContent(''); setPage(1); resource.reload(); notify('Komentarmu sudah terkirim.'); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } }}>
      <label className="field">Tulis dukungan, bukan penghakiman<textarea rows={2} required maxLength={500} value={content} onChange={e => setContent(e.target.value)} disabled={busy} placeholder="Aku mendengarkan…"/></label><Alert>{error}</Alert><button className="button secondary" disabled={busy || !content.trim()}>{busy ? 'Mengirim…' : user ? 'Kirim komentar' : 'Masuk untuk mengirim'}</button>
    </form>
    {deleting && <Confirm title="Hapus komentar?" description="Komentar ini akan dihapus dari percakapan." onClose={() => setDeleting(null)} action={async () => { await request(`/comments/${encodeURIComponent(deleting)}`, { method: 'DELETE' }); resource.reload(); notify('Komentar sudah dihapus.'); }}/>}
  </section>;
}
function ReportForm({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
  const { request, notify } = useSession(); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <Modal title="Bantu jaga ruang ini." onClose={onClose} busy={busy}><p>Laporkan {target.type === 'post' ? 'cerita' : target.type === 'comment' ? 'komentar' : 'pengguna'} yang melanggar. Tim moderasi akan meninjau laporanmu.</p><form onSubmit={async event => { event.preventDefault(); if (busy) return; setBusy(true); setError(''); try { await request('/reports', { method: 'POST', body: json({ targetType: target.type, targetId: target.id, reason: reason.trim() }) }); notify('Laporan diterima untuk ditinjau. Terima kasih sudah peduli.'); onClose(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } }}><label className="field">Alasan laporan<textarea autoFocus required minLength={10} maxLength={500} rows={4} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} placeholder="Jelaskan hal yang perlu ditinjau (10–500 karakter)."/></label><Alert>{error}</Alert><button className="button primary" disabled={busy || reason.trim().length < 10}>{busy ? 'Mengirim…' : 'Kirim laporan'}<Icon name="flag"/></button></form></Modal>;
}
function CertificateDialog({ postId, onClose }: { postId: string; onClose: () => void }) {
  const { request, notify } = useSession();
  const [certificate, setCertificate] = useState<Certificate | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [polling, setPolling] = useState(false); const [pollRun, setPollRun] = useState(0);
  const downloadController = useRef<AbortController | null>(null);
  useEffect(() => () => downloadController.current?.abort(), []);
  useEffect(() => {
    if (!certificate || certificate.status !== 'pending') return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined; let attempts = 0; setPolling(true);
    async function poll() {
      try {
        const result = await request<Certificate>(`/certificates/${encodeURIComponent(certificate!.id)}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setCertificate(result);
        if (result.status !== 'pending') { setPolling(false); if (result.status === 'failed') setError('Pembuatan PNG gagal. Coba buat ulang.'); return; }
        if (++attempts >= 30) { setPolling(false); setError('PNG masih diproses. Pemeriksaan otomatis berhenti setelah satu menit. Kamu bisa periksa lagi.'); return; }
        timer = setTimeout(poll, 2000);
      } catch (e) { if (!controller.signal.aborted) { setPolling(false); setError(errorMessage(e)); } }
    }
    void poll(); return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [certificate?.id, certificate?.status, request, pollRun]);
  async function create() {
    setBusy(true); setError('');
    try { setCertificate(await request<Certificate>('/certificates', { method: 'POST', body: json({ postId }) })); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  const ready = certificate?.status === 'ready' && certificate.downloadUrl === `/api/certificates/${certificate.id}/download`;
  return <Modal title="Sertifikat bertahan hidup." onClose={onClose} busy={busy}>
    <div className="certificate-illustration"><Icon name="shield" width="52" height="52"/><strong>Kamu sudah berani bercerita.</strong><span>Satu cerita. Satu langkah.</span></div>
    <p>PNG dibuat oleh server dari ceritamu sendiri. File baru tersedia setelah proses selesai; ini bukan sertifikat profesi.</p>
    {polling && <Loading label="Server sedang menyiapkan PNG…"/>}<Alert>{error}</Alert>
    {(!certificate || certificate.status === 'failed') && <button className="button primary" disabled={busy} onClick={create}>{busy ? 'Mengirim permintaan…' : 'Buat PNG cerita ini'}</button>}
    {certificate?.status === 'pending' && !polling && <button className="button secondary" onClick={() => { setError(''); setPollRun(n => n + 1); }}>Periksa status lagi</button>}
    {certificate?.status === 'ready' && !ready && <Alert>Tautan unduhan dari server belum valid. Tutup dan coba lagi.</Alert>}
    {ready && <button className="button primary" disabled={busy} onClick={async () => {
      setBusy(true); setError(''); const controller = new AbortController(); downloadController.current = controller;
      try {
        const response = await fetch(certificate!.downloadUrl!, { credentials: 'include', cache: 'no-store', signal: controller.signal });
        if (response.status === 401) { await request('/auth/me'); throw new Error('Sesi berakhir. Masuk kembali untuk mengunduh.'); }
        if (!response.ok) throw new Error(`Unduhan gagal (${response.status}). Silakan coba lagi.`);
        if (!response.headers.get('content-type')?.includes('image/png')) throw new Error('Server belum mengirim file PNG yang valid.');
        const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `unlinked-cerita-${certificate!.id}.png`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000); notify('PNG siap; unduhan sudah dimulai.');
      } catch (e) { if (!controller.signal.aborted) setError(errorMessage(e)); } finally { if (!controller.signal.aborted) setBusy(false); }
    }}><Icon name="download"/>{busy ? 'Mengunduh…' : 'Unduh PNG'}</button>}
    <p className="field-hint">Menutup dialog menghentikan pemeriksaan status otomatis, bukan pekerjaan server.</p>
  </Modal>;
}
