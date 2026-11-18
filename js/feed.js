/* ============================================================
   SambatIn — feed.js
   IIFE exposing window.Feed.
   Handles: seed posts, AI sensor, post creation, reactions.
   ============================================================ */
(function () {
  'use strict';

  /* --------------------------------------------------------
     AI Sensor — 10 banned phrases
     -------------------------------------------------------- */
  var BANNED_PHRASES = [
    'alhamdulillah diterima',
    'gaji dua digit',
    'promosi jabatan',
    'bangga mengumumkan',
    'humbled and honored',
    'excited to share',
    'happy to announce',
    'bersyukur diterima',
    'naik jabatan',
    'diterima kerja'
  ];

  /* --------------------------------------------------------
     Category Colors
     -------------------------------------------------------- */
  var CATEGORY_COLORS = {
    'Ditolak HRD':      '#EF4444',
    'Salah Kirim Chat': '#F59E0B',
    'Dimarahi Bos':     '#8B5CF6',
    'Bisnis Boncos':    '#EF4444',
    'Salah Jurusan':    '#3B82F6'
  };

  /* --------------------------------------------------------
     Seed Posts (5 exact posts from FEAT-003 spec)
     -------------------------------------------------------- */
  var SEED_POSTS = [
    {
      id: 'seed1',
      username: 'PejuangKubik_87',
      characterId: 'panda',
      accessories: ['id-card'],
      category: 'Ditolak HRD',
      text: 'Udah 5 tahap interview, presentasi proposal 20 halaman, bikin analisis kompetitor, terus HR-nya bilang "kami akan menghubungi kembali" — itu 3 bulan lalu. Yang berhasil ngebuka aplikasi LinkedIn mereka sekarang, tolong screenshot fotonya buat aku framing di kamar.',
      timestamp: Date.now() - 3600000 * 5
    },
    {
      id: 'seed2',
      username: 'MagangAbadi_Joko',
      characterId: 'intern',
      accessories: ['kopi'],
      category: 'Salah Kirim Chat',
      text: 'Niat mau curhat ke bestie soal bos killer, malah kekirim ke grup kantor "All Staff". Pesan aslinya: "Pak Direktur mirip karakter villain di film kartun tapi lebih jahat". Pak Direktur baca. Pak Direktur reply dengan 3 kata: "Senin ke HR."',
      timestamp: Date.now() - 3600000 * 12
    },
    {
      id: 'seed3',
      username: 'FreelancerKucingTua',
      characterId: 'freelancer',
      accessories: ['kopi', 'bendera'],
      category: 'Bisnis Boncos',
      text: 'Klien minta revisi ke-17. Jam 23.47. Pesannya: "Mas, bisa ganti semua warnanya jadi lebih... hidup? Dan fontnya kurang berjiwa." Tarif saya Rp150rb, sudah termasuk konseling trauma pasca-revisi. Belum bayar DP.',
      timestamp: Date.now() - 3600000 * 24
    },
    {
      id: 'seed4',
      username: 'SarjanaPenganggur',
      characterId: 'php-victim',
      accessories: [],
      category: 'Salah Jurusan',
      text: 'Kuliah 4 tahun di Teknik Kimia. Lulus dengan IPK 3.7. Sekarang kerja di pabrik — pabrik mie instan divisi quality control rasa. Kata orang tua "kan masih nyambung sama kimia". Iya Bu, kimia bumbu kaldu sapi.',
      timestamp: Date.now() - 3600000 * 36
    },
    {
      id: 'seed5',
      username: 'KaryawanReguler_02',
      characterId: 'panda',
      accessories: ['kardus'],
      category: 'Dimarahi Bos',
      text: 'Rapat presentasi hasil Q3. Slide ke-7, bos nyela: "Data ini dari mana? Google? Ini bukan skripsi!" Semua orang lihat ke saya. Padahal datanya dari laporan internal yang dia kirim sendiri bulan lalu. Nomor halaman 23. Saya tunjukkan. Dia bilang "Meeting dilanjutkan Senin."',
      timestamp: Date.now() - 3600000 * 48
    }
  ];

  /* --------------------------------------------------------
     Helpers
     -------------------------------------------------------- */
  function _hasBanned(text) {
    var t = text.toLowerCase();
    return BANNED_PHRASES.some(function (p) {
      return t.indexOf(p) !== -1;
    });
  }

  function _relativeTime(ts) {
    var diff = Date.now() - ts;
    if (diff < 60000)   return 'baru saja';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' menit lalu';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' jam lalu';
    return Math.floor(diff / 86400000) + ' hari lalu';
  }

  /* --------------------------------------------------------
     Render a post card to HTML string
     -------------------------------------------------------- */
  function _renderPost(post) {
    var avatarSVG = '';
    if (window.AvatarBuilder) {
      avatarSVG = window.AvatarBuilder.getAvatarSVG(post.characterId || 'panda', post.accessories || []);
    }

    var rxn = Reactions.getReactions(post.id);

    /* Level based on total reactions for seed posts, or accumulated XP for user posts */
    var totalRxnXP = (rxn.pukpuk + rxn.ngakak + rxn.sama) * 10;
    var lvlObj = Reactions.getLevel(totalRxnXP);

    var catColor = CATEGORY_COLORS[post.category] || '#9CA3AF';

    var pukpukReacted = rxn.myReactions && rxn.myReactions.pukpuk ? ' reacted' : '';
    var ngakakReacted = rxn.myReactions && rxn.myReactions.ngakak ? ' reacted' : '';
    var samaReacted   = rxn.myReactions && rxn.myReactions.sama   ? ' reacted' : '';

    return (
      '<div class="post-card" id="post-' + post.id + '">' +
        '<div class="post-header">' +
          '<div class="post-avatar-wrap">' +
            '<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">' + avatarSVG + '</svg>' +
          '</div>' +
          '<div class="post-meta">' +
            '<div class="post-username">' + post.username + '</div>' +
            '<div class="post-badges">' +
              '<span class="level-badge" style="background:' + lvlObj.color + '">' +
                'Lv.' + lvlObj.level + ' ' + lvlObj.name +
              '</span>' +
              '<span class="cat-badge" style="background:' + catColor + '22;color:' + catColor + '">' +
                post.category +
              '</span>' +
            '</div>' +
          '</div>' +
          '<span class="post-timestamp">' + _relativeTime(post.timestamp) + '</span>' +
        '</div>' +
        '<p class="post-text">' + post.text + '</p>' +
        '<div class="reaction-row">' +
          '<button class="reaction-btn' + pukpukReacted + '" data-post-id="' + post.id + '" data-reaction="pukpuk">' +
            '🫂 Puk-Puk <span class="rxn-count">' + (rxn.pukpuk || 0) + '</span>' +
          '</button>' +
          '<button class="reaction-btn' + ngakakReacted + '" data-post-id="' + post.id + '" data-reaction="ngakak">' +
            '😂 Ngakak Maaf <span class="rxn-count">' + (rxn.ngakak || 0) + '</span>' +
          '</button>' +
          '<button class="reaction-btn' + samaReacted + '" data-post-id="' + post.id + '" data-reaction="sama">' +
            '🤝 Sama Banget <span class="rxn-count">' + (rxn.sama || 0) + '</span>' +
          '</button>' +
          '<button class="cert-btn" data-post-id="' + post.id + '">📜 Buat Sertifikat</button>' +
        '</div>' +
      '</div>'
    );
  }

  /* --------------------------------------------------------
     Bind reaction + cert buttons for a rendered post
     -------------------------------------------------------- */
  function _bindPost(postId) {
    var postEl = document.getElementById('post-' + postId);
    if (!postEl) return;

    /* Reaction buttons */
    var rxnBtns = postEl.querySelectorAll('.reaction-btn[data-post-id]');
    for (var i = 0; i < rxnBtns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var pid  = btn.getAttribute('data-post-id');
          var type = btn.getAttribute('data-reaction');
          Reactions.addReaction(pid, type);

          /* Refresh counts + reacted state for all 3 buttons on this post */
          var updated = Reactions.getReactions(pid);
          var allBtns = postEl.querySelectorAll('.reaction-btn[data-post-id="' + pid + '"]');
          for (var j = 0; j < allBtns.length; j++) {
            var b = allBtns[j];
            var t = b.getAttribute('data-reaction');
            var countEl = b.querySelector('.rxn-count');
            if (countEl) countEl.textContent = updated[t] || 0;
            if (updated.myReactions && updated.myReactions[t]) {
              b.classList.add('reacted');
            } else {
              b.classList.remove('reacted');
            }
          }
        });
      })(rxnBtns[i]);
    }

    /* Certificate button */
    var certBtn = postEl.querySelector('.cert-btn[data-post-id]');
    if (certBtn) {
      certBtn.addEventListener('click', function () {
        var pid  = certBtn.getAttribute('data-post-id');
        var post = _findPost(pid);
        if (post && window.Certificate) {
          window.Certificate.openModal(post);
        }
      });
    }
  }

  /* --------------------------------------------------------
     Find a post by id across current localStorage
     -------------------------------------------------------- */
  function _findPost(postId) {
    var posts = getPosts();
    if (!posts) return null;
    for (var i = 0; i < posts.length; i++) {
      if (String(posts[i].id) === String(postId)) return posts[i];
    }
    return null;
  }

  /* --------------------------------------------------------
     Persistence
     -------------------------------------------------------- */
  function getPosts() {
    try {
      var raw = localStorage.getItem('sambatin_posts');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function _savePosts(posts) {
    try {
      localStorage.setItem('sambatin_posts', JSON.stringify(posts));
    } catch (e) {}
  }

  /* --------------------------------------------------------
     AI Sensor binding (create tab)
     -------------------------------------------------------- */
  function _bindAISensor() {
    var textarea  = document.getElementById('post-text');
    var warning   = document.getElementById('ai-sensor-warning');
    var submitBtn = document.getElementById('post-submit-btn');
    var charCount = document.getElementById('char-count');

    if (!textarea) return;

    textarea.addEventListener('input', function () {
      var text = textarea.value;
      if (charCount) charCount.textContent = text.length;

      var blocked = _hasBanned(text);

      if (warning) {
        if (blocked) {
          warning.removeAttribute('hidden');
        } else {
          warning.setAttribute('hidden', '');
        }
      }
      if (submitBtn) {
        submitBtn.disabled = blocked;
      }
    });
  }

  /* --------------------------------------------------------
     Create-form submit binding
     -------------------------------------------------------- */
  function _bindCreateForm(posts) {
    var submitBtn = document.getElementById('post-submit-btn');
    if (!submitBtn) return;

    submitBtn.addEventListener('click', function () {
      var catSelect = document.getElementById('post-category');
      var textarea  = document.getElementById('post-text');

      if (!catSelect || !textarea) return;
      if (!catSelect.value)        { alert('Pilih kategori dulu ya!'); return; }
      var trimmed = textarea.value.trim();
      if (!trimmed)                { alert('Ceritakan kegagalanmu dulu!'); return; }
      if (_hasBanned(trimmed))     return; /* sensor guard */

      /* Current avatar state */
      var charId = 'panda';
      var accs   = [];
      try {
        var avState = JSON.parse(localStorage.getItem('sambatin_avatar') || '{}');
        charId = avState.character || 'panda';
        accs   = avState.accessories || [];
      } catch (e) {}

      var username = localStorage.getItem('sambatin_username') ||
        ('BudakKorporat_' + (Math.floor(Math.random() * 900) + 100));
      localStorage.setItem('sambatin_username', username);

      var post = {
        id: 'post_' + Date.now(),
        username: username,
        characterId: charId,
        accessories: accs,
        category: catSelect.value,
        text: trimmed,
        timestamp: Date.now()
      };

      /* Save and prepend */
      var allPosts = getPosts() || [];
      allPosts.unshift(post);
      _savePosts(allPosts);

      Reactions.addXP(10);

      var container = document.getElementById('feed-container');
      if (container) {
        container.insertAdjacentHTML('afterbegin', _renderPost(post));
        _bindPost(post.id);
      }

      /* Clear form */
      catSelect.value = '';
      textarea.value  = '';
      var charCount = document.getElementById('char-count');
      if (charCount) charCount.textContent = '0';
      var warning = document.getElementById('ai-sensor-warning');
      if (warning) warning.setAttribute('hidden', '');
      submitBtn.disabled = false;

      if (window.showToast) window.showToast('Sambatan diposting! 📢');

      /* Scroll feed to top */
      var feedTab = document.getElementById('tab-feed');
      if (feedTab) feedTab.scrollTop = 0;
    });
  }

  /* --------------------------------------------------------
     Init
     -------------------------------------------------------- */
  function init() {
    var posts = getPosts();
    if (!posts) {
      posts = SEED_POSTS.slice();
      _savePosts(posts);
    }

    var container = document.getElementById('feed-container');
    if (container) {
      container.innerHTML = '';
      for (var i = 0; i < posts.length; i++) {
        container.insertAdjacentHTML('beforeend', _renderPost(posts[i]));
        _bindPost(posts[i].id);
      }
    }

    _bindAISensor();
    _bindCreateForm(posts);
  }

  /* --------------------------------------------------------
     Export
     -------------------------------------------------------- */
  window.Feed = {
    init: init,
    getPosts: getPosts
  };

})();
