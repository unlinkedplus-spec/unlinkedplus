/* ============================================================
   unlinked+ — shop.js
   IIFE exposing window.Shop.
   LocalStorage key: sambatin_purchases (array of item ids).
   ============================================================ */
(function () {
  'use strict';

  /* --------------------------------------------------------
     Catalog
     -------------------------------------------------------- */
  var CATALOG = [
    {
      id: 'kacamata',
      type: 'accessory',
      emoji: '👓',
      name: 'Kacamata Melorot Premium',
      desc: 'Aksesori eksklusif untuk tampil gagal dengan gaya. Melorot sempurna.',
      price: 10000,
      priceDisplay: 'Rp10.000'
    },
    {
      id: 'pack-sultan-rebahan',
      type: 'badge',
      emoji: '🛋️',
      name: 'Pack Sultan Rebahan',
      desc: 'Ekspresi eksklusif untuk mereka yang rebahan adalah produktivitas.',
      price: 15000,
      priceDisplay: 'Rp15.000'
    },
    {
      id: 'pack-overthinking-pro',
      type: 'badge',
      emoji: '🌀',
      name: 'Pack Overthinking Pro',
      desc: 'Koleksi ekspresi untuk level overthinking di atas rata-rata.',
      price: 12000,
      priceDisplay: 'Rp12.000'
    },
    {
      id: 'pack-rapat-zoom-piyama',
      type: 'badge',
      emoji: '💻',
      name: 'Pack Rapat Zoom Piyama',
      desc: 'Profesional dari pinggang ke atas. Piyama dari pinggang ke bawah.',
      price: 15000,
      priceDisplay: 'Rp15.000'
    },
    {
      id: 'badge-sultan-spill',
      type: 'badge',
      emoji: '👑',
      name: 'Lencana Sultan Spill',
      desc: 'Tunjukkan bahwa kamu adalah raja keluhan. Dihormati sesama budak korporat.',
      price: 10000,
      priceDisplay: 'Rp10.000'
    },
    {
      id: 'badge-founding-member',
      type: 'badge',
      emoji: '🏅',
      name: 'Lencana Founding Member',
      desc: 'Kamu salah satu yang pertama. Pendiri Sekte Spill sejati.',
      price: 10000,
      priceDisplay: 'Rp10.000'
    }
  ];

  var _currentItem = null;

  /* --------------------------------------------------------
     Persistence helpers
     -------------------------------------------------------- */
  function _getPurchases() {
    try {
      return JSON.parse(localStorage.getItem('sambatin_purchases') || '[]');
    } catch (e) {
      return [];
    }
  }

  function _hasPurchased(id) {
    return _getPurchases().indexOf(id) !== -1;
  }

  /* --------------------------------------------------------
     Render one shop item card
     -------------------------------------------------------- */
  function _renderItem(item) {
    var owned = _hasPurchased(item.id);
    return (
      '<div class="shop-item-card' + (owned ? ' owned' : '') + '">' +
        '<span class="shop-item-emoji">' + item.emoji + '</span>' +
        '<div class="shop-item-name">' + item.name + '</div>' +
        '<div class="shop-item-desc">' + item.desc + '</div>' +
        '<div class="shop-item-price">' + item.priceDisplay + '</div>' +
        (owned
          ? '<span class="badge" style="background:#22C55E;color:white;font-size:0.8rem;padding:5px 14px">✓ Dimiliki</span>'
          : '<button class="btn-primary btn-sm beli-btn" data-item-id="' + item.id + '">Beli Sekarang</button>'
        ) +
      '</div>'
    );
  }

  /* --------------------------------------------------------
     QR code generator — 10x10 deterministic SVG
     -------------------------------------------------------- */
  function _generateQR(itemId) {
    var svg = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="white"/>';
    for (var r = 0; r < 10; r++) {
      for (var c = 0; c < 10; c++) {
        var code = itemId.charCodeAt(r % itemId.length);
        var fill = ((code * (c + 1) * (r + 1)) % 3 === 0) ? '#1A2744' : 'white';
        svg += '<rect x="' + (c * 10) + '" y="' + (r * 10) + '" width="10" height="10" fill="' + fill + '"/>';
      }
    }
    svg += '</svg>';
    return svg;
  }

  /* --------------------------------------------------------
     Confetti burst
     -------------------------------------------------------- */
  function _triggerConfetti() {
    if (typeof window.confetti === 'function') {
      window.confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#F5C518', '#FF6B35', '#1A2744', '#ffffff', '#FF6B35']
      });
    }
  }

  /* --------------------------------------------------------
     Open QRIS modal
     -------------------------------------------------------- */
  function openModal(item) {
    _currentItem = item;

    var nameEl = document.getElementById('qris-item-name');
    var priceEl = document.getElementById('qris-item-price');
    var codeBox = document.getElementById('qris-code-box');
    var modal = document.getElementById('modal-qris');
    var overlay = document.getElementById('modal-overlay');

    if (nameEl) nameEl.textContent = item.name;
    if (priceEl) priceEl.textContent = item.priceDisplay;
    if (codeBox) codeBox.innerHTML = _generateQR(item.id);
    if (modal) modal.removeAttribute('hidden');
    if (overlay) overlay.removeAttribute('hidden');
  }

  /* --------------------------------------------------------
     Confirm purchase
     -------------------------------------------------------- */
  function _confirmPurchase() {
    if (!_currentItem) return;

    var purchases = _getPurchases();
    if (purchases.indexOf(_currentItem.id) === -1) {
      purchases.push(_currentItem.id);
      localStorage.setItem('sambatin_purchases', JSON.stringify(purchases));
    }

    var modal = document.getElementById('modal-qris');
    var overlay = document.getElementById('modal-overlay');
    if (modal) modal.setAttribute('hidden', '');
    if (overlay) overlay.setAttribute('hidden', '');

    _triggerConfetti();

    if (_currentItem.type === 'accessory' && typeof AvatarBuilder !== 'undefined') {
      AvatarBuilder.unlockAccessory(_currentItem.id);
    }

    Shop.init();

    if (typeof window.showToast === 'function') {
      window.showToast('🎉 Pembelian berhasil! ' + _currentItem.name + ' sudah kamu miliki.');
    }

    _currentItem = null;
  }

  /* --------------------------------------------------------
     Init — render grid and bind buy buttons
     -------------------------------------------------------- */
  function init() {
    var grid = document.getElementById('shop-grid');
    if (!grid) return;

    grid.innerHTML = '';
    for (var i = 0; i < CATALOG.length; i++) {
      grid.insertAdjacentHTML('beforeend', _renderItem(CATALOG[i]));
    }

    var beliBtns = grid.querySelectorAll('.beli-btn');
    for (var j = 0; j < beliBtns.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-item-id');
          var item = null;
          for (var k = 0; k < CATALOG.length; k++) {
            if (CATALOG[k].id === id) { item = CATALOG[k]; break; }
          }
          if (item) Shop.openModal(item);
        });
      })(beliBtns[j]);
    }
  }

  /* --------------------------------------------------------
     DOMContentLoaded bindings
     -------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    var confirmBtn = document.getElementById('qris-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', _confirmPurchase);
    }

    var cancelBtn = document.getElementById('qris-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        var modal = document.getElementById('modal-qris');
        var overlay = document.getElementById('modal-overlay');
        if (modal) modal.setAttribute('hidden', '');
        if (overlay) overlay.setAttribute('hidden', '');
        _currentItem = null;
      });
    }
  });

  /* --------------------------------------------------------
     Public API
     -------------------------------------------------------- */
  var Shop = {
    init: init,
    openModal: openModal
  };

  window.Shop = Shop;

})();
