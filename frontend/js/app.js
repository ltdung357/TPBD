// ====== APP SPA CONTROLLER & UTILITIES ======

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupRouting();
  setupMobileNavScroll();
});

// Smart Hide / Show Mobile Bottom Nav on Scroll & Touch Swipe (Page & Modals)
function setupMobileNavScroll() {
  let touchStartY = 0;
  let ticking = false;
  const lastScrollMap = new WeakMap();

  const getNav = () => document.querySelector('.mobile-bottom-nav');

  // 1. Universal Scroll Event (Captures scroll on window and all Modal containers)
  document.addEventListener('scroll', (e) => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const nav = getNav();
        if (nav) {
          const target = e.target;
          let currentScrollTop = 0;

          if (target === document || target === window || target === document.documentElement || target === document.body) {
            currentScrollTop = window.scrollY || document.documentElement.scrollTop;
          } else if (target && typeof target.scrollTop === 'number') {
            currentScrollTop = target.scrollTop;
          }

          const prevScrollTop = lastScrollMap.get(target) || 0;
          const scrollDelta = currentScrollTop - prevScrollTop;

          if (currentScrollTop < 30) {
            // Near top of container/modal -> Show menu
            nav.classList.remove('nav-hidden');
          } else if (scrollDelta > 6 && currentScrollTop > 40) {
            // Cuộn xuống / Vuốt lên -> Ẩn menu dưới
            nav.classList.add('nav-hidden');
          } else if (scrollDelta < -6) {
            // Cuộn lên / Vuốt xuống -> Hiện menu dưới
            nav.classList.remove('nav-hidden');
          }

          lastScrollMap.set(target, Math.max(0, currentScrollTop));
        }
        ticking = false;
      });
      ticking = true;
    }
  }, true); // useCapture = true to catch scroll inside modals

  // 2. Universal Touch Gesture Listener (Swipe up/down inside modals or page)
  window.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length > 0) {
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!touchStartY || !e.touches || e.touches.length === 0) return;
    const nav = getNav();
    if (!nav) return;

    const currentTouchY = e.touches[0].clientY;
    const touchDelta = touchStartY - currentTouchY; // Finger UP = Vuốt lên

    if (touchDelta > 12) {
      // Vuốt lên trên màn hình (trang hoặc modal) -> Ẩn menu dưới
      nav.classList.add('nav-hidden');
    } else if (touchDelta < -12) {
      // Vuốt xuống trên màn hình (trang hoặc modal) -> Hiện menu dưới
      nav.classList.remove('nav-hidden');
    }
  }, { passive: true });
}

// Toast notification helper
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  let iconClass = 'fa-circle-check';
  if (type === 'error') iconClass = 'fa-circle-xmark';
  else if (type === 'info') iconClass = 'fa-circle-info';
  else if (type === 'warning') iconClass = 'fa-triangle-exclamation';

  toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Format Currency VNĐ
function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

// Format Date YYYY-MM-DD to DD/MM/YYYY
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN');
}

// Format Date + Time
function formatDateTime(dateStr, timeStr) {
  if (!dateStr) return 'N/A';
  const formattedDate = formatDate(dateStr);
  if (timeStr && timeStr.trim()) {
    return `${formattedDate} ${timeStr.trim()}`;
  }
  return formattedDate;
}

// Check JWT Authentication (Public guest browsing allowed for costumes)
async function checkAuth() {
  const token = localStorage.getItem('tpbd_token');
  
  if (!token) {
    currentUser = null;
    updateUserUI();
    const hash = window.location.hash.replace('#', '');
    if (['dashboard', 'rentals', 'customers'].includes(hash)) {
      window.location.href = 'login.html';
      return;
    }
    navigateTo('costumes');
    return;
  }

  try {
    const res = await fetch('/api/auth/check', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (!res.ok || !data.valid) {
      throw new Error('Phiên làm việc đã hết hạn');
    }

    currentUser = data.user;
    updateUserUI();
    const hash = window.location.hash.replace('#', '') || 'costumes';
    navigateTo(hash);
  } catch (err) {
    localStorage.removeItem('tpbd_token');
    localStorage.removeItem('tpbd_user');
    currentUser = null;
    updateUserUI();
    const hash = window.location.hash.replace('#', '');
    if (['dashboard', 'rentals', 'customers'].includes(hash)) {
      window.location.href = 'login.html';
      return;
    }
    navigateTo('costumes');
  }
}

function updateUserUI() {
  const userProfileArea = document.getElementById('user-profile-area');
  const mobileUserIcon = document.getElementById('mobile-user-icon');
  const mobileUserLabel = document.getElementById('mobile-user-label');
  const adminElements = document.querySelectorAll('.admin-only');

  const accountUserInfo = document.getElementById('account-page-user-info');
  const accountAuthAction = document.getElementById('account-page-auth-action');

  if (currentUser) {
    // Mode Admin / Staff
    if (userProfileArea) {
      userProfileArea.innerHTML = `
        <div class="user-info">
          <div class="avatar-circle" id="user-avatar-initial">${(currentUser.name || 'A').charAt(0).toUpperCase()}</div>
          <div class="user-details">
            <h4 id="user-display-name">${currentUser.name}</h4>
            <p id="user-display-role">${currentUser.role === 'ADMIN' ? 'Quản Trị Viên' : 'Nhân Viên'}</p>
          </div>
        </div>
        <button class="btn-logout" onclick="logout()" title="Đăng xuất">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      `;
    }
    if (mobileUserIcon) mobileUserIcon.className = 'fa-solid fa-user';
    if (mobileUserLabel) mobileUserLabel.innerText = 'Tôi';
    adminElements.forEach(el => el.style.display = '');

    if (accountUserInfo) {
      accountUserInfo.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px;">
          <div class="avatar-circle" style="width: 50px; height: 50px; font-size: 20px; background: var(--primary); color: #fff;">${(currentUser.name || 'A').charAt(0).toUpperCase()}</div>
          <div>
            <h4 style="font-size: 16px; font-weight: 800; color: var(--text-heading); margin: 0;">${currentUser.name}</h4>
            <span class="badge badge-success" style="margin-top: 4px; font-size: 11px;">${currentUser.role === 'ADMIN' ? 'Quản Trị Viên' : 'Nhân Viên'}</span>
          </div>
        </div>
      `;
    }
    if (accountAuthAction) {
      accountAuthAction.innerHTML = `
        <button type="button" class="btn btn-danger" onclick="logout()" style="width: 100%; justify-content: center; font-weight: 700; padding: 12px; font-size: 14px; border-radius: 12px;">
          <i class="fa-solid fa-right-from-bracket"></i> Đăng Xuất Tài Khoản
        </button>
      `;
    }
  } else {
    // Mode Khách Xem Trang Phục (Guest)
    if (userProfileArea) {
      userProfileArea.innerHTML = `
        <a href="login.html" class="btn btn-primary btn-sm" style="width: 100%; justify-content: center; text-decoration: none;">
          <i class="fa-solid fa-right-to-bracket"></i> Đăng Nhập Quản Lý
        </a>
      `;
    }
    if (mobileUserIcon) mobileUserIcon.className = 'fa-solid fa-user';
    if (mobileUserLabel) mobileUserLabel.innerText = 'Tôi';
    adminElements.forEach(el => el.style.display = 'none');

    if (accountUserInfo) {
      accountUserInfo.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px;">
          <div class="avatar-circle" style="width: 50px; height: 50px; font-size: 20px; background: #94a3b8; color: #fff;"><i class="fa-solid fa-user"></i></div>
          <div>
            <h4 style="font-size: 15px; font-weight: 800; color: var(--text-heading); margin: 0;">Khách Hàng Xem Trang Phục</h4>
            <p style="font-size: 12px; color: var(--text-muted); margin: 3px 0 0 0;">Bạn đang xem bộ sưu tập trang phục & đạo cụ</p>
          </div>
        </div>
      `;
    }
    if (accountAuthAction) {
      accountAuthAction.innerHTML = `
        <a href="login.html" class="btn btn-primary" style="width: 100%; justify-content: center; font-weight: 700; text-decoration: none; padding: 12px; font-size: 14px; border-radius: 12px;">
          <i class="fa-solid fa-right-to-bracket"></i> Đăng Nhập Quản Lý Hệ Thống
        </a>
      `;
    }
  }
}

function handleMobileUserAction() {
  navigateTo('account');
}

function logout() {
  localStorage.removeItem('tpbd_token');
  localStorage.removeItem('tpbd_user');
  currentUser = null;
  updateUserUI();
  navigateTo('costumes');
  showToast('Đã đăng xuất tài khoản!');
}

// Router SPA Navigation
function navigateTo(sectionId) {
  // Tự động đóng tất cả các modal đang mở (như modal xem chi tiết) khi chuyển trang
  document.querySelectorAll('.modal-overlay.active').forEach(modal => modal.classList.remove('active'));
  document.body.classList.remove('modal-open');

  // Guard admin pages if guest
  if (!currentUser && ['dashboard', 'rentals', 'customers'].includes(sectionId)) {
    showToast('Vui lòng đăng nhập để truy cập trang quản lý!', 'error');
    window.location.href = 'login.html';
    return;
  }

  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));

  const sidebarLink = document.querySelector(`.nav-item[href="#${sectionId}"]`);
  if (sidebarLink) sidebarLink.classList.add('active');

  const mobileLink = document.querySelector(`.mobile-nav-item[href="#${sectionId}"]`);
  if (mobileLink) mobileLink.classList.add('active');

  const section = document.getElementById(`section-${sectionId}`);
  if (section) section.classList.add('active');

  // Update Header Title
  const titles = {
    dashboard: 'Tổng Quan Hệ Thống Quản Lý',
    costumes: 'Bộ Sưu Tập Trang Phục & Đạo Cụ Biểu Diễn',
    rentals: 'Quản Lý Đơn Thuê Trang Phục',
    customers: 'Danh Sách Khách Hàng & Đoàn Diễn',
    account: 'Thông Tin Tài Khoản & Trung Tâm Trợ Giúp'
  };
  const titleEl = document.getElementById('header-page-title');
  if (titleEl) titleEl.innerText = titles[sectionId] || 'Trang Phục Biểu Diễn Thúy Hà';

  // Load Section Data
  if (sectionId === 'dashboard') loadDashboardStats();
  if (sectionId === 'costumes') loadCostumes();
  if (sectionId === 'rentals') loadRentals();
  if (sectionId === 'customers') loadCustomers();
}

function setupRouting() {
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') || 'costumes';
    navigateTo(hash);
  });

  const hash = window.location.hash.replace('#', '') || 'costumes';
  navigateTo(hash);
}

// Modal Toggle Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
  const anyActive = document.querySelectorAll('.modal-overlay.active').length > 0;
  if (!anyActive) {
    document.body.classList.remove('modal-open');
  }
}

// Global Search Handler
function handleGlobalSearch(query) {
  const activeSection = document.querySelector('.page-section.active');
  if (!activeSection) return;

  if (activeSection.id === 'section-costumes') loadCostumes(query);
  if (activeSection.id === 'section-rentals') loadRentals(query);
  if (activeSection.id === 'section-customers') loadCustomers(query);
}



