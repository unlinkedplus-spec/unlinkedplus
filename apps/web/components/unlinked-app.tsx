'use client';
import { useRef, useState } from 'react';
import { Avatar } from './avatar';
import { Composer, Feed } from './feed';
import { Icon, type IconName } from './icons';
import { AdminReports, Profile } from './profile';
import { SessionProvider, useSession } from './session';
import { Alert } from './ui';
import { AvatarEditor, Store } from './wardrobe';
type Tab = 'feed' | 'spill' | 'avatar' | 'store' | 'profile' | 'admin';
const tabs: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'feed', label: 'Beranda', icon: 'home' }, { id: 'spill', label: 'Spill', icon: 'pen' }, { id: 'avatar', label: 'Avatar', icon: 'avatar' }, { id: 'store', label: 'Toko', icon: 'store' }, { id: 'profile', label: 'Profil', icon: 'profile' },
];
export default function UnlinkedApp() { return <SessionProvider><SessionShell/></SessionProvider>; }
function SessionShell() { const { user, epoch } = useSession(); return <Shell key={`${user?.id ?? 'visitor'}-${epoch}`}/>; }
function Shell() {
  const { user, checking, openAuth, sessionError, retrySession } = useSession();
  const [tab, setTab] = useState<Tab>('feed'); const [revision, setRevision] = useState(0);
  const contentRef = useRef<HTMLElement>(null);
  function navigate(next: Tab) {
    setTab(next);
    requestAnimationFrame(() => { contentRef.current?.focus({ preventScroll: true }); contentRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); });
  }
  const navigation = (mobile = false) => <nav className={mobile ? 'mobile-nav' : 'space-nav'} aria-label={mobile ? 'Navigasi seluler' : 'Ruang kamu'}>{tabs.map(item => <button key={item.id} aria-current={tab === item.id ? 'page' : undefined} className={tab === item.id ? 'active' : ''} onClick={() => navigate(item.id)}><Icon name={item.icon}/><span>{item.label}</span>{!mobile && tab === item.id && <span className="nav-dot"/>}</button>)}</nav>;
  return <><a className="skip-link" href="#ruang-cerita">Lewati ke konten</a>
    <header className="site-header"><div className="header-inner"><a className="brand" href="/" aria-label="unlinked+, beranda"><img src="/brand-icon.png" alt="" width="40" height="40"/><span>unlinked<span className="brand-plus">+</span></span></a><span className="header-motto">Less Flex, More Human.</span><div className="header-actions">{checking ? <span className="header-session" role="status">Memeriksa sesi…</span> : user ? <button className="account-chip" onClick={() => navigate('profile')}><span className="avatar-circle mini"><Avatar config={user.profile?.avatarConfig}/></span><span>{user.username}</span></button> : <><button className="text-button header-login" onClick={() => openAuth('login')}>Masuk</button><button className="button primary header-join" onClick={() => openAuth('register')}>Gabung sekarang<Icon name="arrow"/></button></>}</div></div></header>
    <main>
      {tab === 'feed' && <><section className="hero"><div className="hero-copy"><span className="hero-kicker"><span/>KARIER BOLEH BERANTAKAN. KAMU TETAP BERHARGA.</span><h1>LinkedIn untuk<br/>orang yang<br/><span className="highlight">lagi gagal.</span></h1><p className="hero-description">Capek lihat orang pamer pencapaian di sebelah?<br className="desktop-break"/> Di sini, nggak apa-apa kalau ceritamu belum berakhir indah.</p><div className="hero-actions"><button className="button navy large" onClick={() => user ? navigate('spill') : openAuth('register')}>{user ? 'Ceritakan harimu' : 'Gabung, jadi diri sendiri'}<Icon name="arrow"/></button><button className="text-button" onClick={() => navigate('feed')}>Baca cerita dulu</button></div><p className="hero-footnote"><Icon name="shield" width="17" height="17"/>Pakai nama samaran. Bukan nama jabatan.</p></div><div className="hero-visual"><div className="hero-image-label">Hari berat?<br/><span>Taruh dulu di sini.</span></div><img className="hero-mascot" src="/mascot.png" width="439" height="500" alt="Maskot unlinked+ berwajah lelah membawa kopi dan kardus perlengkapan kantor" fetchPriority="high"/><div className="hero-sticker"><Icon name="heart"/><span>Nggak harus sukses<br/><strong>untuk punya cerita.</strong></span></div></div></section>
      <div className="brand-statement"><span>Memutus yang Toksik,</span><Icon name="plus" width="25" height="25"/><span>Menambah yang Esensial.</span></div></>}
      <div className="app-layout"><aside className="left-sidebar"><div className="nav-heading">RUANG KAMU</div>{navigation()}<div className="sidebar-note"><span className="handwritten">Pelan-pelan<br/>juga sampai.</span><p>Tidak semua hal harus jadi pencapaian hari ini.</p><span className="tiny-plus">+</span></div></aside>
      <section className={`main-content ${tab === 'avatar' || tab === 'store' ? 'wide-content' : ''}`} id="ruang-cerita" ref={contentRef} tabIndex={-1} aria-label="Konten utama">
        {sessionError && <div className="session-error"><Alert>Sesi belum dapat diperiksa: {sessionError}</Alert><button className="text-button" onClick={retrySession}>Periksa sesi lagi</button></div>}
        {tab === 'feed' && <Feed revision={revision} onSpill={() => navigate('spill')}/>}
        {tab === 'spill' && <Composer onPosted={() => { setRevision(n => n + 1); navigate('feed'); }}/>}
        {tab === 'avatar' && <AvatarEditor onStore={() => navigate('store')}/>}
        {tab === 'store' && <Store onAvatar={() => navigate('avatar')}/>}
        {tab === 'profile' && <Profile onAvatar={() => navigate('avatar')} onAdmin={() => navigate('admin')} onSpill={() => navigate('spill')}/>}
        {tab === 'admin' && user?.role === 'admin' && <AdminReports/>}
      </section>
      {tab !== 'avatar' && tab !== 'store' && <aside className="right-sidebar"><div className="manifesto-card"><img src="/brand-icon.png" width="56" height="56" alt=""/><span className="eyebrow">PENGINGAT KECIL</span><h3>Kamu bukan<br/>CV-mu.</h3><p>Kamu manusia utuh, bahkan ketika karier sedang berantakan.</p><div className="manifesto-signature">unlinked<span>+</span></div></div>
        <div className="community-guide"><h3>Di sini, kita…</h3><div><Icon name="heart"/><p><strong>Saling dukung.</strong><span>Bukan saling adu nasib.</span></p></div><div><Icon name="smile"/><p><strong>Jujur & apa adanya.</strong><span>Tanpa panggung pencapaian.</span></p></div><div><Icon name="shield"/><p><strong>Tetap jaga batas.</strong><span>Jangan bagikan data pribadi.</span></p></div></div>
        {user?.profile && <div className="mental-note"><span className="eyebrow">JEJAK AKUNMU</span><p><strong>Level {user.profile.mentalLevel}</strong><span>{user.profile.mentalXp} mental XP</span></p><small>Angka bukan ukuran nilai dirimu.</small></div>}
        <p className="sidebar-footer">Less Flex, More Human.<br/>Ruang cerita, bukan layanan krisis.</p>
      </aside>}
      </div>
    </main>
    <footer className="site-footer"><a className="brand" href="/">unlinked<span className="brand-plus">+</span></a><p>Lebih dari sekadar pekerjaan.<br/>Lebih dekat jadi manusia.</p><span>Memutus yang Toksik,<br/>Menambah yang Esensial.</span></footer>
    {navigation(true)}
  </>;
}
