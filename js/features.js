/* ============================================================
   unlinked+ — features.js
   Modul fitur untuk seluruh menu sidebar:
   Discover · Komunitas · Profil · Poll · Personality Test ·
   Meme Studio · Store · Opportunity Board · Mental Reset ·
   Avatar · halaman Tentang.

   Berdiri sendiri (tidak bergantung pada feed.js/shop.js) karena
   index.html hanya memuat app.js. Data disimpan di localStorage
   dengan namespace "unlinked." sehingga tetap ada setelah reload.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     Utilitas
     --------------------------------------------------------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function uid() {
    return Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
  }

  function rupiah(n) {
    return 'Rp' + Number(n || 0).toLocaleString('id-ID');
  }

  function relativeTime(ts) {
    var diff = Date.now() - ts;
    if (diff < 60000) return 'baru saja';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' menit lalu';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' jam lalu';
    return Math.floor(diff / 86400000) + ' hari lalu';
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  /* ---------------------------------------------------------
     Penyimpanan
     --------------------------------------------------------- */
  var K = {
    spills: 'unlinked.spills',
    polls: 'unlinked.polls',
    profile: 'unlinked.profile',
    wallet: 'unlinked.wallet',
    inventory: 'unlinked.inventory',
    joined: 'unlinked.joined',
    test: 'unlinked.testResult',
    books: 'unlinked.bookmarks',
    applied: 'unlinked.applied',
    moods: 'unlinked.moods',
    avatar: 'unlinked.avatar',
    plus: 'unlinked.plus',
    ads: 'unlinked.ads'
  };

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* mode privat / kuota penuh: fitur tetap jalan tanpa persistensi */
    }
  }

  var DEFAULT_PROFILE = {
    name: 'BudakKantor_' + (Math.floor(Math.random() * 9000) + 1000),
    joinedAt: Date.now()
  };

  function profile() {
    var p = load(K.profile, null);
    if (!p) {
      p = DEFAULT_PROFILE;
      save(K.profile, p);
    }
    return p;
  }

  function avatarState() {
    return load(K.avatar, { character: '🐼', frame: '#f5c542' });
  }

  function isMobile() {
    return window.matchMedia('(max-width: 680px)').matches;
  }

  /* Membership unlinked+ Plus. Aktif jika tanggal berakhirnya masih di depan. */
  function plusState() {
    return load(K.plus, null);
  }

  function plusActive() {
    var p = plusState();
    return !!(p && p.until && p.until > Date.now());
  }

  /**
   * Terapkan efek Plus ke seluruh shell: iklan di feed hilang, badge profil
   * berubah. Dipanggil setiap kali state berubah atau halaman dimuat.
   */
  function applyPlusState() {
    var active = plusActive();
    document.body.classList.toggle('plus-active', active);

    $$('.plus-card').forEach(function (card) {
      var btn = card.querySelector('button');
      if (!btn) return;
      btn.textContent = active ? 'Kelola Langganan →' : 'Langganan Sekarang →';
    });
  }

  function announceInventory() {
    try {
      window.dispatchEvent(new Event('unlinked:inventory'));
    } catch (e) {
      /* browser lawas: badge tetap diperbarui saat halaman dimuat */
    }
  }

  /* ---------------------------------------------------------
     Data awal
     --------------------------------------------------------- */
  var CATEGORIES = [
    'Ditolak HRD', 'Salah Kirim Chat', 'Dimarahi Bos',
    'Bisnis Boncos', 'Salah Jurusan', 'Lainnya'
  ];

  var COMMUNITIES = [
    { id: 'burnout', emoji: '🔥', name: 'Burnout di Kantor', desc: 'Tempat cerita capek yang nggak perlu dijelasin ke HRD.', members: 12480 },
    { id: 'resign', emoji: '🚪', name: 'Resign atau Tahan', desc: 'Bantu mikir sebelum kirim surat pengunduran diri jam 2 pagi.', members: 8932 },
    { id: 'career', emoji: '🔁', name: 'Career Switch', desc: 'Pindah jalur bukan berarti gagal, cuma ganti rute.', members: 6410 },
    { id: 'healing', emoji: '🌱', name: 'Healing Bareng', desc: 'Istirahat itu produktif. Serius.', members: 15720 },
    { id: 'freelance', emoji: '💻', name: 'Freelancer Sejati', desc: 'Revisi ke-17, DP belum masuk, tetap jalan.', members: 5104 },
    { id: 'freshgrad', emoji: '🎓', name: 'Fresh Graduate', desc: 'Apply 47 lamaran, dibalas 3. Kita semua pernah di sini.', members: 11203 }
  ];

  var HOUR = 3600000;

  function seedSpills() {
    return [
      { id: 's1', author: 'BudakKantor_8701', category: 'Ditolak HRD', community: 'freshgrad', createdAt: Date.now() - HOUR * 5, reactions: { pukpuk: 342, ngakak: 271, sama: 375 },
        text: 'Udah 5 tahap interview, presentasi proposal 20 halaman, bikin analisis kompetitor, terus HR-nya bilang "kami akan menghubungi kembali" — itu 3 bulan lalu.' },
      { id: 's2', author: 'BudakKantor_2204', category: 'Salah Kirim Chat', community: 'burnout', createdAt: Date.now() - HOUR * 12, reactions: { pukpuk: 210, ngakak: 640, sama: 118 },
        text: 'Niat mau curhat ke bestie soal bos killer, malah kekirim ke grup "All Staff". Pak Direktur reply dengan 3 kata: "Senin ke HR."' },
      { id: 's3', author: 'BudakKantor_5590', category: 'Bisnis Boncos', community: 'freelance', createdAt: Date.now() - HOUR * 24, reactions: { pukpuk: 402, ngakak: 155, sama: 289 },
        text: 'Klien minta revisi ke-17 jam 23.47: "Bisa ganti semua warnanya jadi lebih hidup?" Tarif saya Rp150rb, sudah termasuk konseling trauma pasca-revisi.' },
      { id: 's4', author: 'BudakKantor_3317', category: 'Salah Jurusan', community: 'career', createdAt: Date.now() - HOUR * 36, reactions: { pukpuk: 288, ngakak: 401, sama: 517 },
        text: 'Kuliah 4 tahun Teknik Kimia, IPK 3.7. Sekarang kerja di pabrik mie instan divisi quality control rasa. Kata orang tua "kan masih nyambung sama kimia".' },
      { id: 's5', author: 'BudakKantor_0294', category: 'Dimarahi Bos', community: 'burnout', createdAt: Date.now() - HOUR * 48, reactions: { pukpuk: 190, ngakak: 233, sama: 344 },
        text: 'Rapat Q3, bos nyela: "Data ini dari mana? Google?" Padahal datanya dari laporan internal yang dia kirim sendiri bulan lalu, halaman 23. Saya tunjukkan. Dia bilang "Meeting dilanjutkan Senin."' },
      { id: 's6', author: 'BudakKantor_1337', category: 'Ditolak HRD', community: 'freshgrad', createdAt: Date.now() - HOUR * 60, reactions: { pukpuk: 512, ngakak: 88, sama: 621 },
        text: 'Apply 47 pekerjaan dalam 3 bulan. Dapat balasan 3. Dipanggil interview 1. Di-ghosting seminggu. Lamaran ke-48 sudah saya kirim.' },
      { id: 's7', author: 'BudakKantor_7291', category: 'Bisnis Boncos', community: 'freelance', createdAt: Date.now() - HOUR * 72, reactions: { pukpuk: 377, ngakak: 121, sama: 405 },
        text: 'Startup saya "hampir" dapat Series A. Investor bilang market timing belum tepat. Sudah kedua kali. Saya masih di sini, kopi tinggal setengah, bakar tabungan sendiri sejak 2022.' },
      { id: 's8', author: 'BudakKantor_4812', category: 'Salah Kirim Chat', community: 'healing', createdAt: Date.now() - HOUR * 84, reactions: { pukpuk: 145, ngakak: 733, sama: 202 },
        text: 'Ngetik nama crush di kolom pencarian grup "Project Tim Alpha". Enter. Semua 23 anggota lihat. Termasuk dia. Termasuk manajernya. Senin rapat, agendanya: "Profesionalisme di Lingkungan Kerja".' }
    ];
  }

  function seedPolls() {
    return [
      { id: 'p1', question: 'Kalau ada tawaran gaji 30% lebih besar tapi bosnya sama toxic-nya, kamu ambil?', createdAt: Date.now() - HOUR * 6, votedOptionId: null, mine: false,
        options: [{ id: 'o1', text: 'Ambil. Dompet dulu, mental belakangan.', votes: 812 }, { id: 'o2', text: 'Tolak. Kesehatan nggak bisa dibeli.', votes: 1204 }, { id: 'o3', text: 'Nego dulu, siapa tahu bosnya bisa diganti.', votes: 388 }] },
      { id: 'p2', question: 'Revisi ke berapa yang bikin kamu paling ingin berhenti jadi freelancer?', createdAt: Date.now() - HOUR * 20, votedOptionId: null, mine: false,
        options: [{ id: 'o1', text: 'Revisi ke-3. Masih kuat.', votes: 402 }, { id: 'o2', text: 'Revisi ke-10. Mulai menyerah.', votes: 655 }, { id: 'o3', text: 'Di atas 15. Aku sudah bukan manusia.', votes: 910 }] },
      { id: 'p3', question: 'Apa alasan paling jujur kamu masih bertahan di kerjaan sekarang?', createdAt: Date.now() - HOUR * 40, votedOptionId: null, mine: false,
        options: [{ id: 'o1', text: 'Butuh uang. Titik.', votes: 1533 }, { id: 'o2', text: 'Takut nggak dapat kerja lain.', votes: 721 }, { id: 'o3', text: 'Masih ada orang baik di tim.', votes: 494 }, { id: 'o4', text: 'Belum sempat mikir, sibuk terus.', votes: 611 }] }
    ];
  }

  var OPPORTUNITIES = [
    { id: 'op1', type: 'Magang', title: 'Intern Content Writer (Remote)', org: 'Karya Nusantara', place: 'Remote', deadline: '30 Nov 2026', desc: 'Nulis 3 artikel/minggu, dibimbing editor senior. Terbuka untuk mahasiswa semester 4+.' },
    { id: 'op2', type: 'Freelance', title: 'Desain Carousel Instagram', org: 'Ruang Belajar', place: 'Remote', deadline: '25 Nov 2026', desc: '10 slide, brief jelas, revisi maksimal 2x. Fee Rp1.500.000 per batch.' },
    { id: 'op3', type: 'Beasiswa', title: 'Beasiswa Bangkit Lanjut Studi', org: 'Yayasan Cahaya', place: 'Bandung', deadline: '15 Des 2026', desc: 'Full tuition + biaya hidup untuk D3/D4 yang sedang cuti karena biaya.' },
    { id: 'op4', type: 'Komunitas', title: 'Open Volunteer: Kelas Menulis Gratis', org: 'Pena Kampung', place: 'Yogyakarta', deadline: 'Open until filled', desc: 'Ngajar 2 jam/minggu. Tidak butuh pengalaman mengajar, butuh niat.' },
    { id: 'op5', type: 'Magang', title: 'Data Analyst Intern', org: 'Toko Sebelah', place: 'Jakarta (Hybrid)', deadline: '5 Des 2026', desc: 'Excel + SQL dasar. Uang saku + makan siang. Boleh belajar sambil jalan.' },
    { id: 'op6', type: 'Freelance', title: 'Admin Sosial Media Part-time', org: 'Kopi Pagi', place: 'Remote', deadline: '28 Nov 2026', desc: '2 jam/hari, 6 hari/minggu. Balas DM dan jadwalkan konten.' },
    { id: 'op7', type: 'Beasiswa', title: 'Micro-scholarship Kursus Bahasa', org: 'Lingua Fund', place: 'Online', deadline: '10 Des 2026', desc: 'Biaya penuh 3 bulan kursus bahasa asing untuk pencari kerja.' },
    { id: 'op8', type: 'Komunitas', title: 'Mentoring Karier 1-on-1', org: 'Sekte Spill', place: 'Online', deadline: 'Rolling', desc: '40 menit bareng praktisi. Gratis untuk anggota komunitas.' },
    { id: 'op9', type: 'Magang', title: 'Social Media Officer', org: 'Yayasan Pulih', place: 'Surabaya', deadline: '20 Des 2026', desc: 'Fokus konten kesehatan mental. Portofolio lebih penting dari IPK.' },
    { id: 'op10', type: 'Freelance', title: 'Translator ID–EN (Proyek Pendek)', org: 'Studio Aksara', place: 'Remote', deadline: '2 Des 2026', desc: '12.000 kata, deadline 2 minggu. Rate Rp120/kata.' }
  ];

  var TEST_QUESTIONS = [
    { q: 'Senin pagi, alarm bunyi. Reaksi pertamamu?', options: [
      { text: 'Bangun. Tidak ada pilihan lain.', trait: 'tahan' },
      { text: 'Rebahan 10 menit sambil mikir hidup.', trait: 'refleksi' },
      { text: 'Langsung buka HP, cek siapa yang butuh sesuatu.', trait: 'sosial' }] },
    { q: 'Atasan mengkritik hasil kerjamu di depan tim.', options: [
      { text: 'Catat, perbaiki, lanjut.', trait: 'tahan' },
      { text: 'Diam, tapi dipikir sampai malam.', trait: 'refleksi' },
      { text: 'Cari teman buat cerita setelah rapat.', trait: 'sosial' }] },
    { q: 'Waktu luang 2 jam tanpa agenda. Kamu...', options: [
      { text: 'Bikin sesuatu: gambar, tulisan, video.', trait: 'kreatif' },
      { text: 'Tidur. Ini investasi.', trait: 'tahan' },
      { text: 'Chat teman, cari kabar.', trait: 'sosial' }] },
    { q: 'Proyek gagal total. Hal pertama yang kamu lakukan?', options: [
      { text: 'Evaluasi: di mana salahnya.', trait: 'refleksi' },
      { text: 'Mulai lagi dari awal, sekarang.', trait: 'tahan' },
      { text: 'Curhat dulu, baru bergerak.', trait: 'sosial' }] },
    { q: 'Kamu ditawari pekerjaan yang belum pernah kamu lakukan.', options: [
      { text: 'Ambil. Belajar sambil jalan.', trait: 'kreatif' },
      { text: 'Riset dulu seminggu.', trait: 'refleksi' },
      { text: 'Tanya orang yang sudah di sana.', trait: 'sosial' }] },
    { q: 'Cara kamu mengisi akhir pekan yang ideal?', options: [
      { text: 'Eksperimen resep / proyek iseng.', trait: 'kreatif' },
      { text: 'Berbaring tanpa rasa bersalah.', trait: 'tahan' },
      { text: 'Kumpul sama orang-orang aman.', trait: 'sosial' }] },
    { q: 'Ketika rencana berubah mendadak, kamu...', options: [
      { text: 'Langsung susun ulang rencananya.', trait: 'kreatif' },
      { text: 'Butuh waktu memproses.', trait: 'refleksi' },
      { text: 'Ikut arus, yang penting bareng.', trait: 'sosial' }] },
    { q: 'Definisi "berhasil" versimu?', options: [
      { text: 'Masih berdiri setelah semua ini.', trait: 'tahan' },
      { text: 'Paham diri sendiri lebih dalam.', trait: 'refleksi' },
      { text: 'Bisa bikin orang lain merasa tidak sendirian.', trait: 'sosial' }] }
  ];

  var ARCHETYPES = {
    tahan: { emoji: '🛡️', name: 'Si Tahan Banting', desc: 'Kamu bukan orang yang tidak pernah jatuh — kamu orang yang selalu berdiri lagi tanpa perlu ditepuk punggungnya dulu. Kekuatanmu tenang dan tidak perlu pengakuan.' },
    refleksi: { emoji: '🪞', name: 'Si Perenung Jauh', desc: 'Kamu memproses dunia dari dalam. Keputusanmu lambat tapi jarang asal. Kadang kamu terlalu keras pada diri sendiri — padahal pemahamanmu soal hidup di atas rata-rata.' },
    kreatif: { emoji: '🎨', name: 'Si Pembuat dari Nol', desc: 'Kamu melihat kemungkinan di tempat orang lain melihat jalan buntu. Tangan dan kepalamu selalu ingin membuat sesuatu. Rutinitas membosankanmu lebih cepat dari apa pun.' },
    sosial: { emoji: '🤝', name: 'Si Penjaga Lingkaran', desc: 'Kamu yang pertama dihubungi saat orang kacau. Empatimu jadi jangkar buat banyak orang. Ingat: kamu juga berhak dicari, bukan cuma mencari.' }
  };

  var STORE_CATALOG = [
    { id: 'kacamata', cat: 'Avatar', emoji: '🕶️', name: 'Kacamata Sultan', price: 5000, desc: 'Tampil seperti bos yang sedang cuti panjang.' },
    { id: 'topi-kardus', cat: 'Avatar', emoji: '📦', name: 'Topi Kardus Premium', price: 7500, desc: 'Untuk yang baru saja di-ghosting HRD.' },
    { id: 'kopi-galon', cat: 'Avatar', emoji: '☕', name: 'Topi Kopi Galon', price: 7500, desc: 'Satu gelas tidak cukup untuk hari Senin.' },
    { id: 'stiker-capek', cat: 'Stiker', emoji: '😩', name: 'Capek Banget!', price: 3000, desc: 'Ekspresi resmi setelah revisi ke-17.' },
    { id: 'stiker-kerja', cat: 'Stiker', emoji: '😤', name: 'Kerja Lagi?', price: 3000, desc: 'Untuk menjawab chat atasan di hari libur.' },
    { id: 'stiker-gas', cat: 'Stiker', emoji: '🚀', name: 'Gas Dikit Lagi!', price: 3000, desc: 'Semangat tipis-tipis, jangan berlebihan.' },
    { id: 'pack-sultan-rebahan', cat: 'Stiker', emoji: '🛋️', name: 'Pack Sultan Rebahan', price: 15000, desc: 'Koleksi ekspresi untuk ahli rebahan.' },
    { id: 'pack-overthinking', cat: 'Stiker', emoji: '🌀', name: 'Pack Overthinking Pro', price: 12000, desc: 'Untuk pikiran yang tidak pernah logout.' },
    { id: 'frame-sultan', cat: 'Frame', emoji: '👑', name: 'Bingkai Sultan', price: 6000, desc: 'Bingkai kuning dengan aura pemilik perusahaan.' },
    { id: 'frame-baja', cat: 'Frame', emoji: '🛡️', name: 'Bingkai Mental Baja', price: 8000, desc: 'Tahan kritik, tahan revisi, tahan Senin.' },
    { id: 'frame-senja', cat: 'Frame', emoji: '🌇', name: 'Bingkai Senja', price: 5000, desc: 'Warna hangat untuk jam pulang kantor.' },
    { id: 'badge-sultan-spill', cat: 'Badge', emoji: '👑', name: 'Lencana Sultan Spill', price: 10000, desc: 'Tanda bahwa kamu raja keluhan sejati.' },
    { id: 'badge-founding', cat: 'Badge', emoji: '🏅', name: 'Lencana Founding Member', price: 10000, desc: 'Kamu salah satu yang pertama di sini.' },
    { id: 'badge-mental-baja', cat: 'Badge', emoji: '🧠', name: 'Lencana Mental Baja', price: 12000, desc: 'Untuk yang tetap waras meski rapat 4 jam.' }
  ];

  var AVATAR_CHOICES = ['🐼', '🧑‍💼', '🧑‍💻', '😮‍💨', '🫠', '🐧', '🦫', '🐢'];
  var FRAME_COLORS = ['#f5c542', '#f57c00', '#172b4d', '#22c55e', '#8b5cf6', '#ef4444'];

  /* ---------------------------------------------------------
     State
     --------------------------------------------------------- */
  var currentView = 'Beranda';
  var activeTimer = null;
  var memeState = { text: '', image: null, template: 'sunset' };
  var testState = { step: 0, answers: [] };
  var storeState = { filter: 'Semua', expanded: false };

  /* ---------------------------------------------------------
     Router
     --------------------------------------------------------- */
  function open(label) {
    var view = VIEW_MAP[label];
    if (!view) return false;

    if (activeTimer) {
      clearInterval(activeTimer);
      activeTimer = null;
    }

    currentView = label;

    // Beranda di layar kecil menampilkan feed aplikasi (sesuai desain mobile),
    // sedangkan di desktop tetap menampilkan halaman landing.
    var useLanding = view.home && !(view.render && isMobile());

    if (useLanding) {
      showHome();
      if (view.after) view.after();
      return true;
    }

    var host = $('#view-feature');
    if (!host) return false;

    var home = $('#view-home');
    if (home) home.hidden = true;
    host.hidden = false;
    host.innerHTML = '';

    view.render(host);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  }

  function showHome() {
    var home = $('#view-home');
    var feature = $('#view-feature');
    if (home) home.hidden = false;
    if (feature) {
      feature.hidden = true;
      feature.innerHTML = '';
    }
  }

  function setActive(label) {
    var resolve = window.getNavLabel || function (el) { return (el.textContent || '').trim(); };

    $$('.nav-item').forEach(function (item) {
      item.classList.toggle('active', resolve(item) === label);
    });

    var alias = { Toko: 'Store' };
    $$('.personal-nav-item').forEach(function (item) {
      var l = resolve(item);
      item.classList.toggle('active', (alias[l] || l) === label);
    });

    var mobileAlias = { Toko: 'Store', Avatar: 'Avatar' };
    $$('.mobile-nav button').forEach(function (btn) {
      var small = btn.querySelector('small');
      var l = small ? small.textContent.trim() : '';
      btn.classList.toggle('selected', (mobileAlias[l] || l) === label);
    });
  }

  /* ---------------------------------------------------------
     Komponen bersama
     --------------------------------------------------------- */
  function head(eyebrow, title, subtitle, actions) {
    return '' +
      '<div class="fv-head">' +
        '<div>' +
          '<div class="fv-eyebrow">' + esc(eyebrow) + '</div>' +
          '<h2 class="fv-title">' + esc(title) + '</h2>' +
          '<p class="fv-sub">' + esc(subtitle) + '</p>' +
        '</div>' +
        (actions ? '<div class="fv-head-actions">' + actions + '</div>' : '') +
      '</div>';
  }

  function toast(message) {
    if (typeof window.showNotification === 'function') {
      window.showNotification(message);
      return;
    }
    if (typeof window.showToast === 'function') {
      window.showToast(message);
    }
  }

  function mySpills() {
    return load(K.spills, null) || seedSpills();
  }

  function allSpills() {
    var stored = load(K.spills, null);
    if (!stored) {
      stored = seedSpills();
      save(K.spills, stored);
    }
    return stored;
  }

  function totalReactions(spill) {
    var r = spill.reactions || {};
    return (r.pukpuk || 0) + (r.ngakak || 0) + (r.sama || 0);
  }

  function levelFromXp(xp) {
    var levels = [
      { min: 0, name: 'Rapuh', color: '#9ca3af' },
      { min: 100, name: 'Bertahan', color: '#3b82f6' },
      { min: 400, name: 'Waras', color: '#22c55e' },
      { min: 900, name: 'Tangguh', color: '#f59e0b' },
      { min: 1600, name: 'Legenda Spill', color: '#8b5cf6' }
    ];
    var current = levels[0];
    levels.forEach(function (l) { if (xp >= l.min) current = l; });
    return current;
  }

  function communityById(id) {
    for (var i = 0; i < COMMUNITIES.length; i++) {
      if (COMMUNITIES[i].id === id) return COMMUNITIES[i];
    }
    return null;
  }

  /* ---------------------------------------------------------
     Beranda mobile: feed aplikasi
     --------------------------------------------------------- */
  function feedLevel(spill) {
    return 1 + Math.min(4, Math.floor(totalReactions(spill) / 160));
  }

  function toggleReaction(spillId, key) {
    var spills = allSpills();
    var result = null;

    for (var i = 0; i < spills.length; i++) {
      if (spills[i].id !== spillId) continue;

      var mine = spills[i].myReactions || {};
      if (mine[key]) {
        spills[i].reactions[key] = Math.max(0, (spills[i].reactions[key] || 0) - 1);
        mine[key] = false;
      } else {
        spills[i].reactions[key] = (spills[i].reactions[key] || 0) + 1;
        mine[key] = true;
      }
      spills[i].myReactions = mine;
      result = { count: spills[i].reactions[key], active: mine[key] };
      break;
    }

    save(K.spills, spills);
    return result;
  }

  function avatarMarkup() {
    var av = avatarState();
    return '<div class="fv-avatar" style="border-color:' + esc(av.frame) + '">' + esc(av.character) + '</div>';
  }

  function renderFeed(host) {
    host.innerHTML =
      '<form class="fv-composer" id="fd-composer">' +
        avatarMarkup() +
        '<input id="fd-input" class="fv-input" type="text" maxlength="280" ' +
          'placeholder="Apa cerita spill kamu hari ini?" autocomplete="off" />' +
        '<button class="fv-btn primary" type="submit">Spill It!</button>' +
      '</form>' +
      '<div class="fv-feed-list" id="fd-list"></div>';

    var form = $('#fd-composer', host);
    var input = $('#fd-input', host);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = input.value.trim();
      if (value.length < 5) {
        toast('Tulis minimal 5 karakter.');
        return;
      }

      var spills = allSpills();
      spills.unshift({
        id: uid(),
        author: profile().name,
        category: 'Lainnya',
        community: null,
        text: value,
        createdAt: Date.now(),
        reactions: { pukpuk: 0, ngakak: 0, sama: 0 },
        mine: true
      });
      save(K.spills, spills);
      input.value = '';
      toast('Spill terkirim ke Beranda, Discover, dan Profil.');
      paintFeed(host);
    });

    paintFeed(host);
  }

  function paintFeed(host) {
    var list = $('#fd-list', host);
    if (!list) return;

    var spills = allSpills().slice().sort(function (a, b) {
      return b.createdAt - a.createdAt;
    }).slice(0, 8);

    var html = spills.map(function (s) {
      var mine = s.myReactions || {};
      var c = communityById(s.community);
      return '<article class="fv-feed-post" data-id="' + esc(s.id) + '">' +
        '<div class="fv-post-top">' +
          '<div class="fv-avatar">' + esc(avatarState().character) + '</div>' +
          '<div>' +
            '<b>' + esc(s.author) + '</b>' +
            '<div class="fv-muted">Lv. ' + feedLevel(s) + ' · ' + esc(relativeTime(s.createdAt)) +
              (c ? ' · ' + c.emoji + ' ' + esc(c.name) : '') + '</div>' +
          '</div>' +
          '<button class="fv-icon-btn" data-more="' + esc(s.id) + '" aria-label="Opsi">•••</button>' +
        '</div>' +
        '<p class="fv-post-text">' + esc(s.text) + '</p>' +
        '<div class="fv-reactions">' +
          '<button class="fv-reaction' + (mine.pukpuk ? ' active' : '') + '" data-id="' + esc(s.id) + '" data-r="pukpuk">🫂 Puk-Puk <b>(' + (s.reactions.pukpuk || 0) + ')</b></button>' +
          '<button class="fv-reaction' + (mine.ngakak ? ' active' : '') + '" data-id="' + esc(s.id) + '" data-r="ngakak">😂 Ngakak <b>(' + (s.reactions.ngakak || 0) + ')</b></button>' +
          '<button class="fv-reaction' + (mine.sama ? ' active' : '') + '" data-id="' + esc(s.id) + '" data-r="sama">🤝 Sama Banget <b>(' + (s.reactions.sama || 0) + ')</b></button>' +
        '</div>' +
      '</article>';
    }).join('');

    if (!plusActive()) {
      html += '<div class="fv-feed-ad">' +
        '<div class="fv-ad-top">' +
          '<span class="fv-ad-avatar">🎓</span>' +
          '<div><b>SkillHub Indonesia</b><div class="fv-muted">Sponsored · 2 jam lalu</div></div>' +
          '<span class="fv-badge">Iklan</span>' +
        '</div>' +
        '<div class="fv-ad-body">' +
          '<div>' +
            '<b>Skill Baru Untuk Karier Lebih Baik</b>' +
            '<p class="fv-muted">Upgrade skill, jangan cuma upgrade emosi. Kelas online mulai Rp49rb.</p>' +
            '<button class="fv-btn primary" id="fd-ad-cta">Pelajari Sekarang →</button>' +
          '</div>' +
          '<div class="fv-ad-art">🎓</div>' +
        '</div>' +
        '<button class="fv-ad-manage" id="fd-ad-manage">Kelola iklan di Dashboard Iklan →</button>' +
      '</div>';
    }

    list.innerHTML = html;

    $$('.fv-reaction', list).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var res = toggleReaction(btn.getAttribute('data-id'), btn.getAttribute('data-r'));
        if (!res) return;
        btn.classList.toggle('active', res.active);
        var b = btn.querySelector('b');
        if (b) b.textContent = '(' + res.count + ')';
      });
    });

    $$('[data-more]', list).forEach(function (btn) {
      btn.addEventListener('click', function () {
        toast('Opsi postingan belum tersedia di demo.');
      });
    });

    var adCta = $('#fd-ad-cta', list);
    if (adCta) {
      adCta.addEventListener('click', function () {
        toast('Demo: halaman kursus tidak tersedia.');
      });
    }

    var adManage = $('#fd-ad-manage', list);
    if (adManage) {
      adManage.addEventListener('click', function () {
        setActive('Dashboard Iklan');
        open('Dashboard Iklan');
      });
    }
  }

  /* ---------------------------------------------------------
     Discover
     --------------------------------------------------------- */
  var discoverState = { q: '', category: 'Semua', sort: 'terbaru', community: null };

  function renderDiscover(host) {
    var cats = ['Semua'].concat(CATEGORIES);

    host.innerHTML = head(
      'JELAJAHI TANPA ALGORITMA PENASARAN',
      'Discover',
      'Cari cerita berdasarkan suasana hati, bukan berdasarkan jumlah pengikut.',
      '<button class="fv-btn ghost" id="dv-reset">Reset filter</button>'
    ) +
      '<div class="fv-card" style="margin-bottom:16px">' +
        '<input id="dv-search" class="fv-input" type="search" placeholder="Cari cerita, nama, atau kata kunci..." value="' + esc(discoverState.q) + '" />' +
        '<div class="fv-chips" id="dv-cats" style="margin-top:12px">' +
          cats.map(function (c) {
            return '<button class="fv-chip' + (discoverState.category === c ? ' active' : '') + '" data-cat="' + esc(c) + '">' +
              (c === 'Semua' ? 'Semua' : esc(c)) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="fv-row" style="margin-top:12px;justify-content:space-between">' +
          '<span class="fv-muted" id="dv-count"></span>' +
          '<select id="dv-sort" class="fv-select" style="max-width:180px">' +
            '<option value="terbaru"' + (discoverState.sort === 'terbaru' ? ' selected' : '') + '>Terbaru</option>' +
            '<option value="respons"' + (discoverState.sort === 'respons' ? ' selected' : '') + '>Paling banyak respons</option>' +
            '<option value="lama"' + (discoverState.sort === 'lama' ? ' selected' : '') + '>Terlama</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div id="dv-list" class="fv-list"></div>';

    var search = $('#dv-search', host);
    search.addEventListener('input', function () {
      discoverState.q = search.value;
      paintList(host);
    });

    $$('#dv-cats .fv-chip', host).forEach(function (chip) {
      chip.addEventListener('click', function () {
        discoverState.category = chip.getAttribute('data-cat');
        $$('#dv-cats .fv-chip', host).forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        paintList(host);
      });
    });

    $('#dv-sort', host).addEventListener('change', function () {
      discoverState.sort = this.value;
      paintList(host);
    });

    $('#dv-reset', host).addEventListener('click', function () {
      discoverState = { q: '', category: 'Semua', sort: 'terbaru', community: null };
      renderDiscover(host);
    });

    paintList(host);
  }

  function paintList(host) {
    var list = $('#dv-list', host);
    if (!list) return;

    var items = allSpills().slice();
    var q = discoverState.q.trim().toLowerCase();

    items = items.filter(function (s) {
      if (discoverState.category !== 'Semua' && s.category !== discoverState.category) return false;
      if (discoverState.community && s.community !== discoverState.community) return false;
      if (q) {
        var hay = (s.text + ' ' + s.author + ' ' + s.category).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    items.sort(function (a, b) {
      if (discoverState.sort === 'respons') return totalReactions(b) - totalReactions(a);
      if (discoverState.sort === 'lama') return a.createdAt - b.createdAt;
      return b.createdAt - a.createdAt;
    });

    var count = $('#dv-count', host);
    if (count) {
      count.textContent = items.length + ' cerita' +
        (discoverState.community ? ' · filter komunitas aktif' : '');
    }

    if (!items.length) {
      list.innerHTML = '<div class="fv-empty">Belum ada cerita yang cocok. Coba kata kunci lain, atau tulis sendiri lewat menu Spill.</div>';
      return;
    }

    var books = load(K.books, []);
    list.innerHTML = items.map(function (s) {
      var c = communityById(s.community);
      var bookmarked = books.indexOf(s.id) !== -1;
      return '<article class="fv-post" data-id="' + esc(s.id) + '">' +
        '<div class="fv-post-top">' +
          '<div class="fv-avatar">' + esc(avatarState().character) + '</div>' +
          '<div>' +
            '<b>' + esc(s.author) + '</b>' +
            '<div class="fv-muted">' + esc(s.category) + ' · ' + esc(relativeTime(s.createdAt)) +
              (c ? ' · ' + c.emoji + ' ' + esc(c.name) : '') + '</div>' +
          '</div>' +
          '<button class="fv-icon-btn dv-bookmark' + (bookmarked ? ' active' : '') + '" data-id="' + esc(s.id) + '" title="Simpan">' +
            (bookmarked ? '★' : '☆') +
          '</button>' +
        '</div>' +
        '<p class="fv-post-text">' + esc(s.text) + '</p>' +
        '<div class="fv-reactions">' +
          '<button class="fv-reaction" data-id="' + esc(s.id) + '" data-r="pukpuk">🫂 Puk-Puk <b>' + (s.reactions.pukpuk || 0) + '</b></button>' +
          '<button class="fv-reaction" data-id="' + esc(s.id) + '" data-r="ngakak">😂 Ngakak <b>' + (s.reactions.ngakak || 0) + '</b></button>' +
          '<button class="fv-reaction" data-id="' + esc(s.id) + '" data-r="sama">🤝 Sama Banget <b>' + (s.reactions.sama || 0) + '</b></button>' +
        '</div>' +
      '</article>';
    }).join('');

    $$('.dv-bookmark', list).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var b = load(K.books, []);
        var idx = b.indexOf(id);
        if (idx === -1) {
          b.push(id);
          btn.textContent = '★';
          btn.classList.add('active');
          toast('Cerita disimpan.');
        } else {
          b.splice(idx, 1);
          btn.textContent = '☆';
          btn.classList.remove('active');
          toast('Cerita dihapus dari simpanan.');
        }
        save(K.books, b);
      });
    });

    $$('.fv-reaction', list).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var r = btn.getAttribute('data-r');
        var spills = allSpills();
        for (var i = 0; i < spills.length; i++) {
          if (spills[i].id === id) {
            var mine = spills[i].myReactions || {};
            if (mine[r]) {
              spills[i].reactions[r] = Math.max(0, (spills[i].reactions[r] || 0) - 1);
              mine[r] = false;
              btn.classList.remove('active');
            } else {
              spills[i].reactions[r] = (spills[i].reactions[r] || 0) + 1;
              mine[r] = true;
              btn.classList.add('active');
            }
            spills[i].myReactions = mine;
            btn.querySelector('b').textContent = spills[i].reactions[r];
            break;
          }
        }
        save(K.spills, spills);
      });
    });
  }

  /* ---------------------------------------------------------
     Komunitas
     --------------------------------------------------------- */
  function renderKomunitas(host) {
    var joined = load(K.joined, ['burnout']);
    var spills = allSpills();

    host.innerHTML = head(
      'RUANG YANG TIDAK MENILAI',
      'Komunitas',
      'Pilih satu atau dua. Kamu tidak harus aktif di semuanya.',
      ''
    ) +
      '<div class="fv-grid two">' +
        COMMUNITIES.map(function (c) {
          var isJoined = joined.indexOf(c.id) !== -1;
          var count = spills.filter(function (s) { return s.community === c.id; }).length;
          return '<div class="fv-card">' +
            '<div class="fv-community-top">' +
              '<span class="fv-community-emoji">' + c.emoji + '</span>' +
              '<div>' +
                '<b>' + esc(c.name) + '</b>' +
                '<div class="fv-muted">' + c.members.toLocaleString('id-ID') + ' anggota · ' + count + ' cerita di sini</div>' +
              '</div>' +
            '</div>' +
            '<p class="fv-text">' + esc(c.desc) + '</p>' +
            '<div class="fv-row">' +
              '<button class="fv-btn ' + (isJoined ? 'ghost' : 'primary') + ' km-join" data-id="' + c.id + '">' +
                (isJoined ? 'Keluar' : 'Gabung') +
              '</button>' +
              '<button class="fv-btn ghost km-view" data-id="' + c.id + '">Lihat cerita</button>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>';

    $$('.km-join', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var list = load(K.joined, ['burnout']);
        var idx = list.indexOf(id);
        if (idx === -1) {
          list.push(id);
          toast('Kamu bergabung dengan ' + (communityById(id) || {}).name + '.');
        } else {
          list.splice(idx, 1);
          toast('Kamu keluar dari komunitas.');
        }
        save(K.joined, list);
        renderKomunitas(host);
      });
    });

    $$('.km-view', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        discoverState = { q: '', category: 'Semua', sort: 'terbaru', community: btn.getAttribute('data-id') };
        setActive('Discover');
        view('Discover', host);
      });
    });
  }

  function view(label, host) {
    var v = VIEW_MAP[label];
    if (v && v.render) v.render(host);
  }

  /* ---------------------------------------------------------
     Profil
     --------------------------------------------------------- */
  function renderProfil(host) {
    var p = profile();
    var av = avatarState();
    var spills = allSpills();
    var mine = spills.filter(function (s) { return s.mine; });
    var xp = mine.reduce(function (sum, s) { return sum + 10 + totalReactions(s); }, 0);
    var lvl = levelFromXp(xp);
    var received = mine.reduce(function (sum, s) { return sum + totalReactions(s); }, 0);

    host.innerHTML = head(
      'TANPA JABATAN DI BELAKANG NAMA',
      'Profil',
      'Identitas di sini cuma nama samaran dan cerita yang kamu pilih untuk dibagi.',
      ''
    ) +
      '<div class="fv-card fv-profile">' +
        '<div class="fv-avatar big" style="border-color:' + esc(av.frame) + '">' + esc(av.character) + '</div>' +
        '<div style="flex:1;min-width:200px">' +
          '<div class="fv-row" style="margin-bottom:6px">' +
            '<input id="pf-name" class="fv-input" value="' + esc(p.name) + '" maxlength="24" style="max-width:240px" />' +
            '<button id="pf-save" class="fv-btn primary">Simpan</button>' +
          '</div>' +
          '<div class="fv-muted">Bergabung ' + esc(relativeTime(p.joinedAt)) + '</div>' +
          '<div class="fv-row" style="margin-top:10px">' +
            '<span class="fv-badge" style="background:' + lvl.color + '22;color:' + lvl.color + '">' + esc(lvl.name) + '</span>' +
            '<span class="fv-muted">' + xp + ' XP</span>' +
            (plusActive() ? '<span class="fv-badge fv-plus-badge">👑 Mental Baja+</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="fv-grid three" style="margin-top:16px">' +
        '<div class="fv-card fv-stat"><strong>' + mine.length + '</strong><small>Spill kamu</small></div>' +
        '<div class="fv-card fv-stat"><strong>' + received + '</strong><small>Respons diterima</small></div>' +
        '<div class="fv-card fv-stat"><strong>' + load(K.books, []).length + '</strong><small>Cerita disimpan</small></div>' +
      '</div>' +
      '<h3 class="fv-h3">Cerita yang pernah kamu lepas</h3>' +
      '<div class="fv-list" id="pf-list">' +
        (mine.length
          ? mine.map(function (s) {
              return '<article class="fv-post">' +
                '<div class="fv-post-top"><div>' +
                  '<b>' + esc(profile().name) + '</b>' +
                  '<div class="fv-muted">' + esc(s.category) + ' · ' + esc(relativeTime(s.createdAt)) + '</div>' +
                '</div></div>' +
                '<p class="fv-post-text">' + esc(s.text) + '</p>' +
                '<div class="fv-reactions"><span class="fv-muted">🫂 ' + (s.reactions.pukpuk || 0) +
                  ' · 😂 ' + (s.reactions.ngakak || 0) + ' · 🤝 ' + (s.reactions.sama || 0) + '</span></div>' +
              '</article>';
            }).join('')
          : '<div class="fv-empty">Belum ada spill. Mulai dari menu Spill — tidak harus cerita hebat.</div>') +
      '</div>' +
      '<div class="fv-row" style="margin-top:20px">' +
        '<button id="pf-reset" class="fv-btn ghost">Reset data lokal</button>' +
      '</div>';

    $('#pf-save', host).addEventListener('click', function () {
      var name = $('#pf-name', host).value.trim();
      if (name.length < 3) { toast('Nama minimal 3 karakter.'); return; }
      p.name = name;
      save(K.profile, p);
      toast('Profil tersimpan.');
      renderProfil(host);
    });

    $('#pf-reset', host).addEventListener('click', function () {
      if (!window.confirm('Hapus semua data lokal (spill, poll, riwayat)? Tindakan ini tidak bisa dibatalkan.')) return;
      Object.keys(K).forEach(function (k) { localStorage.removeItem(K[k]); });
      toast('Data lokal dihapus.');
      renderProfil(host);
    });
  }

  /* ---------------------------------------------------------
     Poll
     --------------------------------------------------------- */
  function renderPoll(host) {
    var polls = load(K.polls, null);
    if (!polls) { polls = seedPolls(); save(K.polls, polls); }

    host.innerHTML = head(
      'SUARA JUJUR, BUKAN SUARA POPULER',
      'Poll',
      'Satu orang satu suara. Tidak ada yang tahu kamu memilih apa.',
      '<button class="fv-btn primary" id="pl-new">Buat poll</button>'
    ) +
      '<div id="pl-new-form" hidden class="fv-card" style="margin-bottom:16px">' +
        '<label class="fv-label">Pertanyaan</label>' +
        '<input id="pl-q" class="fv-input" maxlength="140" placeholder="Contoh: Kamu lebih takut di-ghosting HRD atau di-ghosting gebetan?" />' +
        '<label class="fv-label" style="margin-top:12px">Pilihan (minimal 2)</label>' +
        '<input class="fv-input pl-opt" placeholder="Pilihan 1" />' +
        '<input class="fv-input pl-opt" placeholder="Pilihan 2" style="margin-top:8px" />' +
        '<input class="fv-input pl-opt" placeholder="Pilihan 3 (opsional)" style="margin-top:8px" />' +
        '<div class="fv-row" style="margin-top:14px">' +
          '<button class="fv-btn primary" id="pl-create">Publikasikan</button>' +
          '<button class="fv-btn ghost" id="pl-cancel">Batal</button>' +
        '</div>' +
      '</div>' +
      '<div class="fv-list" id="pl-list"></div>';

    $('#pl-new', host).addEventListener('click', function () {
      $('#pl-new-form', host).hidden = false;
    });
    $('#pl-cancel', host).addEventListener('click', function () {
      $('#pl-new-form', host).hidden = true;
    });

    $('#pl-create', host).addEventListener('click', function () {
      var q = $('#pl-q', host).value.trim();
      var opts = $$('.pl-opt', host)
        .map(function (i) { return i.value.trim(); })
        .filter(function (v) { return v.length > 0; });

      if (q.length < 8) { toast('Pertanyaan minimal 8 karakter.'); return; }
      if (opts.length < 2) { toast('Isi minimal 2 pilihan.'); return; }

      polls.unshift({
        id: uid(),
        question: q,
        createdAt: Date.now(),
        votedOptionId: null,
        mine: true,
        options: opts.map(function (t, i) { return { id: 'o' + i, text: t, votes: 0 }; })
      });
      save(K.polls, polls);
      toast('Poll dipublikasikan.');
      renderPoll(host);
    });

    paintPolls(host, polls);
  }

  function paintPolls(host, polls) {
    var list = $('#pl-list', host);
    if (!polls.length) {
      list.innerHTML = '<div class="fv-empty">Belum ada poll.</div>';
      return;
    }

    list.innerHTML = polls.map(function (poll) {
      var total = poll.options.reduce(function (s, o) { return s + o.votes; }, 0);
      var voted = !!poll.votedOptionId;

      return '<div class="fv-card fv-poll" data-id="' + esc(poll.id) + '">' +
        '<div class="fv-poll-q">' + esc(poll.question) + '</div>' +
        '<div class="fv-muted" style="margin-bottom:10px">' + total + ' suara · ' + esc(relativeTime(poll.createdAt)) +
          (poll.mine ? ' · poll kamu' : '') + '</div>' +
        poll.options.map(function (o) {
          var pct = total ? Math.round((o.votes / total) * 100) : 0;
          var chosen = poll.votedOptionId === o.id;
          return '<button class="fv-poll-opt' + (chosen ? ' chosen' : '') + '" data-poll="' + esc(poll.id) + '" data-opt="' + esc(o.id) + '"' +
            (voted ? ' disabled' : '') + '>' +
            '<span class="fv-poll-opt-text">' + (chosen ? '✓ ' : '') + esc(o.text) + '</span>' +
            (voted ? '<span class="fv-poll-pct">' + pct + '%</span>' : '') +
            '<span class="fv-bar"><i style="width:' + (voted ? pct : 0) + '%"></i></span>' +
          '</button>';
        }).join('') +
        '<div class="fv-muted" style="margin-top:8px">' +
          (voted ? 'Kamu sudah memilih. Hasil diperbarui otomatis.' : 'Pilih salah satu untuk melihat hasil.') +
        '</div>' +
      '</div>';
    }).join('');

    $$('.fv-poll-opt', list).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        var pid = btn.getAttribute('data-poll');
        var oid = btn.getAttribute('data-opt');

        for (var i = 0; i < polls.length; i++) {
          if (polls[i].id === pid) {
            if (polls[i].votedOptionId) return;
            polls[i].votedOptionId = oid;
            for (var j = 0; j < polls[i].options.length; j++) {
              if (polls[i].options[j].id === oid) {
                polls[i].options[j].votes += 1;
                break;
              }
            }
            break;
          }
        }
        save(K.polls, polls);
        toast('Suara tercatat. Terima kasih sudah jujur.');
        paintPolls(host, polls);
      });
    });
  }

  /* ---------------------------------------------------------
     Personality Test
     --------------------------------------------------------- */
  function renderTest(host) {
    var saved = load(K.test, null);

    if (saved && !testState.started) {
      host.innerHTML = head('BUKAN MBTI, BUKAN DIAGNOSIS', 'Personality Test', 'Delapan pertanyaan untuk melihat cara kamu bertahan. Bukan label permanen.', '') +
        resultCard(saved) +
        '<div class="fv-row" style="margin-top:16px">' +
          '<button id="ts-retry" class="fv-btn primary">Ulangi tes</button>' +
        '</div>';
      $('#ts-retry', host).addEventListener('click', function () {
        testState = { step: 0, answers: [], started: true };
        renderTest(host);
      });
      return;
    }

    if (!testState.started) {
      testState.started = true;
      testState.step = 0;
      testState.answers = [];
    }

    if (testState.step >= TEST_QUESTIONS.length) {
      var result = computeResult(testState.answers);
      save(K.test, result);
      testState.started = false;
      host.innerHTML = head('HASIL KAMU', 'Personality Test', 'Ini cermin, bukan vonis.', '') +
        resultCard(result) +
        '<div class="fv-row" style="margin-top:16px">' +
          '<button id="ts-retry" class="fv-btn primary">Ulangi tes</button>' +
          '<button id="ts-copy" class="fv-btn ghost">Salin hasil</button>' +
        '</div>';
      $('#ts-retry', host).addEventListener('click', function () {
        testState = { step: 0, answers: [], started: true };
        renderTest(host);
      });
      $('#ts-copy', host).addEventListener('click', function () {
        var text = 'Aku ' + result.emoji + ' ' + result.name + ' di unlinked+ — ' + result.desc;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(function () { toast('Hasil disalin.'); });
        } else {
          toast('Browser ini tidak mendukung penyalinan otomatis.');
        }
      });
      return;
    }

    var q = TEST_QUESTIONS[testState.step];
    var progress = Math.round((testState.step / TEST_QUESTIONS.length) * 100);

    host.innerHTML = head('BUKAN MBTI, BUKAN DIAGNOSIS', 'Personality Test',
      'Pertanyaan ' + (testState.step + 1) + ' dari ' + TEST_QUESTIONS.length, '') +
      '<div class="fv-bar" style="margin-bottom:18px"><i style="width:' + progress + '%"></i></div>' +
      '<div class="fv-card">' +
        '<div class="fv-quiz-q">' + esc(q.q) + '</div>' +
        '<div class="fv-list" style="margin-top:14px">' +
          q.options.map(function (o, i) {
            return '<button class="fv-quiz-opt" data-i="' + i + '">' + esc(o.text) + '</button>';
          }).join('') +
        '</div>' +
      '</div>';

    $$('.fv-quiz-opt', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.getAttribute('data-i'));
        testState.answers.push(q.options[idx].trait);
        testState.step += 1;
        renderTest(host);
      });
    });
  }

  function computeResult(answers) {
    var tally = { tahan: 0, refleksi: 0, kreatif: 0, sosial: 0 };
    answers.forEach(function (t) { tally[t] = (tally[t] || 0) + 1; });

    var winner = 'tahan';
    Object.keys(tally).forEach(function (k) {
      if (tally[k] > tally[winner]) winner = k;
    });

    var total = answers.length || 1;
    var arch = ARCHETYPES[winner];

    return {
      trait: winner,
      emoji: arch.emoji,
      name: arch.name,
      desc: arch.desc,
      tally: tally,
      total: total,
      at: Date.now()
    };
  }

  function resultCard(result) {
    var labels = { tahan: 'Tahan Banting', refleksi: 'Reflektif', kreatif: 'Kreatif', sosial: 'Sosial' };
    return '<div class="fv-card fv-result">' +
      '<div class="fv-result-emoji">' + result.emoji + '</div>' +
      '<div class="fv-result-name">' + esc(result.name) + '</div>' +
      '<p class="fv-text">' + esc(result.desc) + '</p>' +
      '<div class="fv-list" style="margin-top:18px">' +
        Object.keys(labels).map(function (k) {
          var pct = Math.round(((result.tally[k] || 0) / result.total) * 100);
          return '<div>' +
            '<div class="fv-row" style="justify-content:space-between">' +
              '<span class="fv-muted">' + labels[k] + '</span>' +
              '<span class="fv-muted">' + pct + '%</span>' +
            '</div>' +
            '<div class="fv-bar"><i style="width:' + pct + '%"></i></div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  /* ---------------------------------------------------------
     Meme Studio
     --------------------------------------------------------- */
  function renderMeme(host) {
    host.innerHTML = head(
      'BIKIN BAHAN TERTAWA, BUKAN BAHAN STRES',
      'Meme Studio',
      'Tulis caption, pilih latar, unduh PNG. Semua diproses di browser — tidak ada yang diunggah.',
      ''
    ) +
      '<div class="fv-grid two">' +
        '<div class="fv-card">' +
          '<canvas id="meme-canvas" width="600" height="600" class="fv-canvas"></canvas>' +
          '<div class="fv-row" style="margin-top:12px">' +
            '<button id="mm-download" class="fv-btn primary">Unduh PNG</button>' +
            '<button id="mm-random" class="fv-btn ghost">Caption acak</button>' +
          '</div>' +
        '</div>' +
        '<div class="fv-card">' +
          '<label class="fv-label">Teks atas</label>' +
          '<input id="mm-top" class="fv-input" maxlength="40" placeholder="KETIKA KAMU..." />' +
          '<label class="fv-label" style="margin-top:12px">Teks bawah</label>' +
          '<input id="mm-bottom" class="fv-input" maxlength="40" placeholder="...TAPI TETAP MASUK KERJA" />' +
          '<label class="fv-label" style="margin-top:12px">Latar</label>' +
          '<div class="fv-row" id="mm-templates">' +
            ['sunset', 'navy', 'cream', 'mint', 'ungu'].map(function (t) {
              return '<button class="fv-swatch ' + t + '" data-t="' + t + '" title="' + t + '"></button>';
            }).join('') +
          '</div>' +
          '<label class="fv-label" style="margin-top:12px">Atau pakai gambar sendiri</label>' +
          '<input id="mm-file" type="file" accept="image/*" class="fv-input" />' +
          '<p class="fv-muted" style="margin-top:14px">Meme tidak disimpan ke server. Kalau mau simpan, unduh PNG-nya.</p>' +
        '</div>' +
      '</div>';

    memeState = { top: '', bottom: '', template: 'sunset', image: null };
    drawMeme(host);

    ['mm-top', 'mm-bottom'].forEach(function (id) {
      $('#' + id, host).addEventListener('input', function () {
        memeState[id === 'mm-top' ? 'top' : 'bottom'] = this.value;
        drawMeme(host);
      });
    });

    $$('#mm-templates .fv-swatch', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        memeState.template = btn.getAttribute('data-t');
        memeState.image = null;
        drawMeme(host);
      });
    });

    $('#mm-file', host).addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          memeState.image = img;
          drawMeme(host);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

    $('#mm-random', host).addEventListener('click', function () {
      var pool = [
        ['KETIKA KAMU', 'TETAP DIREVISI SAMPAI SUBUH'],
        ['ATASAN:', 'KITA BUTUH INI KEMARIN'],
        ['AKU: SUDAH SLEEP', 'PIKIRAN: INGAT SLA KE-14 TAHUN 2023'],
        ['HARI SENIN', 'DATANG LAGI TANPA UNDANGAN'],
        ['GAPAPA GAGAL', 'YANG PENTING MASIH BAYAR KOS'],
        ['LOWONGAN: FRESH GRADUATE', 'SYARAT: 5 TAHUN PENGALAMAN']
      ];
      var pick = pool[Math.floor(Math.random() * pool.length)];
      memeState.top = pick[0];
      memeState.bottom = pick[1];
      $('#mm-top', host).value = pick[0];
      $('#mm-bottom', host).value = pick[1];
      drawMeme(host);
    });

    $('#mm-download', host).addEventListener('click', function () {
      var canvas = $('#meme-canvas', host);
      var link = document.createElement('a');
      link.download = 'unlinked-meme-' + Date.now() + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast('Meme diunduh.');
    });
  }

  function drawMeme(host) {
    var canvas = $('#meme-canvas', host);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (memeState.image) {
      var img = memeState.image;
      var scale = Math.max(w / img.width, h / img.height);
      var dw = img.width * scale;
      var dh = img.height * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, w, h);
    } else {
      var grad = ctx.createLinearGradient(0, 0, w, h);
      var palette = {
        sunset: ['#ffd166', '#f57c00'],
        navy: ['#172b4d', '#2d4080'],
        cream: ['#fff8e7', '#ffe9a0'],
        mint: ['#a7f3d0', '#22c55e'],
        ungu: ['#c4b5fd', '#6d28d9']
      }[memeState.template] || ['#ffd166', '#f57c00'];
      grad.addColorStop(0, palette[0]);
      grad.addColorStop(1, palette[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.font = '150px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.25;
      ctx.fillText('💔', w / 2, h / 2);
      ctx.globalAlpha = 1;
    }

    function caption(text, y, baseline) {
      if (!text) return;
      ctx.font = '800 44px Nunito, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = baseline;
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(text.toUpperCase(), w / 2, y, w - 40);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text.toUpperCase(), w / 2, y, w - 40);
    }

    caption(memeState.top, 60, 'top');
    caption(memeState.bottom, h - 40, 'bottom');
  }

  /* ---------------------------------------------------------
     Store
     --------------------------------------------------------- */
  var STORE_GROUPS = [
    { cat: 'Avatar', title: 'Avatar Item', note: 'Ganti tampilan, bukan jati diri.' },
    { cat: 'Stiker', title: 'Stiker Ekspresi', note: 'Biar chat tidak terasa seperti email kantor.' },
    { cat: 'Frame', title: 'Frame Profil', note: 'Bingkai kecil, kesan besar.' },
    { cat: 'Badge', title: 'Badge Pencapaian', note: 'Tanda bahwa kamu sudah lewat banyak hal.' }
  ];

  function coin(amount) {
    return Number(amount || 0).toLocaleString('id-ID');
  }

  function renderStore(host) {
    var wallet = load(K.wallet, 75000);
    var inventory = load(K.inventory, []);
    var avatar = avatarState();
    var filter = storeState.filter;
    var cats = ['Semua', 'Avatar', 'Stiker', 'Frame', 'Badge'];

    function findItem(id) {
      for (var i = 0; i < STORE_CATALOG.length; i++) {
        if (STORE_CATALOG[i].id === id) return STORE_CATALOG[i];
      }
      return null;
    }

    function card(item) {
      var owned = inventory.indexOf(item.id) !== -1;
      var equipped = avatar.accessory === item.id;
      return '<article class="fv-store-card' + (owned ? ' owned' : '') + '">' +
        '<div class="fv-store-preview">' + item.emoji +
          (owned ? '<span class="fv-owned-badge">✓</span>' : '') +
        '</div>' +
        '<b class="fv-store-name">' + esc(item.name) + '</b>' +
        '<div class="fv-store-price">🪙 ' + coin(item.price) + '</div>' +
        (owned
          ? '<button class="fv-store-action st-equip' + (equipped ? ' equipped' : '') + '" data-id="' + item.id + '">' +
              (equipped ? 'Dipakai' : 'Pakai') + '</button>'
          : '<button class="fv-store-action st-buy" data-id="' + item.id + '">Beli</button>') +
      '</article>';
    }

    function group(g) {
      var items = STORE_CATALOG.filter(function (i) { return i.cat === g.cat; });
      if (!items.length) return '';

      return '<div class="fv-store-section">' +
        '<div class="fv-store-section-head">' +
          '<div><h3>' + esc(g.title) + '</h3><small class="fv-muted">' + esc(g.note) + '</small></div>' +
          (filter === 'Semua'
            ? '<button class="fv-link st-filter-link" data-cat="' + g.cat + '">Lihat Semua ›</button>'
            : '') +
        '</div>' +
        '<div class="fv-store-grid">' + items.map(card).join('') + '</div>' +
      '</div>';
    }

    var visibleGroups = STORE_GROUPS.filter(function (g) {
      return filter === 'Semua' || g.cat === filter;
    });

    host.innerHTML =
      '<div class="fv-store-hero">' +
        '<div class="fv-store-hero-copy">' +
          '<div class="fv-store-kicker">unlinked<span>+</span> Store</div>' +
          '<h2>Ekspresi dirimu dengan gaya <em>ala budak korporat!</em></h2>' +
          '<div class="fv-store-balance">' +
            '<span>🪙 ' + coin(wallet) + '</span>' +
            '<button id="st-topup" class="fv-store-topup">＋ Isi saldo</button>' +
          '</div>' +
        '</div>' +
        '<div class="fv-store-hero-art" aria-hidden="true">😎</div>' +
      '</div>' +

      '<div class="fv-chips fv-store-cats" id="st-cats">' +
        cats.map(function (c) {
          return '<button class="fv-chip' + (filter === c ? ' active' : '') + '" data-cat="' + c + '">' + c + '</button>';
        }).join('') +
      '</div>' +

      visibleGroups.map(group).join('') +

      '<div class="fv-store-owned">' +
        '<div class="fv-store-section-head"><div><h3>Barangmu</h3>' +
          '<small class="fv-muted">' + inventory.length + ' item dimiliki · transaksi simulasi</small></div></div>' +
        '<div class="fv-card"><div class="fv-row" style="flex-wrap:wrap;gap:10px">' +
          (inventory.length
            ? inventory.map(function (id) {
                var it = findItem(id);
                return it ? '<span class="fv-badge">' + it.emoji + ' ' + esc(it.name) + '</span>' : '';
              }).join('')
            : '<span class="fv-muted">Belum ada barang. Beli satu, atau jangan — tidak apa-apa.</span>') +
        '</div></div>' +
      '</div>';

    $$('#st-cats .fv-chip', host).forEach(function (chip) {
      chip.addEventListener('click', function () {
        storeState.filter = chip.getAttribute('data-cat');
        renderStore(host);
      });
    });

    $$('.st-filter-link', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        storeState.filter = btn.getAttribute('data-cat');
        renderStore(host);
      });
    });

    $('#st-topup', host).addEventListener('click', function () {
      wallet += 25000;
      save(K.wallet, wallet);
      toast('Saldo simulasi ditambah 25.000 koin.');
      renderStore(host);
    });

    $$('.st-buy', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = findItem(btn.getAttribute('data-id'));
        if (!item) return;
        if (wallet < item.price) {
          toast('Saldo koin tidak cukup. Isi saldo dulu, ya.');
          return;
        }

        wallet -= item.price;
        inventory.push(item.id);
        save(K.wallet, wallet);
        save(K.inventory, inventory);
        announceInventory();

        if (window.confetti) {
          window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }
        toast('Berhasil membeli ' + item.name + ' (simulasi).');
        renderStore(host);
      });
    });

    $$('.st-equip', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = findItem(btn.getAttribute('data-id'));
        avatar.accessory = item ? item.id : null;
        save(K.avatar, avatar);
        toast(item ? item.name + ' dipakai.' : 'Dipakaikan.');
        renderStore(host);
      });
    });
  }

  /* ---------------------------------------------------------
     unlinked+ Plus
     --------------------------------------------------------- */
  var PLUS_BENEFITS = [
    'Bebas iklan di Feed',
    'Avatar eksklusif premium',
    'Badge spesial: Mental Baja+',
    'Akses konten eksklusif',
    'Dukung komunitas unlinked+'
  ];

  var PLUS_PLANS = [
    { id: 'bulanan', name: 'Bulanan', price: 19000, per: '/bulan', note: 'Berhenti kapan saja.', days: 30 },
    { id: 'tahunan', name: 'Tahunan', price: 199000, per: '/tahun', note: 'Setara Rp16.583/bulan', badge: 'Hemat 60%', days: 365, best: true }
  ];

  function renderPlus(host) {
    var active = plusActive();
    var membership = plusState();
    var selected = load('unlinked.plusPlan', 'tahunan');
    var plan = PLUS_PLANS.filter(function (p) { return p.id === selected; })[0] || PLUS_PLANS[1];

    var activeBanner = active
      ? '<div class="fv-plus-active">' +
          '<span class="fv-plus-active-icon">👑</span>' +
          '<div>' +
            '<b>Plus aktif</b>' +
            '<div class="fv-muted">Paket ' + esc(membership.plan === 'tahunan' ? 'Tahunan' : 'Bulanan') +
              ' · berlaku sampai ' + new Date(membership.until).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + '</div>' +
          '</div>' +
          '<button id="pl-stop" class="fv-btn ghost">Berhenti</button>' +
        '</div>'
      : '';

    host.innerHTML = activeBanner +
      '<div class="fv-plus-hero">' +
        '<div class="fv-plus-hero-copy">' +
          '<div class="fv-plus-kicker">unlinked<span>+</span> Plus</div>' +
          '<h2>Pengalaman lebih nyaman, <em>tanpa iklan!</em></h2>' +
          '<p>Bantu kami tetap hidup tanpa menjual datamu ke pengiklan.</p>' +
        '</div>' +
        '<div class="fv-plus-hero-art" aria-hidden="true">👑</div>' +
      '</div>' +

      '<div class="fv-card fv-plus-benefits">' +
        '<b>Keuntungan Membership:</b>' +
        '<ul>' +
          PLUS_BENEFITS.map(function (b) {
            return '<li><span class="fv-check">✓</span>' + esc(b) + '</li>';
          }).join('') +
        '</ul>' +
      '</div>' +

      '<div class="fv-plus-plans">' +
        PLUS_PLANS.map(function (p) {
          var picked = p.id === plan.id;
          return '<button class="fv-plan' + (picked ? ' picked' : '') + (p.best ? ' best' : '') + '" data-plan="' + p.id + '">' +
            (p.badge ? '<span class="fv-plan-ribbon">' + esc(p.badge) + '</span>' : '') +
            (p.best ? '<span class="fv-plan-crown">👑</span>' : '') +
            '<span class="fv-plan-name">' + esc(p.name) + '</span>' +
            '<strong>' + rupiah(p.price) + '</strong>' +
            '<small>' + esc(p.per) + '</small>' +
            '<span class="fv-plan-note">' + esc(p.note) + '</span>' +
          '</button>';
        }).join('') +
      '</div>' +

      '<div class="fv-plus-secure">🛡️ Pembayaran aman &amp; terpercaya melalui QRIS, kartu, dan e-wallet.</div>' +

      '<button id="pl-upgrade" class="fv-btn primary fv-plus-cta">' +
        (active ? 'Perpanjang Paket ' + plan.name : 'Upgrade Sekarang — ' + rupiah(plan.price)) + ' →' +
      '</button>' +

      '<p class="fv-plus-legal">Ini simulasi. Tidak ada pembayaran sungguhan yang diproses di halaman ini.</p>';

    $$('.fv-plan', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        save('unlinked.plusPlan', btn.getAttribute('data-plan'));
        renderPlus(host);
      });
    });

    $('#pl-upgrade', host).addEventListener('click', function () {
      if (!window.confirm('Aktifkan unlinked+ Plus paket ' + plan.name + ' (' + rupiah(plan.price) + ')? Ini simulasi, tidak ada uang yang dipotong.')) {
        return;
      }

      var now = Date.now();
      var base = active && membership && membership.until > now ? membership.until : now;
      save(K.plus, {
        plan: plan.id,
        since: active && membership ? membership.since : now,
        until: base + plan.days * 86400000
      });

      applyPlusState();
      if (window.confetti) {
        window.confetti({ particleCount: 180, spread: 90, origin: { y: 0.55 } });
      }
      toast('unlinked+ Plus aktif. Iklan di feed hilang.');
      renderPlus(host);
    });

    var stop = $('#pl-stop', host);
    if (stop) {
      stop.addEventListener('click', function () {
        if (!window.confirm('Berhenti berlangganan? Manfaat Plus langsung berhenti.')) return;
        localStorage.removeItem(K.plus);
        applyPlusState();
        toast('Langganan dihentikan. Iklan kembali muncul di feed.');
        renderPlus(host);
      });
    }
  }

  /* ---------------------------------------------------------
     Dashboard Iklan
     --------------------------------------------------------- */
  var ADS_DEFAULT = {
    campaigns: [
      { id: 'c1', name: 'Career Survival Week', emoji: '💼', status: 'aktif', period: '1–14 Okt 2025', impressions: 142500, clicks: 7100, spend: 1400000, budget: 3000000 },
      { id: 'c2', name: 'Skill Baru Untuk Karier', emoji: '🎓', status: 'aktif', period: '8–22 Okt 2025', impressions: 72000, clicks: 3700, spend: 750000, budget: 2000000 },
      { id: 'c3', name: 'Mental Reset September', emoji: '🌱', status: 'jeda', period: '1–30 Sep 2025', impressions: 31300, clicks: 1500, spend: 300000, budget: 1000000 }
    ],
    settings: {
      weeklyReport: true,
      autoPause: false,
      autoOptimize: true,
      dailyBudget: 150000
    }
  };

  var adsView = { tab: 'Ringkasan' };

  var AD_SERIES = {
    impressions: [92, 104, 96, 118, 110, 126, 120, 138, 131, 146, 140, 158, 150, 164, 159, 172, 168, 181, 176, 188, 183, 196, 191, 205, 200, 214, 209, 222, 218, 232],
    clicks: [4.2, 4.6, 4.3, 5.0, 4.8, 5.4, 5.1, 5.8, 5.5, 6.0, 5.8, 6.4, 6.1, 6.7, 6.4, 7.0, 6.7, 7.3, 7.0, 7.6, 7.3, 7.9, 7.6, 8.2, 7.9, 8.5, 8.2, 8.8, 8.5, 9.0]
  };

  function compact(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(2).replace('.', ',') + 'jt';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.', ',') + 'K';
    return String(n);
  }

  function adsData() {
    var d = load(K.ads, null);
    if (!d || !d.campaigns) {
      d = JSON.parse(JSON.stringify(ADS_DEFAULT));
      save(K.ads, d);
    }
    return d;
  }

  function adsTotals(campaigns) {
    var t = { impressions: 0, clicks: 0, spend: 0, budget: 0 };
    campaigns.forEach(function (c) {
      t.impressions += c.impressions;
      t.clicks += c.clicks;
      t.spend += c.spend;
      t.budget += c.budget;
    });
    t.ctr = t.impressions ? (t.clicks / t.impressions) * 100 : 0;
    return t;
  }

  function linePath(values, w, h, max) {
    var step = values.length > 1 ? w / (values.length - 1) : w;
    return values.map(function (v, i) {
      var x = i * step;
      var y = h - (v / max) * h;
      return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');
  }

  function adsChart() {
    var w = 320;
    var h = 130;
    var max = 300;
    var imp = AD_SERIES.impressions;
    var clk = AD_SERIES.clicks.map(function (v) { return v * 12; });

    var grid = [0, 100, 200, 300].map(function (v) {
      var y = h - (v / max) * h;
      return '<line x1="0" y1="' + y.toFixed(1) + '" x2="' + w + '" y2="' + y.toFixed(1) + '" stroke="#eef0f5" stroke-width="1"/>' +
        '<text x="0" y="' + (y - 3).toFixed(1) + '" font-size="7" fill="#9aa4b5">' + v + 'K</text>';
    }).join('');

    return '<div class="fv-chart">' +
      '<div class="fv-chart-legend">' +
        '<span><i class="dot blue"></i>Impressions</span>' +
        '<span><i class="dot orange"></i>Klik</span>' +
      '</div>' +
      '<svg viewBox="0 -6 ' + w + ' ' + (h + 20) + '" preserveAspectRatio="none" role="img" aria-label="Performa 30 hari terakhir">' +
        grid +
        '<path d="' + linePath(imp, w, h, max) + '" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<path d="' + linePath(clk, w, h, max) + '" fill="none" stroke="#f57c00" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<text x="0" y="' + (h + 14) + '" font-size="7" fill="#9aa4b5">1 Okt</text>' +
        '<text x="' + (w * 0.33) + '" y="' + (h + 14) + '" font-size="7" fill="#9aa4b5">8 Okt</text>' +
        '<text x="' + (w * 0.66) + '" y="' + (h + 14) + '" font-size="7" fill="#9aa4b5">15 Okt</text>' +
        '<text x="' + (w - 22) + '" y="' + (h + 14) + '" font-size="7" fill="#9aa4b5">22 Okt</text>' +
      '</svg>' +
    '</div>';
  }

  function campaignCard(c) {
    return '<article class="fv-campaign" data-id="' + esc(c.id) + '">' +
      '<div class="fv-campaign-art">' + c.emoji + '</div>' +
      '<div class="fv-campaign-main">' +
        '<div class="fv-campaign-top">' +
          '<b>' + esc(c.name) + '</b>' +
          '<span class="fv-campaign-status ' + c.status + '">' + (c.status === 'aktif' ? 'Aktif' : 'Jeda') + '</span>' +
        '</div>' +
        '<div class="fv-muted">' + esc(c.period) + '</div>' +
        '<div class="fv-campaign-stats">' +
          '<span><b>' + compact(c.impressions) + '</b> Imp</span>' +
          '<span><b>' + compact(c.clicks) + '</b> Klik</span>' +
          '<span><b>' + ((c.clicks / c.impressions) * 100).toFixed(1) + '%</b> CTR</span>' +
        '</div>' +
        '<div class="fv-bar"><i style="width:' + Math.min(100, Math.round((c.spend / c.budget) * 100)) + '%"></i></div>' +
        '<div class="fv-row" style="justify-content:space-between;margin-top:8px">' +
          '<span class="fv-muted">Terpakai ' + rupiah(c.spend) + ' dari ' + rupiah(c.budget) + '</span>' +
          '<button class="fv-btn ghost fv-campaign-toggle" data-id="' + esc(c.id) + '">' +
            (c.status === 'aktif' ? 'Jeda' : 'Aktifkan') + '</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function renderAds(host) {
    var data = adsData();
    var totals = adsTotals(data.campaigns);
    var tabs = ['Ringkasan', 'Kampanye', 'Laporan', 'Pengaturan'];
    var tab = adsView.tab;

    var body = '';

    if (tab === 'Ringkasan') {
      body =
        '<div class="fv-ads-stats">' +
          '<div class="fv-card fv-ads-stat"><span class="fv-ads-ico blue">👁</span><div><small>Impressions</small><strong>' + compact(totals.impressions) + '</strong><em class="up">↑ +12,5%</em></div></div>' +
          '<div class="fv-card fv-ads-stat"><span class="fv-ads-ico orange">↗</span><div><small>Klik</small><strong>' + compact(totals.clicks) + '</strong><em class="up">↑ +18,7%</em></div></div>' +
          '<div class="fv-card fv-ads-stat"><span class="fv-ads-ico sky">📊</span><div><small>CTR</small><strong>' + totals.ctr.toFixed(1).replace('.', ',') + '%</strong><em class="up">↑ +0,3%</em></div></div>' +
          '<div class="fv-card fv-ads-stat"><span class="fv-ads-ico green">💰</span><div><small>Pendapatan</small><strong>Rp' + compact(totals.spend) + '</strong><em class="up">↑ +22,1%</em></div></div>' +
        '</div>' +
        '<div class="fv-card" style="margin-top:14px">' +
          '<div class="fv-ads-card-head"><b>Performa 30 Hari Terakhir</b></div>' +
          adsChart() +
        '</div>' +
        '<div class="fv-ads-card-head" style="margin:20px 0 10px"><b>Kampanye Teratas</b>' +
          '<button class="fv-link" id="ads-see-all">Lihat Semua ›</button></div>' +
        '<div class="fv-list">' + data.campaigns.slice(0, 2).map(campaignCard).join('') + '</div>';
    }

    if (tab === 'Kampanye') {
      body =
        '<div class="fv-ads-card-head" style="margin-bottom:12px">' +
          '<span class="fv-muted">' + data.campaigns.length + ' kampanye · ' +
            data.campaigns.filter(function (c) { return c.status === 'aktif'; }).length + ' aktif</span>' +
          '<button class="fv-btn primary" id="ads-new">＋ Kampanye Baru</button>' +
        '</div>' +
        '<div class="fv-list">' + data.campaigns.map(campaignCard).join('') + '</div>';
    }

    if (tab === 'Laporan') {
      body =
        '<div class="fv-card">' +
          '<div class="fv-ads-card-head"><b>Laporan per Kampanye</b>' +
            '<button class="fv-btn ghost" id="ads-csv">Unduh CSV</button></div>' +
          '<div class="fv-table-wrap">' +
            '<table class="fv-table">' +
              '<thead><tr><th>Kampanye</th><th>Imp</th><th>Klik</th><th>CTR</th><th>Biaya</th></tr></thead>' +
              '<tbody>' +
                data.campaigns.map(function (c) {
                  return '<tr><td>' + esc(c.name) + '</td><td>' + compact(c.impressions) + '</td><td>' + compact(c.clicks) +
                    '</td><td>' + ((c.clicks / c.impressions) * 100).toFixed(1) + '%</td><td>' + rupiah(c.spend) + '</td></tr>';
                }).join('') +
              '</tbody>' +
              '<tfoot><tr><th>Total</th><th>' + compact(totals.impressions) + '</th><th>' + compact(totals.clicks) +
                '</th><th>' + totals.ctr.toFixed(1) + '%</th><th>' + rupiah(totals.spend) + '</th></tr></tfoot>' +
            '</table>' +
          '</div>' +
        '</div>' +
        '<div class="fv-ads-note">Laporan mengikuti data demo di perangkat ini. Unduh CSV untuk melihat format ekspor.</div>';
    }

    if (tab === 'Pengaturan') {
      var s = data.settings;
      body =
        '<div class="fv-card fv-ads-settings">' +
          '<b>Preferensi akun pengiklan</b>' +
          '<label class="fv-toggle-row"><span>Laporan mingguan lewat email</span>' +
            '<input type="checkbox" data-set="weeklyReport"' + (s.weeklyReport ? ' checked' : '') + '/></label>' +
          '<label class="fv-toggle-row"><span>Jeda otomatis jika CTR di bawah 2%</span>' +
            '<input type="checkbox" data-set="autoPause"' + (s.autoPause ? ' checked' : '') + '/></label>' +
          '<label class="fv-toggle-row"><span>Optimasi otomatis audiens</span>' +
            '<input type="checkbox" data-set="autoOptimize"' + (s.autoOptimize ? ' checked' : '') + '/></label>' +
          '<label class="fv-label" style="margin-top:16px">Anggaran harian</label>' +
          '<div class="fv-row">' +
            '<input id="ads-budget" class="fv-input" type="number" min="10000" step="10000" value="' + Number(s.dailyBudget) + '" style="max-width:180px" />' +
            '<button id="ads-save" class="fv-btn primary">Simpan</button>' +
          '</div>' +
          '<p class="fv-muted" style="margin-top:12px">Perubahan disimpan di perangkat ini.</p>' +
        '</div>';
    }

    host.innerHTML =
      '<div class="fv-ads-head">' +
        '<div>' +
          '<div class="fv-eyebrow">RUANG UNTUK BRAND YANG MANUSIAWI</div>' +
          '<h2 class="fv-title">Dashboard Iklan</h2>' +
          '<p class="fv-sub">Pantau performa kampanye tanpa metrik yang menipu diri sendiri.</p>' +
        '</div>' +
      '</div>' +
      '<div class="fv-ads-tabs" id="ads-tabs">' +
        tabs.map(function (t) {
          return '<button class="fv-ads-tab' + (t === tab ? ' active' : '') + '" data-tab="' + t + '">' + t + '</button>';
        }).join('') +
      '</div>' +
      body;

    $$('#ads-tabs .fv-ads-tab', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        adsView.tab = btn.getAttribute('data-tab');
        renderAds(host);
      });
    });

    $$('.fv-campaign-toggle', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var d = adsData();
        d.campaigns.forEach(function (c) {
          if (c.id === btn.getAttribute('data-id')) {
            c.status = c.status === 'aktif' ? 'jeda' : 'aktif';
            toast('Kampanye ' + (c.status === 'aktif' ? 'diaktifkan.' : 'dijeda.'));
          }
        });
        save(K.ads, d);
        renderAds(host);
      });
    });

    var seeAll = $('#ads-see-all', host);
    if (seeAll) {
      seeAll.addEventListener('click', function () {
        adsView.tab = 'Kampanye';
        renderAds(host);
      });
    }

    var newBtn = $('#ads-new', host);
    if (newBtn) {
      newBtn.addEventListener('click', function () {
        adsView.tab = 'Pengaturan';
        renderAds(host);
        toast('Lengkapi preferensi dulu, lalu kampanye baru bisa dibuat.');
      });
    }

    var csv = $('#ads-csv', host);
    if (csv) {
      csv.addEventListener('click', function () {
        var rows = [['Kampanye', 'Impressions', 'Klik', 'CTR', 'Biaya', 'Status']];
        adsData().campaigns.forEach(function (c) {
          rows.push([c.name, c.impressions, c.clicks, ((c.clicks / c.impressions) * 100).toFixed(2) + '%', c.spend, c.status]);
        });
        var text = rows.map(function (r) { return r.join(';'); }).join('\r\n');
        var blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'unlinked-ads-report-' + Date.now() + '.csv';
        link.click();
        setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
        toast('CSV laporan diunduh.');
      });
    }

    $$('[data-set]', host).forEach(function (input) {
      input.addEventListener('change', function () {
        var d = adsData();
        d.settings[input.getAttribute('data-set')] = input.checked;
        save(K.ads, d);
        toast('Preferensi diperbarui.');
      });
    });

    var saveBtn = $('#ads-save', host);
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var d = adsData();
        var budget = Number($('#ads-budget', host).value);
        if (!budget || budget < 10000) {
          toast('Anggaran harian minimal Rp10.000.');
          return;
        }
        d.settings.dailyBudget = budget;
        save(K.ads, d);
        toast('Pengaturan iklan disimpan.');
      });
    }
  }

  /* ---------------------------------------------------------
     Opportunity Board
     --------------------------------------------------------- */
  function renderOpportunity(host) {
    var filter = host.getAttribute('data-filter') || 'Semua';
    var types = ['Semua', 'Magang', 'Freelance', 'Beasiswa', 'Komunitas'];
    var books = load(K.books, []);
    var applied = load(K.applied, []);

    host.innerHTML = head(
      'PELUANG YANG TIDAK MENUNTUT KAMU SEMPURNA',
      'Opportunity Board',
      'Dikurasi manual. Tidak ada algoritma yang menyembunyikan peluang kecil.',
      ''
    ) +
      '<div class="fv-chips" id="ob-types">' +
        types.map(function (t) {
          return '<button class="fv-chip' + (filter === t ? ' active' : '') + '" data-t="' + t + '">' + t + '</button>';
        }).join('') +
      '</div>' +
      '<div class="fv-list" style="margin-top:16px">' +
        OPPORTUNITIES.filter(function (o) { return filter === 'Semua' || o.type === filter; })
          .map(function (o) {
            var saved = books.indexOf(o.id) !== -1;
            var done = applied.indexOf(o.id) !== -1;
            return '<div class="fv-card fv-opp">' +
              '<div class="fv-row" style="justify-content:space-between">' +
                '<span class="fv-badge">' + esc(o.type) + '</span>' +
                '<button class="fv-icon-btn ob-save' + (saved ? ' active' : '') + '" data-id="' + esc(o.id) + '">' +
                  (saved ? '★' : '☆') + '</button>' +
              '</div>' +
              '<b style="display:block;margin-top:8px">' + esc(o.title) + '</b>' +
              '<div class="fv-muted">' + esc(o.org) + ' · ' + esc(o.place) + ' · tenggat ' + esc(o.deadline) + '</div>' +
              '<p class="fv-text">' + esc(o.desc) + '</p>' +
              '<div class="fv-row">' +
                '<button class="fv-btn ' + (done ? 'ghost' : 'primary') + ' ob-apply" data-id="' + esc(o.id) + '">' +
                  (done ? '✓ Sudah dilamar' : 'Saya tertarik') +
                '</button>' +
              '</div>' +
            '</div>';
          }).join('') +
      '</div>';

    $('#ob-types', host).addEventListener('click', function (e) {
      var btn = e.target.closest('[data-t]');
      if (!btn) return;
      host.setAttribute('data-filter', btn.getAttribute('data-t'));
      renderOpportunity(host);
    });

    $$('.ob-save', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var b = load(K.books, []);
        var idx = b.indexOf(id);
        if (idx === -1) { b.push(id); btn.textContent = '★'; btn.classList.add('active'); toast('Disimpan.'); }
        else { b.splice(idx, 1); btn.textContent = '☆'; btn.classList.remove('active'); toast('Dihapus dari simpanan.'); }
        save(K.books, b);
      });
    });

    $$('.ob-apply', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var a = load(K.applied, []);
        if (a.indexOf(id) === -1) {
          a.push(id);
          save(K.applied, a);
          toast('Ditandai tertarik. Hubungi penyelenggara untuk langkah berikutnya.');
        }
        renderOpportunity(host);
      });
    });
  }

  /* ---------------------------------------------------------
     Mental Reset
     --------------------------------------------------------- */
  function renderMental(host) {
    stopBreathing(host);
    var moods = load(K.moods, []);
    var moodFaces = ['😖', '😕', '😐', '🙂', '😌'];

    host.innerHTML = head(
      'ISTIRAHAT ITU PRODUKTIF',
      'Mental Reset',
      'Tiga alat singkat: napas, grounding, dan catatan suasana hati. Tidak menggantikan bantuan profesional.',
      ''
    ) +
      '<div class="fv-grid two">' +
        '<div class="fv-card fv-breathe-card">' +
          '<b>Napas kotak (4-4-4-4)</b>' +
          '<p class="fv-muted">Empat detik tarik, empat tahan, empat buang, empat tahan.</p>' +
          '<div class="fv-breathe-wrap"><div id="mr-circle" class="fv-breathe-circle"></div></div>' +
          '<div id="mr-phase" class="fv-breathe-phase">Siap?</div>' +
          '<div class="fv-row" style="justify-content:center;margin-top:8px">' +
            '<button id="mr-start" class="fv-btn primary">Mulai</button>' +
            '<button id="mr-stop" class="fv-btn ghost">Berhenti</button>' +
          '</div>' +
        '</div>' +

        '<div class="fv-card">' +
          '<b>Grounding 5-4-3-2-1</b>' +
          '<p class="fv-muted">Sebutkan dengan sadar — bukan untuk dinilai siapa pun.</p>' +
          '<div class="fv-list" style="margin-top:12px">' +
            [['5', 'hal yang bisa kamu lihat'], ['4', 'hal yang bisa kamu sentuh'], ['3', 'suara yang kamu dengar'],
             ['2', 'aroma yang kamu cium'], ['1', 'rasa yang kamu syukuri']].map(function (pair, i) {
              return '<label class="fv-ground-row">' +
                '<span class="fv-badge">' + pair[0] + '</span>' +
                '<input class="fv-input" data-g="' + i + '" placeholder="' + esc(pair[1]) + '" />' +
              '</label>';
            }).join('') +
          '</div>' +
          '<button id="mr-save-ground" class="fv-btn ghost" style="margin-top:12px">Tandai selesai</button>' +
        '</div>' +
      '</div>' +

      '<div class="fv-card" style="margin-top:16px">' +
        '<b>Bagaimana perasaanmu sekarang?</b>' +
        '<div class="fv-row" style="margin-top:12px" id="mr-moods">' +
          moodFaces.map(function (f, i) {
            return '<button class="fv-mood" data-m="' + i + '" title="' + (i + 1) + '/5">' + f + '</button>';
          }).join('') +
        '</div>' +
        '<div class="fv-muted" style="margin-top:10px">Riwayat 7 catatan terakhir</div>' +
        '<div class="fv-row" style="flex-wrap:wrap;gap:8px;margin-top:8px" id="mr-history">' +
          (moods.length
            ? moods.slice(-7).reverse().map(function (m) {
                return '<span class="fv-badge">' + moodFaces[m.mood] + ' ' + esc(relativeTime(m.at)) + '</span>';
              }).join('')
            : '<span class="fv-muted">Belum ada catatan.</span>') +
        '</div>' +
      '</div>';

    $$('#mr-moods .fv-mood', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var m = Number(btn.getAttribute('data-m'));
        moods.push({ mood: m, at: Date.now() });
        save(K.moods, moods);
        toast('Catatan suasana hati tersimpan.');
        renderMental(host);
      });
    });

    $('#mr-save-ground', host).addEventListener('click', function () {
      var filled = $$('.fv-ground-row input', host).filter(function (i) { return i.value.trim(); }).length;
      toast(filled >= 3 ? 'Bagus. Kamu sudah kembali ke ruangan ini.' : 'Tidak apa-apa kalau belum lengkap. Coba satu saja dulu.');
    });

    $('#mr-start', host).addEventListener('click', function () {
      startBreathing(host);
    });
    $('#mr-stop', host).addEventListener('click', function () {
      stopBreathing(host);
    });
  }

  function startBreathing(host) {
    stopBreathing(host);

    var phases = [
      { label: 'Tarik napas…', scale: 1.35 },
      { label: 'Tahan…', scale: 1.35 },
      { label: 'Buang napas…', scale: 0.85 },
      { label: 'Tahan…', scale: 0.85 }
    ];
    var index = 0;
    var remaining = 4;

    var circle = $('#mr-circle', host);
    var phase = $('#mr-phase', host);
    if (!circle || !phase) return;

    function tick() {
      var p = phases[index];
      circle.style.transform = 'scale(' + p.scale + ')';
      circle.style.transitionDuration = '3.8s';
      phase.textContent = p.label + ' ' + remaining;

      remaining -= 1;
      if (remaining <= 0) {
        index = (index + 1) % phases.length;
        remaining = 4;
      }
    }

    tick();
    activeTimer = setInterval(tick, 1000);
  }

  function stopBreathing(host) {
    if (activeTimer) {
      clearInterval(activeTimer);
      activeTimer = null;
    }
    var phase = $('#mr-phase', host);
    var circle = $('#mr-circle', host);
    if (phase) phase.textContent = 'Siap?';
    if (circle) {
      circle.style.transform = 'scale(1)';
      circle.style.transitionDuration = '0.3s';
    }
  }

  /* ---------------------------------------------------------
     Avatar
     --------------------------------------------------------- */
  function renderAvatar(host) {
    var av = avatarState();

    host.innerHTML = head(
      'TAMPIL GAGAL DENGAN GAYA',
      'Avatar',
      'Pilih karakter dan warna bingkai. Tersimpan otomatis di perangkat ini.',
      ''
    ) +
      '<div class="fv-grid two">' +
        '<div class="fv-card fv-avatar-preview">' +
          '<div class="fv-avatar big" style="border-color:' + esc(av.frame) + '">' + esc(av.character) + '</div>' +
          '<div class="fv-muted">' + esc(profile().name) + '</div>' +
        '</div>' +
        '<div class="fv-card">' +
          '<b>Karakter</b>' +
          '<div class="fv-row" style="flex-wrap:wrap;gap:10px;margin-top:10px" id="av-chars">' +
            AVATAR_CHOICES.map(function (c) {
              return '<button class="fv-avatar-choice' + (av.character === c ? ' active' : '') + '" data-c="' + esc(c) + '">' + c + '</button>';
            }).join('') +
          '</div>' +
          '<b style="display:block;margin-top:18px">Warna bingkai</b>' +
          '<div class="fv-row" style="flex-wrap:wrap;gap:10px;margin-top:10px" id="av-frames">' +
            FRAME_COLORS.map(function (c) {
              return '<button class="fv-frame-choice' + (av.frame === c ? ' active' : '') + '" data-f="' + esc(c) + '" style="background:' + esc(c) + '"></button>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>';

    $$('#av-chars .fv-avatar-choice', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        av.character = btn.getAttribute('data-c');
        save(K.avatar, av);
        renderAvatar(host);
      });
    });

    $$('#av-frames .fv-frame-choice', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        av.frame = btn.getAttribute('data-f');
        save(K.avatar, av);
        renderAvatar(host);
      });
    });
  }

  /* ---------------------------------------------------------
     Halaman Tentang
     --------------------------------------------------------- */
  var INFO = {
    Bantuan: {
      eyebrow: 'KAMI TIDAK MENINGGALKAN KAMU',
      title: 'Bantuan',
      subtitle: 'Hal-hal yang paling sering ditanyakan.',
      items: [
        ['Apakah cerita saya anonim?', 'Nama yang tampil adalah nama samaran yang dibuat sistem. Kamu bisa menggantinya di menu Profil. Jangan pernah menuliskan nama lengkap, nomor telepon, atau alamat di dalam cerita.'],
        ['Kenapa cerita saya tidak muncul?', 'Cerita disimpan di perangkat ini (localStorage) dan muncul di Discover serta Profil. Jika kamu membersihkan data browser, ceritanya ikut terhapus.'],
        ['Apakah data saya dikirim ke server?', 'Untuk halaman ini, tidak. Poll, spill, mood, dan pembelian disimpan lokal. Fitur berbasis akun akan menampilkan status login secara eksplisit.'],
        ['Bagaimana kalau saya butuh bantuan profesional?', 'Halaman ini bukan layanan darurat. Jika kamu dalam krisis, hubungi layanan kesehatan jiwa setempat atau orang yang kamu percaya. Jangan menunggu sendirian.']
      ]
    },
    'Kebijakan Privasi': {
      eyebrow: 'DATA KAMU, BUKAN PRODUK KAMI',
      title: 'Kebijakan Privasi',
      subtitle: 'Ringkas dan tanpa jebakan.',
      items: [
        ['Yang kami simpan', 'Di perangkat ini: nama samaran, spill, suara poll, catatan suasana hati, barang toko simulasi, dan hasil tes. Semuanya bisa dihapus lewat Profil → Reset data lokal.'],
        ['Yang tidak kami lakukan', 'Kami tidak menjual data, tidak membangun profil iklan, dan tidak melacak aktivitas di luar halaman ini.'],
        ['Cookie & penyimpanan', 'Kami memakai localStorage untuk mengingat preferensimu. Tidak ada cookie pelacak pihak ketiga.'],
        ['Pertanyaan privasi', 'Hubungi kami lewat halaman Kontak Kami. Permintaan penghapusan data lokal bisa kamu lakukan sendiri kapan saja.']
      ]
    },
    'Syarat & Ketentuan': {
      eyebrow: 'ATURAN MAIN YANG MANUSIAWI',
      title: 'Syarat & Ketentuan',
      subtitle: 'Supaya ruang ini tetap aman untuk semua.',
      items: [
        ['Yang boleh', 'Cerita jujur tentang kegagalan, kelelahan, dan hal-hal biasa. Bertanya, meminta dukungan, dan menertawakan diri sendiri.'],
        ['Yang tidak boleh', 'Doxing, ancaman, ujaran kebencian, konten seksual eksplisit, dan menyebarkan data pribadi orang lain.'],
        ['Konsekuensi', 'Konten yang melanggar dapat dihapus. Akun yang berulang kali melanggar dapat dibatasi.'],
        ['Batas tanggung jawab', 'Semua konten adalah opini penulisnya. Halaman ini bukan pengganti nasihat medis, hukum, atau keuangan.']
      ]
    },
    'Kontak Kami': {
      eyebrow: 'KAMI BACA, MESKI LAMBAT',
      title: 'Kontak Kami',
      subtitle: 'Untuk masukan, laporan, atau sekadar menyapa.',
      items: [
        ['Email', 'halo@unlinkedplus.id — untuk pertanyaan umum dan kerja sama.'],
        ['Laporan konten', 'lapor@unlinkedplus.id — sertakan tautan dan alasan. Kami tindak lanjuti dalam 2×24 jam kerja.'],
        ['Privasi & data', 'privasi@unlinkedplus.id — permintaan terkait data pribadi.'],
        ['Waktu respons', 'Senin–Jumat, 09.00–17.00 WIB. Di luar itu kami mungkin sedang tidur, dan itu sehat.']
      ]
    }
  };

  function renderInfo(host, kind) {
    var data = INFO[kind];
    host.innerHTML = head(data.eyebrow, data.title, data.subtitle, '') +
      '<div class="fv-list">' +
        data.items.map(function (pair) {
          return '<div class="fv-card"><b>' + esc(pair[0]) + '</b><p class="fv-text" style="margin-top:8px">' + esc(pair[1]) + '</p></div>';
        }).join('') +
      '</div>';
  }

  /* ---------------------------------------------------------
     Spill (compose)
     --------------------------------------------------------- */
  function renderSpill(host) {
    var cats = CATEGORIES;
    var joined = load(K.joined, ['burnout']);

    host.innerHTML = head(
      'TARUH BEBANMU SEBENTAR DI SINI',
      'Spill',
      'Tidak harus rapi. Tidak harus selesai. Cukup jujur.',
      ''
    ) +
      '<div class="fv-card">' +
        '<label class="fv-label">Kategori</label>' +
        '<select id="sp-cat" class="fv-select">' +
          cats.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('') +
        '</select>' +
        '<label class="fv-label" style="margin-top:12px">Komunitas</label>' +
        '<select id="sp-com" class="fv-select">' +
          '<option value="">— tanpa komunitas —</option>' +
          COMMUNITIES.filter(function (c) { return joined.indexOf(c.id) !== -1; })
            .map(function (c) { return '<option value="' + c.id + '">' + c.emoji + ' ' + esc(c.name) + '</option>'; }).join('') +
        '</select>' +
        '<label class="fv-label" style="margin-top:12px">Cerita</label>' +
        '<textarea id="sp-text" class="fv-textarea" maxlength="1200" placeholder="Hari ini aku..."></textarea>' +
        '<div class="fv-row" style="justify-content:space-between;margin-top:8px">' +
          '<span class="fv-muted" id="sp-count">0/1200</span>' +
          '<button id="sp-submit" class="fv-btn primary">Spill It</button>' +
        '</div>' +
        '<div id="sp-warn" class="fv-warn" hidden>🤖 Sensor anti-pamer aktif: cerita ini terdengar seperti pengumuman pencapaian.</div>' +
      '</div>';

    var BANNED = ['alhamdulillah diterima', 'gaji dua digit', 'promosi jabatan', 'bangga mengumumkan',
      'humbled and honored', 'excited to share', 'happy to announce', 'naik jabatan', 'diterima kerja'];

    var text = $('#sp-text', host);
    var warn = $('#sp-warn', host);
    var count = $('#sp-count', host);
    var submit = $('#sp-submit', host);

    function refresh() {
      var v = text.value;
      count.textContent = v.length + '/1200';
      var lower = v.toLowerCase();
      var banned = BANNED.some(function (p) { return lower.indexOf(p) !== -1; });
      warn.hidden = !banned;
      submit.disabled = banned || v.trim().length === 0;
    }

    text.addEventListener('input', refresh);
    refresh();

    submit.addEventListener('click', function () {
      var value = text.value.trim();
      if (value.length < 5) { toast('Tulis minimal 5 karakter.'); return; }

      var spill = {
        id: uid(),
        author: profile().name,
        category: $('#sp-cat', host).value,
        community: $('#sp-com', host).value || null,
        text: value,
        createdAt: Date.now(),
        reactions: { pukpuk: 0, ngakak: 0, sama: 0 },
        mine: true
      };

      var spills = allSpills();
      spills.unshift(spill);
      save(K.spills, spills);

      toast('Spill tersimpan. Terima kasih sudah berani.');
      host.innerHTML = head('TERKIRIM', 'Spill', 'Ceritamu sudah masuk ke Discover dan Profil.', '') +
        '<div class="fv-card"><p class="fv-text">' + esc(value) + '</p></div>' +
        '<div class="fv-row" style="margin-top:16px">' +
          '<button class="fv-btn primary" id="sp-again">Tulis lagi</button>' +
          '<button class="fv-btn ghost" id="sp-see">Lihat di Discover</button>' +
        '</div>';

      $('#sp-again', host).addEventListener('click', function () { renderSpill(host); });
      $('#sp-see', host).addEventListener('click', function () {
        discoverState = { q: '', category: 'Semua', sort: 'terbaru', community: null };
        setActive('Discover');
        open('Discover');
      });
    });
  }

  /* ---------------------------------------------------------
     Peta view
     --------------------------------------------------------- */
  var VIEW_MAP = {
    Beranda: { home: true, render: renderFeed },
    Spill: { render: renderSpill },
    Discover: { render: renderDiscover },
    Komunitas: { render: renderKomunitas },
    Profil: { render: renderProfil },
    Poll: { render: renderPoll },
    'Personality Test': { render: renderTest },
    'Meme Studio': { render: renderMeme },
    Store: { render: renderStore },
    'unlinked+ Plus': { render: renderPlus },
    'Dashboard Iklan': { render: renderAds },
    'Opportunity Board': { render: renderOpportunity },
    'Mental Reset': { render: renderMental },
    Avatar: { render: renderAvatar },
    Bantuan: { render: function (h) { renderInfo(h, 'Bantuan'); } },
    'Kebijakan Privasi': { render: function (h) { renderInfo(h, 'Kebijakan Privasi'); } },
    'Syarat & Ketentuan': { render: function (h) { renderInfo(h, 'Syarat & Ketentuan'); } },
    'Kontak Kami': { render: function (h) { renderInfo(h, 'Kontak Kami'); } }
  };

  function focusComposerHome() {
    if (typeof window.focusComposer === 'function') {
      window.focusComposer();
    }
  }

  /* ---------------------------------------------------------
     Ekspor
     --------------------------------------------------------- */
  window.Features = {
    open: open,
    setActive: setActive,
    current: function () { return currentView; },
    applyPlusState: applyPlusState,
    isPlusActive: plusActive
  };

  document.addEventListener('DOMContentLoaded', function () {
    // Pastikan state awal konsisten walau HTML menandai "Beranda" aktif.
    setActive('Beranda');
    applyPlusState();
  });
})();
