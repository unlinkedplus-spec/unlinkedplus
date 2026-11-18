(function () {
  'use strict';

  /* ============================================================
     Unlinked+ — landing.js
     Responsibilities:
       (a) Waitlist form — submit, quota decrement, localStorage
       (b) Certificate live preview — input binding + PNG download
       (c) Feature card entrance — IntersectionObserver
     ============================================================ */

  /* ----------------------------------------------------------
     (a) Waitlist Form
     ---------------------------------------------------------- */
  function initWaitlistForm() {
    var btn     = document.getElementById('waitlist-btn');
    var input   = document.getElementById('waitlist-input');
    var success = document.getElementById('waitlist-success');
    var counter = document.getElementById('quota-count');

    if (!btn || !input || !success || !counter) { return; }

    // Initialise quota from localStorage (default 142)
    var stored = parseInt(localStorage.getItem('sambatin_quota'), 10);
    var quota  = isNaN(stored) ? 142 : stored;
    counter.textContent = quota;

    btn.addEventListener('click', function () {
      var value = input.value.trim();
      if (!value) {
        input.focus();
        input.style.borderColor = '#EF4444';
        setTimeout(function () { input.style.borderColor = ''; }, 1000);
        return;
      }

      // Decrement quota (floor at 0)
      if (quota > 0) {
        quota -= 1;
      }
      localStorage.setItem('sambatin_quota', String(quota));
      counter.textContent = quota;

      // Store submission
      var list = JSON.parse(localStorage.getItem('sambatin_waitlist') || '[]');
      list.push(value);
      localStorage.setItem('sambatin_waitlist', JSON.stringify(list));

      // Update UI
      input.value = '';
      success.removeAttribute('hidden');
      btn.disabled = true;

      // Confetti burst
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.5 }
        });
      }
    });
  }

  /* ----------------------------------------------------------
     (b) Certificate Live Preview
     ---------------------------------------------------------- */
  function initCertPreview() {
    var certInput   = document.getElementById('cert-input');
    var certPreview = document.getElementById('cert-failure-preview');
    var dlBtn       = document.getElementById('cert-download-landing');

    if (certInput && certPreview) {
      certInput.addEventListener('input', function (e) {
        var val = e.target.value.trim();
        certPreview.textContent = val || '[ketik kegagalanmu di atas]';
      });
    }

    if (dlBtn) {
      dlBtn.addEventListener('click', function () {
        var card = document.getElementById('cert-card-preview');
        if (!card) { return; }

        if (typeof html2canvas !== 'function') {
          alert('Maaf, html2canvas belum dimuat. Coba refresh halaman.');
          return;
        }

        // Temporarily hide the download button so it doesn't appear in the PNG
        dlBtn.style.display = 'none';

        html2canvas(card, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#F5C542'
        }).then(function (canvas) {
          var link      = document.createElement('a');
          link.download = 'sertifikat-kegagalan.png';
          link.href     = canvas.toDataURL('image/png');
          link.click();
          dlBtn.style.display = '';
        }, function (err) {
          console.error('html2canvas error:', err);
          dlBtn.style.display = '';
        });
      });
    }
  }

  /* ----------------------------------------------------------
     (c) Feature Card IntersectionObserver
     ---------------------------------------------------------- */
  function initCardAnimations() {
    var cards = document.querySelectorAll('.feature-card');
    if (!cards.length) { return; }

    // Fallback for browsers without IntersectionObserver
    if (!('IntersectionObserver' in window)) {
      for (var i = 0; i < cards.length; i++) {
        cards[i].classList.add('visible');
      }
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    for (var j = 0; j < cards.length; j++) {
      observer.observe(cards[j]);
    }
  }

  /* ----------------------------------------------------------
     Bootstrap on DOMContentLoaded
     ---------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initWaitlistForm();
    initCertPreview();
    initCardAnimations();
  });

})();
