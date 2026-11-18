/* SambatIn — shop.js (stub — implemented in FEAT-004) */
(function () {
  'use strict';

  var CATALOG = [
    {
      id: 'kacamata',
      type: 'accessory',
      emoji: '👓',
      name: 'Kacamata Melorot',
      desc: 'Aksesori eksklusif untuk tampil lebih "nggak peduli" di kantor.',
      price: 10000
    },
    {
      id: 'badge-sultan',
      type: 'badge',
      emoji: '👑',
      name: 'Lencana Sultan Sambat',
      desc: 'Gelar kehormatan bagi mereka yang sudah menyambat level dewa.',
      price: 15000
    },
    {
      id: 'badge-suhu',
      type: 'badge',
      emoji: '🔥',
      name: 'Lencana Suhu Level',
      desc: 'Hanya untuk yang sudah merasakan semua jenis penolakan HRD.',
      price: 12000
    },
    {
      id: 'pack-expressi',
      type: 'badge',
      emoji: '🎭',
      name: 'Paket Ekspresi Premium',
      desc: '5 ekspresi wajah eksklusif untuk avatar budak korporatmu.',
      price: 15000
    }
  ];

  var _currentItem = null;

  function _getPurchases() {
    try { return JSON.parse(localStorage.getItem('sambatin_purchases') || '[]'); } catch (e) { return []; }
  }

  function _savePurchases(arr) {
    try { localStorage.setItem('sambatin_purchases', JSON.stringify(arr)); } catch (e) {}
  }

  function _formatPrice(n) {
    return 'Rp' + n.toLocaleString('id-ID');
  }

  function _genQRSVG(seed) {
    var size = 15;
    var cellSize = 11;
    var svg = '<svg viewBox="0 0 ' + (size * cellSize) + ' ' + (size * cellSize) + '" xmlns="http://www.w3.org/2000/svg">';
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        var filled = ((seed.charCodeAt(r % seed.length) * (c + 1) * (r + 1)) % 3) === 0;
        if (filled) {
          svg += '<rect x="' + (c * cellSize) + '" y="' + (r * cellSize) + '" width="' + cellSize + '" height="' + cellSize + '" fill="#1A2744"/>';
        }
      }
    }
    svg += '</svg>';
    return svg;
  }

  function openModal(item) {
    _currentItem = item;

    var nameEl = document.getElementById('qris-item-name');
    var priceEl = document.getElementById('qris-item-price');
    var codeBox = document.getElementById('qris-code-box');

    if (nameEl) nameEl.textContent = item.emoji + ' ' + item.name;
    if (priceEl) priceEl.textContent = _formatPrice(item.price);
    if (codeBox) codeBox.innerHTML = _genQRSVG(item.id);

    var modalQris = document.getElementById('modal-qris');
    var overlay = document.getElementById('modal-overlay');
    if (modalQris) modalQris.removeAttribute('hidden');
    if (overlay) overlay.removeAttribute('hidden');
  }

  function confirmPurchase() {
    if (!_currentItem) return;

    var purchases = _getPurchases();
    if (purchases.indexOf(_currentItem.id) === -1) {
      purchases.push(_currentItem.id);
      _savePurchases(purchases);
    }

    if (window.closeAllModals) window.closeAllModals();

    if (typeof confetti === 'function') {
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ['#F5C518','#FF6B35','#1A2744','#ffffff'] });
    }

    if (_currentItem.type === 'accessory' && window.AvatarBuilder) {
      window.AvatarBuilder.unlockAccessory(_currentItem.id);
    }

    init();

    if (window.showToast) window.showToast('Pembelian berhasil! 🎉');
    _currentItem = null;
  }

  function renderShopItem(item) {
    var purchases = _getPurchases();
    var owned = purchases.indexOf(item.id) !== -1;
    var actionHTML = owned
      ? '<span class="badge" style="background:#22C55E;color:white">Dimiliki ✓</span>'
      : '<button class="btn-primary btn-sm beli-btn" data-item-id="' + item.id + '">Beli</button>';

    return (
      '<div class="shop-item-card">' +
        '<span class="shop-item-emoji">' + item.emoji + '</span>' +
        '<div class="shop-item-name">' + item.name + '</div>' +
        '<div class="shop-item-desc">' + item.desc + '</div>' +
        '<div class="shop-item-price">' + _formatPrice(item.price) + '</div>' +
        actionHTML +
      '</div>'
    );
  }

  function init() {
    var grid = document.getElementById('shop-grid');
    if (!grid) return;

    grid.innerHTML = '';
    for (var i = 0; i < CATALOG.length; i++) {
      grid.innerHTML += renderShopItem(CATALOG[i]);
    }

    var beliBtns = grid.querySelectorAll('.beli-btn');
    for (var j = 0; j < beliBtns.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var itemId = btn.getAttribute('data-item-id');
          var item = null;
          for (var k = 0; k < CATALOG.length; k++) {
            if (CATALOG[k].id === itemId) { item = CATALOG[k]; break; }
          }
          if (item) openModal(item);
        });
      })(beliBtns[j]);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var confirmBtn = document.getElementById('qris-confirm-btn');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmPurchase);

    var cancelBtn = document.getElementById('qris-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        if (window.closeAllModals) window.closeAllModals();
        _currentItem = null;
      });
    }
  });

  window.Shop = {
    init: init,
    openModal: openModal,
    confirmPurchase: confirmPurchase
  };

})();
