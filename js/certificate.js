/* ============================================================
   Unlinked+ — certificate.js
   IIFE exposing window.Certificate.
   Uses html2canvas to render #cert-render-target as PNG.
   ============================================================ */
(function () {
  'use strict';

  var _currentPost = null;

  /* --------------------------------------------------------
     Open modal and populate fields
     -------------------------------------------------------- */
  function openModal(post) {
    _currentPost = post;

    var uEl = document.getElementById('cert-username');
    var cEl = document.getElementById('cert-category');
    var dEl = document.getElementById('cert-date');

    if (uEl) uEl.textContent = post.username;

    if (cEl) {
      var snippet = post.text.length > 55
        ? post.text.substring(0, 55) + '...'
        : post.text;
      cEl.textContent = post.category + ' — ' + snippet;
    }

    if (dEl) {
      var months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      var d = new Date();
      dEl.textContent = d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    }

    var modalCert = document.getElementById('modal-cert');
    var overlay   = document.getElementById('modal-overlay');
    if (modalCert) modalCert.removeAttribute('hidden');
    if (overlay)   overlay.removeAttribute('hidden');
  }

  /* --------------------------------------------------------
     Download certificate as PNG
     -------------------------------------------------------- */
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
      backgroundColor: '#F5C542'
    }).then(function (canvas) {
      var link = document.createElement('a');
      link.download = 'sertifikat-unlinkedplus.png';
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }).catch(function (e) {
      alert('Gagal download: ' + e.message);
    });
  }

  /* --------------------------------------------------------
     DOMContentLoaded — bind buttons
     -------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    var dlBtn = document.getElementById('cert-download-btn');
    if (dlBtn) dlBtn.addEventListener('click', downloadCert);

    var closeBtn = document.getElementById('cert-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        var modalCert = document.getElementById('modal-cert');
        var overlay   = document.getElementById('modal-overlay');
        if (modalCert) modalCert.setAttribute('hidden', '');
        if (overlay)   overlay.setAttribute('hidden', '');
      });
    }
  });

  /* --------------------------------------------------------
     Export
     -------------------------------------------------------- */
  window.Certificate = {
    openModal: openModal,
    downloadCert: downloadCert
  };

})();
