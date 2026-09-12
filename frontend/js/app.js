// ====== APP SPA CONTROLLER & UTILITIES ======

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupRouting();
});

// Toast notification helper
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
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
  const mobileHeaderUser = document.getElementById('mobile-header-user');
  const adminElements = document.querySelectorAll('.admin-only');

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
    if (mobileHeaderUser) {
      mobileHeaderUser.innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="logout()" title="Đăng xuất">
          <i class="fa-solid fa-right-from-bracket"></i> Đăng xuất
        </button>
      `;
    }
    adminElements.forEach(el => el.style.display = '');
  } else {
    // Mode Khách Xem Trang Phục (Guest)
    if (userProfileArea) {
      userProfileArea.innerHTML = `
        <a href="login.html" class="btn btn-primary btn-sm" style="width: 100%; justify-content: center; text-decoration: none;">
          <i class="fa-solid fa-right-to-bracket"></i> Đăng Nhập Quản Lý
        </a>
      `;
    }
    if (mobileHeaderUser) {
      mobileHeaderUser.innerHTML = `
        <a href="login.html" class="btn btn-primary btn-sm" style="text-decoration: none;">
          <i class="fa-solid fa-right-to-bracket"></i> Đăng Nhập Quản Lý
        </a>
      `;
    }
    adminElements.forEach(el => el.style.display = 'none');
  }
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
  // Guard admin pages if guest
  if (!currentUser && ['dashboard', 'rentals', 'customers'].includes(sectionId)) {
    showToast('Vui lòng đăng nhập để truy cập trang quản lý!', 'error');
    window.location.href = 'login.html';
    return;
  }

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));

  const navLink = document.querySelector(`.nav-item[href="#${sectionId}"]`);
  if (navLink) navLink.classList.add('active');

  const section = document.getElementById(`section-${sectionId}`);
  if (section) section.classList.add('active');

  // Update Header Title
  const titles = {
    dashboard: 'Tổng Quan Hệ Thống Quản Lý',
    costumes: 'Bộ Sưu Tập Trang Phục & Đạo Cụ Biểu Diễn',
    rentals: 'Quản Lý Đơn Thuê Trang Phục',
    customers: 'Danh Sách Khách Hàng & Đoàn Diễn'
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
  const hash = window.location.hash.replace('#', '') || 'costumes';
  navigateTo(hash);
}

// Modal Toggle Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// Global Search Handler
function handleGlobalSearch(query) {
  const activeSection = document.querySelector('.page-section.active');
  if (!activeSection) return;

  if (activeSection.id === 'section-costumes') loadCostumes(query);
  if (activeSection.id === 'section-rentals') loadRentals(query);
  if (activeSection.id === 'section-customers') loadCustomers(query);
}



