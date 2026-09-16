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
        ${currentUser.role === 'ADMIN' ? `
          <button type="button" class="btn btn-primary" onclick="openUsersManagementModal()" style="width: 100%; justify-content: center; font-weight: 700; padding: 12px; font-size: 14px; border-radius: 12px; margin-bottom: 10px;">
            <i class="fa-solid fa-users-gear"></i> Duyệt Tài Khoản & Phân Quyền
          </button>
          <button type="button" class="btn btn-warning" onclick="openRecycleBinModal()" style="width: 100%; justify-content: center; font-weight: 700; padding: 12px; font-size: 14px; border-radius: 12px; margin-bottom: 10px; background: rgba(245, 158, 11, 0.12); color: #b45309; border: 1.5px solid rgba(245, 158, 11, 0.4);">
            <i class="fa-solid fa-trash-arrow-up"></i> Thùng Rác System & Khôi Phục Dữ Liệu
          </button>
        ` : ''}
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

// ====== USER MANAGEMENT & APPROVAL (ADMIN ONLY) ======
async function openUsersManagementModal() {
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return showToast('Vui lòng đăng nhập tài khoản Quản Trị Viên (Admin) để thực hiện!', 'error');
  }
  openModal('modal-users-management');
  await loadUsersList();
}

async function loadUsersList() {
  const container = document.getElementById('users-cards-list');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center; color: var(--text-muted); padding: 20px;">Đang tải danh sách tài khoản...</div>`;

  try {
    const token = localStorage.getItem('tpbd_token');
    const res = await fetch('/api/auth/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Không thể tải danh sách tài khoản');
    const users = await res.json();

    if (!users || users.length === 0) {
      container.innerHTML = `<div style="text-align:center; color: var(--text-muted); padding: 20px;">Chưa có tài khoản nào.</div>`;
      return;
    }

    container.innerHTML = users.map(u => {
      const isApproved = Boolean(u.is_active);
      const borderColor = isApproved ? '#22c55e' : '#ef4444';
      const bgColor = isApproved ? 'rgba(34, 197, 94, 0.03)' : 'rgba(239, 68, 68, 0.03)';
      const avatarBg = isApproved ? '#22c55e' : '#ef4444';

      return `
        <div class="user-card-item" style="border: 2px solid ${borderColor}; background: ${bgColor}; border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <!-- Top Row: Info & Status Badge -->
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="avatar-circle" style="width: 44px; height: 44px; font-size: 18px; font-weight: 800; background: ${avatarBg}; color: #fff; flex-shrink: 0;">
                ${(u.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 style="font-size: 15px; font-weight: 800; color: var(--text-heading); margin: 0;">${u.name} ${u.username && u.username !== u.name ? `<span style="font-size: 12px; font-weight: 600; color: var(--primary);">(@${u.username})</span>` : ''}</h4>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 3px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  <span><i class="fa-solid fa-phone" style="color: var(--primary);"></i> ${u.phone || 'N/A'}</span>
                  <span><i class="fa-solid fa-calendar-days"></i> ${formatDate(u.created_at)}</span>
                </div>
              </div>
            </div>
            <div>
              ${!isApproved 
                ? `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.4); font-size: 12px; font-weight: 800; padding: 6px 12px; border-radius: 20px;"><i class="fa-solid fa-clock"></i> CHỜ DUYỆT</span>`
                : `<span class="badge badge-success" style="font-size: 12px; font-weight: 800; padding: 6px 12px; border-radius: 20px;"><i class="fa-solid fa-check-circle"></i> ĐÃ DUYỆT</span>`
              }
            </div>
          </div>

          <!-- Bottom Row: Role Select & Action Buttons aligned cleanly -->
          <div style="display: flex; flex-direction: column; gap: 10px; background: #ffffff; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 12px; font-weight: 700; color: var(--text-muted); white-space: nowrap; min-width: 80px;">Phân Quyền:</span>
              <select id="user-role-select-${u.id}" class="form-control" style="font-size: 13px; font-weight: 700; padding: 6px 10px; border-radius: 8px; flex: 1;" ${u.id === currentUser.id ? 'disabled' : ''}>
                <option value="STAFF" ${u.role === 'STAFF' ? 'selected' : ''}>👔 Nhân Viên</option>
                <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>👑 Quản Trị Viên</option>
                <option value="CUSTOMER" ${u.role === 'CUSTOMER' ? 'selected' : ''}>👤 Khách Hàng</option>
              </select>
            </div>

            <div style="display: flex; gap: 10px; align-items: center; justify-content: flex-end;">
              ${u.id === currentUser.id 
                ? `<span style="font-size: 12px; color: var(--text-muted); font-style: italic; font-weight: 600;">(Đang đăng nhập)</span>` 
                : `
                  <button class="btn btn-sm ${!isApproved ? 'btn-success' : 'btn-outline'}" onclick="saveUserApprovalAndRole(${u.id}, ${!isApproved})" style="flex: 1; font-weight: 700; padding: 8px 14px; font-size: 12px; border-radius: 8px; justify-content: center; white-space: nowrap;">
                    ${!isApproved ? '<i class="fa-solid fa-user-check"></i> Duyệt & Cấp Quyền' : '<i class="fa-solid fa-user-xmark"></i> Khóa Tài Khoản'}
                  </button>

                  <button class="btn btn-sm btn-danger" onclick="deleteUserAccount(${u.id}, '${u.name.replace(/'/g, "\\'")}')" style="font-weight: 700; padding: 8px 14px; font-size: 12px; border-radius: 8px; justify-content: center; white-space: nowrap;" title="Xóa tài khoản này">
                    <i class="fa-solid fa-trash-can"></i> Xóa
                  </button>
                `
              }
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div style="text-align:center; color: #ef4444; padding: 20px;">${err.message}</div>`;
  }
}

async function saveUserApprovalAndRole(userId, newActiveStatus) {
  const roleSelect = document.getElementById(`user-role-select-${userId}`);
  const selectedRole = roleSelect ? roleSelect.value : 'STAFF';
  const token = localStorage.getItem('tpbd_token');

  try {
    const res = await fetch(`/api/auth/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ role: selectedRole, is_active: newActiveStatus })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Cập nhật thất bại');

    showToast('Cập nhật quyền và duyệt tài khoản thành công!');
    await loadUsersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteUserAccount(userId, userName) {
  if (!confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản "${userName}" không?`)) return;

  const token = localStorage.getItem('tpbd_token');
  try {
    const res = await fetch(`/api/auth/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Xóa tài khoản thất bại');

    showToast('Đã chuyển tài khoản vào Thùng Rác!');
    await loadUsersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ====== RECYCLE BIN SYSTEM & DATA RECOVERY (ADMIN ONLY) ======
let currentRecycleFilter = 'ALL';
let recycleBinDataList = [];

async function openRecycleBinModal() {
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return showToast('Vui lòng đăng nhập tài khoản Quản Trị Viên (Admin) để mở Thùng Rác!', 'error');
  }
  openModal('modal-recycle-bin');
  await loadRecycleBinList();
}

async function loadRecycleBinList() {
  const container = document.getElementById('recycle-bin-cards-list');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center; color: var(--text-muted); padding: 20px;">Đang tải danh sách Thùng Rác...</div>`;

  try {
    const token = localStorage.getItem('tpbd_token');
    const res = await fetch('/api/system/recycle-bin', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Không thể tải dữ liệu Thùng Rác');
    recycleBinDataList = await res.json();
    renderRecycleBinCards();
  } catch (err) {
    container.innerHTML = `<div style="text-align:center; color: #ef4444; padding: 20px;">${err.message}</div>`;
  }
}

function filterRecycleBin(type, chipEl) {
  currentRecycleFilter = type;
  if (chipEl) {
    document.querySelectorAll('#modal-recycle-bin .rental-filter-chip').forEach(c => c.classList.remove('active'));
    chipEl.classList.add('active');
  }
  renderRecycleBinCards();
}

function renderRecycleBinCards() {
  const container = document.getElementById('recycle-bin-cards-list');
  if (!container) return;

  let filtered = recycleBinDataList;
  if (currentRecycleFilter !== 'ALL') {
    filtered = recycleBinDataList.filter(item => item.item_type === currentRecycleFilter);
  }

  if (!filtered || filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 30px 10px; color: var(--text-muted);">
        <i class="fa-solid fa-trash-can-arrow-up" style="font-size: 32px; opacity: 0.4; margin-bottom: 8px;"></i>
        <div>Thùng rác trống hoặc không có mục nào thuộc nhóm này.</div>
      </div>
    `;
    return;
  }

  const typeLabels = {
    COSTUME: { label: 'Trang Phục / Đạo Cụ', icon: 'fa-shirt', badgeBg: 'rgba(99,102,241,0.1)', color: '#6366f1' },
    RENTAL: { label: 'Đơn Thuê Trang Phục', icon: 'fa-receipt', badgeBg: 'rgba(14,165,233,0.1)', color: '#0ea5e9' },
    CUSTOMER: { label: 'Khách Hàng', icon: 'fa-users', badgeBg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
    USER: { label: 'Tài Khoản', icon: 'fa-user-gear', badgeBg: 'rgba(245,158,11,0.1)', color: '#f59e0b' }
  };

  container.innerHTML = filtered.map(item => {
    const meta = typeLabels[item.item_type] || { label: item.item_type, icon: 'fa-box', badgeBg: 'rgba(100,116,139,0.1)', color: '#64748b' };
    const safeTitle = (item.item_title || 'Không tên').replace(/'/g, "\\'");

    return `
      <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
        <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 240px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: ${meta.badgeBg}; color: ${meta.color}; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">
            <i class="fa-solid ${meta.icon}"></i>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 10px; font-weight: 800; background: ${meta.badgeBg}; color: ${meta.color}; padding: 2px 7px; border-radius: 6px;">${meta.label}</span>
              <span style="font-size: 11px; color: var(--text-muted);"><i class="fa-solid fa-user"></i> Nguời xóa: <b>${item.deleted_by || 'Hệ thống'}</b></span>
            </div>
            <h4 style="font-size: 14px; font-weight: 800; color: var(--text-heading); margin: 3px 0 0 0;">${item.item_title}</h4>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
              <i class="fa-solid fa-clock"></i> Đã xóa lúc: ${formatDate(item.deleted_at)}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="btn btn-sm btn-primary" onclick="restoreRecycleBinItem(${item.id}, '${safeTitle}')" style="font-weight: 700; padding: 6px 12px; font-size: 12px; border-radius: 8px; justify-content: center;">
            <i class="fa-solid fa-rotate-left"></i> Khôi Phục
          </button>
          <button class="btn btn-sm btn-outline" onclick="purgeRecycleBinItem(${item.id}, '${safeTitle}')" style="font-weight: 700; padding: 6px 10px; font-size: 12px; color: #ef4444; border-color: rgba(239,68,68,0.4); border-radius: 8px; justify-content: center;" title="Xóa vĩnh viễn">
            <i class="fa-solid fa-trash-can"></i> Xóa Hẳn
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function restoreRecycleBinItem(id, itemTitle) {
  if (!confirm(`Bạn có chắc chắn muốn KHÔI PHỤC mục "${itemTitle}" quay lại hệ thống không?`)) return;

  const token = localStorage.getItem('tpbd_token');
  try {
    const res = await fetch(`/api/system/recycle-bin/restore/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Khôi phục thất bại');

    showToast(data.message || 'Đã khôi phục dữ liệu thành công!');
    await loadRecycleBinList();
    
    // Tự động reload lại section nếu cần
    if (typeof loadCostumes === 'function') loadCostumes();
    if (typeof loadRentals === 'function') loadRentals();
    if (typeof loadCustomers === 'function') loadCustomers();
    if (typeof loadUsersList === 'function') loadUsersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function purgeRecycleBinItem(id, itemTitle) {
  if (!confirm(`CẢNH BÁO: Xóa vĩnh viễn mục "${itemTitle}" sẽ KHÔNG THỂ khôi phục lại được nữa. Bạn có chắc chắn không?`)) return;

  const token = localStorage.getItem('tpbd_token');
  try {
    const res = await fetch(`/api/system/recycle-bin/purge/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Xóa thất bại');

    showToast('Đã xóa vĩnh viễn khỏi Thùng Rác!');
    await loadRecycleBinList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function purgeAllRecycleBin() {
  if (!confirm('CẢNH BÁO NGUY HẠI: Bạn có chắc chắn muốn DỌN SẠCH TOÀN BỘ THÙNG RÁC không? Mọi dữ liệu đã xóa sẽ bị mất vĩnh viễn!')) return;

  const token = localStorage.getItem('tpbd_token');
  try {
    const res = await fetch('/api/system/recycle-bin/purge-all', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Dọn dẹp thất bại');

    showToast('Đã dọn sạch Thùng Rác!');
    await loadRecycleBinList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}



