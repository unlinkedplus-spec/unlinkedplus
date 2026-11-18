/* ============================================================
   SambatIn — app.js
   IIFE main controller.
   Exposes window.showToast and window.closeAllModals.
   ============================================================ */
(function () {
  'use strict';

  /* --------------------------------------------------------
     Level Thresholds
     -------------------------------------------------------- */
  var LEVELS = [
    { min: 0,   max: 49,       level: 1, name: 'Rapuh',         color: '#9CA3AF' },
    { min: 50,  max: 149,      level: 2, name: 'Tahan Banting',  color: '#60A5FA' },
    { min: 150, max: 299,      level: 3, name: 'Kebal Revisi',   color: '#A78BFA' },
    { min: 300, max: 499,      level: 4, name: 'Kebal PHP HRD',  color: '#F97316' },
    { min: 500, max: Infinity, level: 5, name: 'Suhu Sambat',    color: '#EF4444' }
  ];

  /* --------------------------------------------------------
     Helpers
     -------------------------------------------------------- */
  function _getThreshold(xp) {
    for (var i = 0; i < LEVELS.length; i++) {
      if (xp >= LEVELS[i].min && xp <= LEVELS[i].max) {
        return LEVELS[i];
      }
    }
    return LEVELS[LEVELS.length - 1];
  }

  /* --------------------------------------------------------
     XP / Level Display
     -------------------------------------------------------- */
  function updateLevelDisplay() {
    var xp = parseInt(localStorage.getItem('sambatin_xp') || '0', 10);
    var t = _getThreshold(xp);

    var badge = document.getElementById('user-level-badge');
    if (badge) {
      badge.textContent = t.name;
      badge.style.color = t.color;
      badge.style.background = t.color + '22';
    }

    var xpInBand = xp - t.min;
    var bandSize = t.max === Infinity ? 500 : (t.max - t.min + 1);
    var pct = Math.min(100, Math.round(xpInBand / bandSize * 100));

    var fill = document.getElementById('xp-fill');
    if (fill) {
      fill.style.width = pct + '%';
    }
  }

  /* --------------------------------------------------------
     Modal Management
     -------------------------------------------------------- */
  function closeAllModals() {
    var cert = document.getElementById('modal-cert');
    var qris = document.getElementById('modal-qris');
    var overlay = document.getElementById('modal-overlay');
    if (cert)    cert.setAttribute('hidden', '');
    if (qris)    qris.setAttribute('hidden', '');
    if (overlay) overlay.setAttribute('hidden', '');
  }

  /* --------------------------------------------------------
     Toast
     -------------------------------------------------------- */
  function showToast(msg) {
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.classList.add('show');
      });
    });

    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 350);
    }, 2500);
  }

  /* --------------------------------------------------------
     Profile Population
     -------------------------------------------------------- */
  function populateProfile() {
    var container = document.getElementById('profile-content');
    if (!container) return;

    var xp = parseInt(localStorage.getItem('sambatin_xp') || '0', 10);
    var t = _getThreshold(xp);
    var username = localStorage.getItem('sambatin_username') || 'BudakKorporat';

    /* Avatar SVG */
    var avatarSVG = '';
    try {
      var avatarState = JSON.parse(localStorage.getItem('sambatin_avatar') || '{}');
      var charId = avatarState.character || 'panda';
      var accs = avatarState.accessories || [];
      if (window.AvatarBuilder) {
        avatarSVG = window.AvatarBuilder.getAvatarSVG(charId, accs);
      }
    } catch (e) {}

    /* Post count */
    var posts = [];
    try {
      posts = JSON.parse(localStorage.getItem('sambatin_posts') || '[]');
    } catch (e) {}

    /* Reaction total */
    var totalReactions = 0;
    try {
      var reactions = JSON.parse(localStorage.getItem('sambatin_reactions') || '{}');
      for (var postId in reactions) {
        if (reactions.hasOwnProperty(postId)) {
          var r = reactions[postId];
          totalReactions += (r.pukpuk || 0) + (r.ngakak || 0) + (r.sama || 0);
        }
      }
    } catch (e) {}

    /* Purchases / badges */
    var purchases = [];
    try {
      purchases = JSON.parse(localStorage.getItem('sambatin_purchases') || '[]');
    } catch (e) {}

    var badgeItems = {
      'kacamata':      { emoji: '👓', name: 'Kacamata Melorot' },
      'badge-sultan':  { emoji: '👑', name: 'Sultan Sambat' },
      'badge-suhu':    { emoji: '🔥', name: 'Suhu Level' },
      'pack-expressi': { emoji: '🎭', name: 'Paket Ekspresi' }
    };

    var badgesHTML = '';
    if (purchases.length > 0) {
      badgesHTML = '<div class="badges-section-title">Lencana & Item</div><div class="badges-row">';
      for (var i = 0; i < purchases.length; i++) {
        var item = badgeItems[purchases[i]];
        if (item) {
          badgesHTML += '<span class="badge" style="background:var(--color-yellow);color:var(--color-navy)">' +
            item.emoji + ' ' + item.name + '</span>';
        }
      }
      badgesHTML += '</div>';
    } else {
      badgesHTML = '<div class="badges-section-title">Lencana & Item</div>' +
        '<p style="font-size:0.82rem;color:var(--color-gray-400);text-align:center">Belum ada lencana. Kunjungi Toko Sambat!</p>';
    }

    /* XP band progress */
    var xpInBand = xp - t.min;
    var bandSize = t.max === Infinity ? 500 : (t.max - t.min + 1);
    var pct = Math.min(100, Math.round(xpInBand / bandSize * 100));

    container.innerHTML = (
      '<div class="profile-section">' +
        '<div class="profile-avatar-wrap">' +
          '<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">' + avatarSVG + '</svg>' +
        '</div>' +
        '<div class="profile-username">' + username + '</div>' +
        '<div class="profile-level">⚡ Level ' + t.level + ' — ' + t.name + '</div>' +
        '<div class="profile-xp-area">' +
          '<div class="profile-xp-label">XP: ' + xp + ' / ' + (t.max === Infinity ? '∞' : t.max) + '</div>' +
          '<div class="xp-bar-lg"><div class="xp-fill-lg" style="width:' + pct + '%"></div></div>' +
        '</div>' +
        '<div class="profile-stats">' +
          '<div class="stat-card">' +
            '<div class="stat-num">' + posts.length + '</div>' +
            '<div class="stat-label">Total Sambatan</div>' +
          '</div>' +
          '<div class="stat-card">' +
            '<div class="stat-num">' + totalReactions + '</div>' +
            '<div class="stat-label">Total Reaksi</div>' +
          '</div>' +
        '</div>' +
        badgesHTML +
      '</div>'
    );
  }

  /* --------------------------------------------------------
     Tab Navigation
     -------------------------------------------------------- */
  function _activateTab(tabName) {
    /* Deactivate all nav items */
    var navItems = document.querySelectorAll('.nav-item[data-tab]');
    for (var i = 0; i < navItems.length; i++) {
      navItems[i].classList.remove('active');
    }

    /* Deactivate all panels */
    var panels = document.querySelectorAll('.tab-panel');
    for (var j = 0; j < panels.length; j++) {
      panels[j].classList.remove('active');
    }

    /* Activate selected nav item */
    var activeNav = document.querySelector('.nav-item[data-tab="' + tabName + '"]');
    if (activeNav) activeNav.classList.add('active');

    /* Activate selected panel */
    var activePanel = document.getElementById('tab-' + tabName);
    if (activePanel) activePanel.classList.add('active');

    /* Side-effects */
    if (tabName === 'avatar') {
      if (window.AvatarBuilder) {
        window.AvatarBuilder.init();
      }
    }
    if (tabName === 'profile') {
      populateProfile();
    }

    localStorage.setItem('sambatin_active_tab', tabName);
  }

  /* --------------------------------------------------------
     DOMContentLoaded
     -------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {

    /* Tab nav bindings */
    var navItems = document.querySelectorAll('.nav-item[data-tab]');
    for (var i = 0; i < navItems.length; i++) {
      (function (item) {
        item.addEventListener('click', function () {
          var tab = item.getAttribute('data-tab');
          _activateTab(tab);
        });
      })(navItems[i]);
    }

    /* Restore last active tab */
    var lastTab = localStorage.getItem('sambatin_active_tab') || 'feed';
    _activateTab(lastTab);

    /* Init other modules */
    if (typeof Feed !== 'undefined' && Feed.init) {
      Feed.init();
    }
    if (typeof Shop !== 'undefined' && Shop.init) {
      Shop.init();
    }

    /* Modal overlay closes all modals */
    var overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', closeAllModals);
    }

    /* XP change listener */
    window.addEventListener('sambatin:xp-changed', updateLevelDisplay);

    /* Open-shop event from avatar builder (premium gate) */
    window.addEventListener('sambatin:open-shop', function () {
      _activateTab('shop');
    });

    /* Initial level display */
    updateLevelDisplay();
  });

  /* --------------------------------------------------------
     Public Exports
     -------------------------------------------------------- */
  window.showToast = showToast;
  window.closeAllModals = closeAllModals;

})();
