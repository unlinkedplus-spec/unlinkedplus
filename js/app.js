/* ============================================================
   unlinked+ — app.js
   Interactive functionality for landing page
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
  // Navigation functionality
  initNavigation();
  initPersonalNavigation();
  initTopicFilters();
  initComposer();
  initPostInteractions();
  initModals();
  initMobileNav();
  initMobileShell();
});

// ============================================================
// Main Navigation (Left Sidebar)
// ============================================================

/**
 * Ambil label menu TANPA ikon dan tanpa indikator <i>.
 *
 * Versi lama memakai `this.textContent.trim()` yang menghasilkan "⌂Beranda",
 * sehingga semua `case` di handleNavigation tidak pernah cocok dan setiap
 * menu jatuh ke default.
 */
function getNavLabel(element) {
  const icon = element.querySelector('.nav-icon, span');
  const small = element.querySelector('small');
  if (small && small.textContent.trim()) return small.textContent.trim();

  let text = element.textContent || '';
  if (icon && icon.textContent) {
    text = text.replace(icon.textContent, '');
  }
  return text.replace(/\s+/g, ' ').trim();
}

function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();

      const label = getNavLabel(this);

      // Active state dikelola terpusat agar konsisten saat fitur berpindah
      // sendiri (mis. dari Komunitas ke Discover).
      if (window.Features) {
        window.Features.setActive(label);
      } else {
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
      }

      handleNavigation(label);
    });
  });
}

function focusComposer() {
  const textarea = document.querySelector('.composer textarea');
  const composer = document.querySelector('.composer');
  if (!composer) return;
  composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (textarea) {
    textarea.focus({ preventScroll: true });
    composer.classList.add('composer-highlight');
    setTimeout(() => composer.classList.remove('composer-highlight'), 1200);
  }
}

function handleNavigation(label) {
  // Semua fitur nyata ditangani modul Features (js/features.js).
  if (window.Features && window.Features.open(label)) {
    return;
  }

  switch (label) {
    case 'Beranda':
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'Spill':
      focusComposer();
      break;
    default:
      showNotification('Menu "' + label + '" belum tersedia.');
  }
}

// ============================================================
// Personal Navigation (Ruang Kamu)
// ============================================================
function initPersonalNavigation() {
  const personalNavItems = document.querySelectorAll('.personal-nav-item');
  personalNavItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();

      personalNavItems.forEach(nav => nav.classList.remove('active'));
      this.classList.add('active');

      handlePersonalNavigation(getNavLabel(this));
    });
  });
}

function handlePersonalNavigation(label) {
  // "Ruang Kamu" memakai nama yang berbeda untuk fitur yang sama.
  const alias = { Avatar: 'Avatar', Toko: 'Store' };
  const target = alias[label] || label;

  if (window.Features && window.Features.open(target)) {
    window.Features.setActive(label === 'Toko' ? 'Store' : target);
    return;
  }

  switch (label) {
    case 'Beranda':
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'Spill':
      focusComposer();
      break;
    default:
      showNotification('Menu "' + label + '" belum tersedia.');
  }
}

// ============================================================
// Topic Filters
// ============================================================
function initTopicFilters() {
  const topicButtons = document.querySelectorAll('.topic-strip button');
  let selectedTopic = null;

  topicButtons.forEach(button => {
    button.addEventListener('click', function() {
      const topic = this.textContent.trim();

      if (selectedTopic === topic) {
        // Deselect
        this.classList.remove('topic-selected');
        selectedTopic = null;
        filterPostsByTopic('');
      } else {
        // Select new topic
        topicButtons.forEach(btn => btn.classList.remove('topic-selected'));
        this.classList.add('topic-selected');
        selectedTopic = topic;
        filterPostsByTopic(topic);
      }
    });
  });

  // "Lihat semua" button
  const allTopicsBtn = document.querySelector('.all-topics');
  if (allTopicsBtn) {
    allTopicsBtn.addEventListener('click', function() {
      topicButtons.forEach(btn => btn.classList.remove('topic-selected'));
      selectedTopic = null;
      filterPostsByTopic('');
    });
  }
}

function filterPostsByTopic(topic) {
  const posts = document.querySelectorAll('.post-card');
  posts.forEach(post => {
    if (!topic) {
      post.style.display = 'block';
    } else {
      const postText = post.querySelector('.post-text')?.textContent.toLowerCase() || '';
      const isMatch = postText.includes(topic.toLowerCase().replace('#', '')) ||
                     postText.includes('burnout') ||
                     postText.includes('resign') ||
                     postText.includes('kerja');
      post.style.display = isMatch ? 'block' : 'none';
    }
  });
}

// ============================================================
// Post Composer
// ============================================================
function initComposer() {
  const composer = document.querySelector('.composer');
  if (!composer) return;

  const textarea = composer.querySelector('textarea');
  const spillButton = composer.querySelector('.spill-button');
  const charCount = composer.querySelector('.char-count');
  const attachmentButtons = composer.querySelectorAll('.composer-attachments button');

  // Character count
  if (textarea && charCount) {
    textarea.addEventListener('input', function() {
      const count = this.value.length;
      charCount.textContent = `${count}/1200`;

      if (count > 1200) {
        charCount.style.color = '#ef4444';
        spillButton.disabled = true;
      } else {
        charCount.style.color = '#9ca3af';
        spillButton.disabled = count === 0;
      }
    });
  }

  // Spill button
  if (spillButton) {
    spillButton.addEventListener('click', function(e) {
      e.preventDefault();
      const content = textarea?.value.trim();

      if (!content) {
        showNotification('Silakan tulis cerita Anda terlebih dahulu');
        return;
      }

      if (content.length > 1200) {
        showNotification('Cerita terlalu panjang. Maksimal 1200 karakter');
        return;
      }

      // Create new post
      createNewPost(content);

      // Clear textarea
      textarea.value = '';
      charCount.textContent = '0/1200';
      spillButton.disabled = true;

      showNotification('Spill berhasil dipublikasikan! 🎉');
    });
  }

  // Attachment buttons
  attachmentButtons.forEach(button => {
    button.addEventListener('click', function() {
      const label = this.querySelector('span')?.textContent.trim();
      showNotification(`Fitur ${label} akan segera hadir!`);
    });
  });
}

function createNewPost(content) {
  const feedColumn = document.querySelector('.feed-column');
  if (!feedColumn) return;

  const feedHeading = feedColumn.querySelector('.feed-heading');
  if (!feedHeading) return;

  // Create new post element
  const newPost = document.createElement('article');
  newPost.className = 'post-card';
  newPost.innerHTML = `
    <div class="post-top">
      <div class="post-avatar">
        <img src="images/mascot-avatar.png" alt=""/>
      </div>
      <div class="post-author">
        <b>Tamu <span class="crown">♛</span></b>
        <small>Baru saja</small>
      </div>
      <button class="more-button" aria-label="Opsi postingan">•••</button>
    </div>
    <p class="post-text">${escapeHtml(content)}</p>
    <div class="reaction-list">
      <button onclick="reactToPost(this, '👋', 'Puk-Puk')">
        <span>👋</span>
        <span>Puk-Puk</span> <b>(0)</b>
      </button>
      <button onclick="reactToPost(this, '😂', 'Ngakak')">
        <span>😂</span>
        <span>Ngakak</span> <b>(0)</b>
      </button>
      <button onclick="reactToPost(this, '🙂', 'Sama Banget')">
        <span>🙂</span>
        <span>Sama Banget</span> <b>(0)</b>
      </button>
    </div>
    <div class="post-actions">
      <button>♧ <span>0</span></button>
      <button>⇄ <span>0</span></button>
      <button>♧ <span>Simpan</span></button>
      <button>↗ <span>Bagikan</button>
    </div>
  `;

  // Insert after feed heading
  feedHeading.insertAdjacentElement('afterend', newPost);

  // Add animation
  newPost.style.animation = 'fadeInUp 0.5s ease-out';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================
// Post Interactions
// ============================================================
function initPostInteractions() {
  // Reaction buttons
  const reactionButtons = document.querySelectorAll('.reaction-list button');
  reactionButtons.forEach(button => {
    button.addEventListener('click', function() {
      const emoji = this.querySelector('span:first-child')?.textContent;
      const label = this.querySelector('span:nth-child(2)')?.textContent;
      reactToPost(this, emoji, label);
    });
  });

  // More buttons
  const moreButtons = document.querySelectorAll('.more-button');
  moreButtons.forEach(button => {
    button.addEventListener('click', function() {
      showNotification('Opsi postingan akan segera hadir!');
    });
  });

  // Post action buttons
  const postActions = document.querySelectorAll('.post-actions button');
  postActions.forEach(button => {
    button.addEventListener('click', function() {
      const action = this.querySelector('span')?.textContent || this.textContent;
      showNotification(`Fitur ${action} akan segera hadir!`);
    });
  });

  // Trend rows
  const trendRows = document.querySelectorAll('.trend-row');
  trendRows.forEach(row => {
    row.addEventListener('click', function() {
      const topic = this.querySelector('b')?.textContent;
      const topicButtons = document.querySelectorAll('.topic-strip button');
      topicButtons.forEach(btn => {
        if (btn.textContent.trim() === topic) {
          btn.click();
        }
      });
    });
  });

  // Refresh button
  const refreshBtn = document.querySelector('.refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      showNotification('Memuat ulang cerita...');
      setTimeout(() => {
        showNotification('Cerita berhasil dimuat ulang!');
      }, 1000);
    });
  }

  // Sponsored button
  const sponsoredBtn = document.querySelector('.sponsored-copy button');
  if (sponsoredBtn) {
    sponsoredBtn.addEventListener('click', function() {
      showNotification('Mengarahkan ke halaman kursus...');
    });
  }

  // Plus card button
  const plusBtn = document.querySelector('.plus-card button');
  if (plusBtn) {
    plusBtn.addEventListener('click', function() {
      if (window.Features && window.Features.open('unlinked+ Plus')) {
        window.Features.setActive('unlinked+ Plus');
        return;
      }
      showNotification('Fitur berbayar akan segera hadir!');
    });
  }
}

function reactToPost(button, emoji, label) {
  const countElement = button.querySelector('b');
  if (!countElement) return;

  // Get current count
  const currentText = countElement.textContent.replace(/[()]/g, '');
  let count = parseInt(currentText) || 0;

  // Toggle reaction
  if (button.classList.contains('reacted')) {
    count--;
    button.classList.remove('reacted');
  } else {
    count++;
    button.classList.add('reacted');
  }

  // Update count
  countElement.textContent = `(${count})`;

  // Visual feedback
  button.style.transform = 'scale(1.1)';
  setTimeout(() => {
    button.style.transform = 'scale(1)';
  }, 150);
}

// ============================================================
// Modals
// ============================================================
function initModals() {
  // Join button
  const joinButton = document.querySelector('.join-button');
  if (joinButton) {
    joinButton.addEventListener('click', function() {
      showAuthModal();
    });
  }

  // Profile bubble
  const profileBubble = document.querySelector('.profile-bubble');
  if (profileBubble) {
    profileBubble.addEventListener('click', function() {
      if (window.Features && window.Features.open('Profil')) {
        window.Features.setActive('Profil');
        return;
      }
      showAuthModal();
    });
  }

  // Hero CTA button
  const heroCtaButton = document.querySelector('.hero-cta button');
  if (heroCtaButton) {
    heroCtaButton.addEventListener('click', function() {
      document.getElementById('composer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // Hero CTA link
  const heroCtaLink = document.querySelector('.hero-cta a');
  if (heroCtaLink) {
    heroCtaLink.addEventListener('click', function(e) {
      e.preventDefault();
      document.getElementById('feed')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Notification button
  const notificationButton = document.querySelector('.notification-button');
  if (notificationButton) {
    notificationButton.addEventListener('click', function() {
      showNotification('Tidak ada notifikasi baru');
    });
  }

  // Icon buttons
  const iconButtons = document.querySelectorAll('.icon-button:not(.notification-button)');
  iconButtons.forEach(button => {
    button.addEventListener('click', function() {
      const label = this.getAttribute('aria-label');
      if (label === 'Toko' && window.Features && window.Features.open('Store')) {
        window.Features.setActive('Store');
        return;
      }
      showNotification('Fitur ini akan segera hadir!');
    });
  });

  // Sidebar promo button
  const sidebarPromoBtn = document.querySelector('.sidebar-promo button');
  if (sidebarPromoBtn) {
    sidebarPromoBtn.addEventListener('click', function() {
      if (window.Features && window.Features.open('Komunitas')) {
        window.Features.setActive('Komunitas');
        return;
      }
      showNotification('Mengarahkan ke halaman komunitas...');
    });
  }

  // Social links
  const socialLinks = document.querySelectorAll('.social-links span');
  socialLinks.forEach(link => {
    link.addEventListener('click', function() {
      showNotification('Mengarahkan ke media sosial...');
    });
  });
}

function showAuthModal() {
  // Create modal if it doesn't exist
  let modal = document.getElementById('auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <h2>Selamat Datang di unlinked+</h2>
        <p>Platform untuk berbagi cerita tanpa perlu pamer pencapaian.</p>
        <form id="auth-form">
          <input type="text" placeholder="Nama samaran" required>
          <input type="email" placeholder="Email" required>
          <button type="submit" class="btn-primary">Gabung Sekarang</button>
        </form>
        <button class="btn-ghost" onclick="closeModal('auth-modal')">Tutup</button>
      </div>
    `;
    document.body.appendChild(modal);

    // Handle form submit
    const form = modal.querySelector('#auth-form');
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      showNotification('Berhasil login! Selamat datang! 🎉');
      closeModal('auth-modal');
    });
  }

  modal.hidden = false;
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.hidden = true;
  }
}

// ============================================================
// Mobile Navigation
// ============================================================
function initMobileNav() {
  const mobileNav = document.querySelector('.mobile-nav');
  if (!mobileNav) return;

  const mobileNavButtons = mobileNav.querySelectorAll('button');
  const alias = { Toko: 'Store', Avatar: 'Avatar' };

  mobileNavButtons.forEach(button => {
    button.addEventListener('click', function() {
      mobileNavButtons.forEach(btn => btn.classList.remove('selected'));
      this.classList.add('selected');

      // getNavLabel sudah membaca <small>, jadi label selalu bersih.
      const label = getNavLabel(this);
      const target = alias[label] || label;

      if (window.Features && window.Features.open(target)) {
        window.Features.setActive(target);
        return;
      }
      handleNavigation(label);
    });
  });
}

// ============================================================
// Mobile Shell: drawer sidebar, keranjang, dan tutup otomatis
// ============================================================
function toggleDrawer(force) {
  const open = typeof force === 'boolean' ? force : !document.body.classList.contains('nav-open');
  document.body.classList.toggle('nav-open', open);

  const overlay = document.getElementById('nav-overlay');
  const toggle = document.getElementById('mobile-menu-toggle');
  if (overlay) overlay.hidden = !open;
  if (toggle) toggle.setAttribute('aria-expanded', String(open));
}

function updateCartCount() {
  const badge = document.getElementById('mobile-cart-count');
  if (!badge) return;
  try {
    const inv = JSON.parse(localStorage.getItem('unlinked.inventory') || '[]');
    badge.textContent = String(Array.isArray(inv) ? inv.length : 0);
  } catch (e) {
    badge.textContent = '0';
  }
}

function initMobileShell() {
  const toggle = document.getElementById('mobile-menu-toggle');
  const close = document.getElementById('drawer-close');
  const overlay = document.getElementById('nav-overlay');
  const cart = document.getElementById('mobile-cart');

  if (toggle) toggle.addEventListener('click', function() { toggleDrawer(); });
  if (close) close.addEventListener('click', function() { toggleDrawer(false); });
  if (overlay) overlay.addEventListener('click', function() { toggleDrawer(false); });

  if (cart) {
    cart.addEventListener('click', function() {
      if (window.Features && window.Features.open('Store')) {
        window.Features.setActive('Store');
      }
    });
  }

  // Tutup drawer setelah memilih menu, dan saat layar melebar ke desktop.
  document.querySelectorAll('.left-sidebar .nav-item').forEach(item => {
    item.addEventListener('click', function() {
      if (window.matchMedia('(max-width: 1050px)').matches) toggleDrawer(false);
    });
  });

  window.addEventListener('resize', function() {
    if (window.innerWidth > 1050) toggleDrawer(false);
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') toggleDrawer(false);
  });

  updateCartCount();

  // Badge keranjang ikut berubah saat pembelian di Store.
  window.addEventListener('unlinked:inventory', updateCartCount);
  window.addEventListener('storage', function(e) {
    if (!e.key || e.key === 'unlinked.inventory') updateCartCount();
  });
}

// ============================================================
// Notification System
// ============================================================
function showNotification(message) {
  // Remove existing notification
  const existing = document.querySelector('.notification-toast');
  if (existing) {
    existing.remove();
  }

  // Create notification
  const notification = document.createElement('div');
  notification.className = 'notification-toast';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: #172b4d;
    color: white;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    z-index: 1000;
    animation: fadeInUp 0.3s ease-out;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;

  document.body.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'fadeOutDown 0.3s ease-out';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Add fadeOutDown animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOutDown {
    from {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    to {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
  }
`;
document.head.appendChild(style);

// ============================================================
// Search Functionality
// ============================================================
const searchInput = document.querySelector('.global-search input');
if (searchInput) {
  searchInput.addEventListener('input', function() {
    const query = this.value.toLowerCase().trim();
    filterPostsBySearch(query);
  });
}

function filterPostsBySearch(query) {
  const posts = document.querySelectorAll('.post-card');
  posts.forEach(post => {
    if (!query) {
      post.style.display = 'block';
    } else {
      const postText = post.querySelector('.post-text')?.textContent.toLowerCase() || '';
      const author = post.querySelector('.post-author b')?.textContent.toLowerCase() || '';
      const isMatch = postText.includes(query) || author.includes(query);
      post.style.display = isMatch ? 'block' : 'none';
    }
  });
}
