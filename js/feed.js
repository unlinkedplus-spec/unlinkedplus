/* SambatIn — feed.js (stub — implemented in FEAT-003) */
(function () {
  'use strict';

  var BANNED_PHRASES = [
    'alhamdulillah diterima',
    'gaji dua digit',
    'promosi jabatan',
    'bangga mengumumkan',
    'humbled and honored',
    'excited to announce',
    'thrilled to share',
    'blessed to',
    'naik gaji',
    'dapat offer'
  ];

  var CATEGORY_COLORS = {
    'Ditolak HRD':    '#EF4444',
    'Salah Kirim Chat': '#F97316',
    'Dimarahi Bos':   '#8B5CF6',
    'Bisnis Boncos':  '#06B6D4',
    'Salah Jurusan':  '#10B981'
  };

  var SEED_POSTS = [
    {
      id: 1,
      username: 'GhoibJobseeker',
      characterId: 'panda',
      accessories: ['id-card'],
      category: 'Ditolak HRD',
      text: 'Sudah 5 tahap interview, dari psikotes sampai wawancara user, terus HR-nya bilang "kami akan menghubungi kembali" — itu 3 bulan lalu. HP ku masih on, Bu HR 😭',
      timestamp: Date.now() - 1000 * 60 * 15
    },
    {
      id: 2,
      username: 'MagangAbadi99',
      characterId: 'intern',
      accessories: ['kopi'],
      category: 'Salah Kirim Chat',
      text: 'Niat ngirim meme bos jelek ke grup teman, malah kekirim ke grup kantor. Pak Direktur likenya duluan. Saya sedang mempertimbangkan pindah ke dimensi lain.',
      timestamp: Date.now() - 1000 * 60 * 60 * 2
    },
    {
      id: 3,
      username: 'RevisiJamSatu',
      characterId: 'freelancer',
      accessories: [],
      category: 'Dimarahi Bos',
      text: 'Klien minta revisi jam 11 malam hari Minggu. Bilangnya "sebentar aja". 4 jam kemudian saya masih di depan laptop sambil nangis dalam hati ngerjain slide deck-nya.',
      timestamp: Date.now() - 1000 * 60 * 60 * 5
    },
    {
      id: 4,
      username: 'StartupDreamer',
      characterId: 'php-victim',
      accessories: ['bendera'],
      category: 'Bisnis Boncos',
      text: 'Modal 15 juta, bakar 12 juta buat iklan, dapat 1 customer — dan itu teman sendiri yang kasihan. Pivot ke usaha lain katanya, tapi saya masih menatap kosong spreadsheet kerugian.',
      timestamp: Date.now() - 1000 * 60 * 60 * 24
    },
    {
      id: 5,
      username: 'TeknikNyasar',
      characterId: 'intern',
      accessories: ['kardus'],
      category: 'Salah Jurusan',
      text: 'Kuliah 4 tahun di Teknik Mesin, sekarang kerja jadi admin media sosial. Bukan salah siapa-siapa. Jurusan, orang tua, dan pasar kerja sama-sama bersalah.',
      timestamp: Date.now() - 1000 * 60 * 60 * 48
    }
  ];

  function _relativeTime(ts) {
    var diff = Date.now() - ts;
    var mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'baru saja';
    if (mins < 60) return mins + ' menit lalu';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24)  return hrs + ' jam lalu';
    var days = Math.floor(hrs / 24);
    return days + ' hari lalu';
  }

  function _getLevelInfo(username) {
    /* Deterministic level from username hash for seed posts */
    var n = 0;
    for (var i = 0; i < username.length; i++) n += username.charCodeAt(i);
    var xp = n % 500;
    return window.Reactions ? window.Reactions.getLevel(xp) : 1;
  }

  function _levelColor(level) {
    var colors = ['', '#9CA3AF', '#60A5FA', '#A78BFA', '#F97316', '#EF4444'];
    return colors[level] || '#9CA3AF';
  }

  function _levelName(level) {
    var names = ['', 'Rapuh', 'Tahan Banting', 'Kebal Revisi', 'Kebal PHP HRD', 'Suhu Sambat'];
    return names[level] || 'Rapuh';
  }

  function renderPost(post) {
    var avatarSVG = '';
    if (window.AvatarBuilder) {
      avatarSVG = window.AvatarBuilder.getAvatarSVG(post.characterId || 'panda', post.accessories || []);
    }

    var reactions = window.Reactions ? window.Reactions.getReactions(post.id) : { pukpuk: 0, ngakak: 0, sama: 0, myReactions: {} };
    var level = _getLevelInfo(post.username);
    var catColor = CATEGORY_COLORS[post.category] || '#9CA3AF';

    return (
      '<div class="post-card" id="post-' + post.id + '">' +
        '<div class="post-header">' +
          '<div class="post-avatar-wrap">' +
            '<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">' + avatarSVG + '</svg>' +
          '</div>' +
          '<div class="post-meta">' +
            '<div class="post-username">' + post.username + '</div>' +
            '<div class="post-badges">' +
              '<span class="level-badge" style="background:' + _levelColor(level) + '">Lv.' + level + ' ' + _levelName(level) + '</span>' +
              '<span class="cat-badge" style="background:' + catColor + '22;color:' + catColor + '">' + post.category + '</span>' +
            '</div>' +
          '</div>' +
          '<span class="post-timestamp">' + _relativeTime(post.timestamp) + '</span>' +
        '</div>' +
        '<p class="post-text">' + post.text + '</p>' +
        '<div class="reaction-row">' +
          '<button class="reaction-btn' + (reactions.myReactions && reactions.myReactions.pukpuk ? ' reacted' : '') + '" data-post-id="' + post.id + '" data-reaction="pukpuk">🫂 Puk-Puk <span class="rxn-count">' + (reactions.pukpuk || 0) + '</span></button>' +
          '<button class="reaction-btn' + (reactions.myReactions && reactions.myReactions.ngakak ? ' reacted' : '') + '" data-post-id="' + post.id + '" data-reaction="ngakak">😂 Ngakak <span class="rxn-count">' + (reactions.ngakak || 0) + '</span></button>' +
          '<button class="reaction-btn' + (reactions.myReactions && reactions.myReactions.sama ? ' reacted' : '') + '" data-post-id="' + post.id + '" data-reaction="sama">🤝 Sama Banget <span class="rxn-count">' + (reactions.sama || 0) + '</span></button>' +
          '<button class="cert-btn" data-post-id="' + post.id + '">🏆 Sertifikat</button>' +
        '</div>' +
      '</div>'
    );
  }

  function _bindPostEvents(postEl, post) {
    /* Reaction buttons */
    var rxnBtns = postEl.querySelectorAll('.reaction-btn[data-post-id]');
    for (var i = 0; i < rxnBtns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var pid = btn.getAttribute('data-post-id');
          var type = btn.getAttribute('data-reaction');
          if (window.Reactions) window.Reactions.addReaction(pid, type);

          /* Update counts in-place */
          var r = window.Reactions ? window.Reactions.getReactions(pid) : { pukpuk: 0, ngakak: 0, sama: 0, myReactions: {} };
          var allBtns = document.querySelectorAll('.reaction-btn[data-post-id="' + pid + '"]');
          for (var j = 0; j < allBtns.length; j++) {
            var b = allBtns[j];
            var t = b.getAttribute('data-reaction');
            var countEl = b.querySelector('.rxn-count');
            if (countEl) countEl.textContent = r[t] || 0;
            if (r.myReactions && r.myReactions[t]) {
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
        if (window.Certificate) window.Certificate.openModal(post);
      });
    }
  }

  function _loadPosts() {
    try {
      var raw = localStorage.getItem('sambatin_posts');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function _savePosts(posts) {
    try { localStorage.setItem('sambatin_posts', JSON.stringify(posts)); } catch (e) {}
  }

  function _bindAISensor() {
    var textarea = document.getElementById('post-text');
    var warning = document.getElementById('ai-sensor-warning');
    var submitBtn = document.getElementById('post-submit-btn');
    var charCount = document.getElementById('char-count');

    if (!textarea) return;

    textarea.addEventListener('input', function () {
      var text = textarea.value.toLowerCase();
      if (charCount) charCount.textContent = textarea.value.length;

      var blocked = false;
      for (var i = 0; i < BANNED_PHRASES.length; i++) {
        if (text.indexOf(BANNED_PHRASES[i]) !== -1) {
          blocked = true;
          break;
        }
      }

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

  function _bindCreateForm(posts) {
    var submitBtn = document.getElementById('post-submit-btn');
    if (!submitBtn) return;

    submitBtn.addEventListener('click', function () {
      var category = document.getElementById('post-category');
      var textarea = document.getElementById('post-text');

      if (!category || !textarea) return;
      if (!category.value) { alert('Pilih kategori dulu ya!'); return; }
      if (!textarea.value.trim()) { alert('Ceritakan kegagalanmu dulu!'); return; }

      /* Get current avatar state */
      var charId = 'panda';
      var accs = [];
      try {
        var avState = JSON.parse(localStorage.getItem('sambatin_avatar') || '{}');
        charId = avState.character || 'panda';
        accs = avState.accessories || [];
      } catch (e) {}

      var username = localStorage.getItem('sambatin_username') ||
        ('BudakKorporat_' + Math.floor(Math.random() * 9000 + 1000));
      localStorage.setItem('sambatin_username', username);

      var post = {
        id: Date.now(),
        username: username,
        characterId: charId,
        accessories: accs,
        category: category.value,
        text: textarea.value.trim(),
        timestamp: Date.now()
      };

      posts.unshift(post);
      _savePosts(posts);

      if (window.Reactions) window.Reactions.addXP(10);

      /* Prepend to feed */
      var container = document.getElementById('feed-container');
      if (container) {
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = renderPost(post);
        var postEl = tempDiv.firstChild;
        _bindPostEvents(postEl, post);
        container.insertBefore(postEl, container.firstChild);
        container.scrollTop = 0;
      }

      /* Clear form */
      category.value = '';
      textarea.value = '';
      var charCount = document.getElementById('char-count');
      if (charCount) charCount.textContent = '0';
      var warning = document.getElementById('ai-sensor-warning');
      if (warning) warning.setAttribute('hidden', '');
      submitBtn.disabled = false;

      if (window.showToast) window.showToast('Sambatan diposting! 📢');
    });
  }

  function init() {
    var posts = _loadPosts();
    var isFirst = posts === null;
    if (isFirst) {
      posts = SEED_POSTS.slice();
      _savePosts(posts);
    }

    var container = document.getElementById('feed-container');
    if (container) {
      container.innerHTML = '';
      var fragment = document.createDocumentFragment();
      for (var i = 0; i < posts.length; i++) {
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = renderPost(posts[i]);
        var postEl = tempDiv.firstChild;
        _bindPostEvents(postEl, posts[i]);
        fragment.appendChild(postEl);
      }
      container.appendChild(fragment);
    }

    _bindAISensor();
    _bindCreateForm(posts);
  }

  window.Feed = {
    init: init,
    renderPost: renderPost
  };

})();
