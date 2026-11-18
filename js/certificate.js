/* SambatIn — certificate.js (stub — implemented in FEAT-003) */
(function () {
  'use strict';

  var _currentPost = null;

  function _formatDate(ts) {
    var d = new Date(ts || Date.now());
    var MONTHS = ['Januari','Februari','Maret','April','Mei','Juni',
                  'Juli','Agustus','September','Oktober','November','Desember'];
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  function openModal(post) {
    _currentPost = post;

    var uEl = document.getElementById('cert-username');
    var cEl = document.getElementById('cert-category');
    var dEl = document.getElementById('cert-date');

    if (uEl) uEl.textContent = post.username;
    if (cEl) {
      var snippet = post.text.length > 60 ? post.text.substring(0, 60) + '...' : post.text;
      cEl.textContent = post.category + ' — ' + snippet;
    }
    if (dEl) dEl.textContent = _formatDate(post.timestamp);

    var modalCert = document.getElementById('modal-cert');
    var overlay = document.getElementById('modal-overlay');
    if (modalCert) modalCert.removeAttribute('hidden');
    if (overlay) overlay.removeAttribute('hidden');
  }

  function downloadCert() {
    var target = document.getElementById('cert-render-target');
    if (!target) return;
    if (typeof html2canvas === 'undefined') {
      alert('html2canvas belum dimuat. Coba lagi dalam sebentar.');
      return;
    }
    html2canvas(target, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#F5C518'
    }).then(function (canvas) {
      var link = document.createElement('a');
      link.download = 'sertifikat-sambatin.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var dlBtn = document.getElementById('cert-download-btn');
    if (dlBtn) dlBtn.addEventListener('click', downloadCert);

    var closeBtn = document.getElementById('cert-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        var modalCert = document.getElementById('modal-cert');
        var overlay = document.getElementById('modal-overlay');
        if (modalCert) modalCert.setAttribute('hidden', '');
        if (overlay) overlay.setAttribute('hidden', '');
      });
    }
  });

  window.Certificate = {
    openModal: openModal,
    downloadCert: downloadCert
  };

})();
