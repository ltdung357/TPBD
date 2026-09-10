// ====== CHOREOGRAPHY MODULE ======

let choreographersList = [];
let bookingsList = [];

async function loadChoreographyData(searchQuery = '') {
  await loadChoreographers();
  await loadBookings(searchQuery);
}

async function loadChoreographers() {
  try {
    const res = await fetch('/api/choreography/choreographers');
    choreographersList = await res.json();

    renderChoreographersGrid(choreographersList);
    populateChoreographersDropdown(choreographersList);
  } catch (err) {
    showToast('Lỗi khi tải biên đạo viên: ' + err.message, 'error');
  }
}

function renderChoreographersGrid(items) {
  const container = document.getElementById('choreographers-grid');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Chưa có thông tin biên đạo viên.</div>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="costume-card glass-card">
      <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 8px;">
        <div class="avatar-circle" style="width: 48px; height: 48px; font-size: 18px; background: linear-gradient(135deg, var(--accent-purple), var(--accent-pink));">
          ${item.name.charAt(0)}
        </div>
        <div>
          <h4 style="font-size: 15px; font-weight: 700;">${item.name}</h4>
          <span style="font-size: 12px; color: var(--accent-gold); font-weight: 600;">
            <i class="fa-solid fa-star"></i> ${item.rating} / 5.0
          </span>
        </div>
      </div>
      <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">
        <i class="fa-solid fa-masks-theater" style="color: var(--primary);"></i> <strong>Sở trường:</strong> ${item.specialty}
      </div>
      <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
        <i class="fa-solid fa-phone" style="color: var(--success);"></i> ${item.phone}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
        <span style="font-size: 14px; font-weight: 700; color: var(--success);">${formatVND(item.hourly_rate)} <small style="font-size: 10px; color: var(--text-muted);">/ buổi</small></span>
        <button class="btn btn-primary btn-sm" onclick="quickBookChoreographer(${item.id})">
          <i class="fa-solid fa-calendar-check"></i> Book Lịch
        </button>
      </div>
    </div>
  `).join('');
}

function populateChoreographersDropdown(items) {
  const select = document.getElementById('booking-choreographer');
  if (!select) return;

  select.innerHTML = '<option value="">-- Hệ thống tự phân công --</option>' + 
    items.map(c => `<option value="${c.id}">${c.name} - ${c.specialty} (${formatVND(c.hourly_rate)}/buổi)</option>`).join('');
}

async function loadBookings(searchQuery = '') {
  try {
    const res = await fetch(`/api/choreography/bookings?search=${encodeURIComponent(searchQuery)}`);
    bookingsList = await res.json();

    renderBookingsTable(bookingsList);
  } catch (err) {
    showToast('Lỗi khi tải lịch book biên đạo: ' + err.message, 'error');
  }
}

function renderBookingsTable(items) {
  const tbody = document.getElementById('tbl-bookings-list');
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 20px;">Chưa có lịch biên đạo nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr>
      <td><strong>${item.booking_code}</strong></td>
      <td>${item.customer_name} ${item.organization ? `<br><small style="color: var(--text-muted);">${item.organization}</small>` : ''}</td>
      <td>${item.customer_phone}</td>
      <td><span class="badge badge-info">${item.service_type}</span></td>
      <td><strong>${item.choreographer_name || 'Chưa phân công'}</strong></td>
      <td>${formatDate(item.start_date)}</td>
      <td>${item.performer_count} người</td>
      <td><strong style="color: var(--success);">${formatVND(item.estimated_price)}</strong></td>
      <td>${getBookingStatusBadge(item.status)}</td>
      <td>
        ${item.status === 'PENDING' ? `
          <button class="btn btn-success btn-sm" onclick="updateBookingStatus(${item.id}, 'IN_PROGRESS')">Duyệt Dựng</button>
        ` : ''}
        ${item.status === 'IN_PROGRESS' ? `
          <button class="btn btn-primary btn-sm" onclick="updateBookingStatus(${item.id}, 'COMPLETED')">Hoàn Thành</button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

function getBookingStatusBadge(status) {
  switch (status) {
    case 'PENDING':
      return `<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Chờ Xác Nhận</span>`;
    case 'IN_PROGRESS':
      return `<span class="badge badge-info"><i class="fa-solid fa-spinner"></i> Đang Dàn Dựng</span>`;
    case 'COMPLETED':
      return `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Hoàn Thành</span>`;
    case 'CANCELLED':
      return `<span class="badge badge-danger">Đã Hủy</span>`;
    default:
      return `<span class="badge badge-info">${status}</span>`;
  }
}

async function createBooking(e) {
  e.preventDefault();

  const bookingData = {
    customer_name: document.getElementById('booking-cust-name').value.trim(),
    customer_phone: document.getElementById('booking-cust-phone').value.trim(),
    organization: document.getElementById('booking-org').value.trim(),
    service_type: document.getElementById('booking-service-type').value.trim(),
    choreographer_id: document.getElementById('booking-choreographer').value || null,
    performer_count: parseInt(document.getElementById('booking-performers').value || 1, 10),
    start_date: document.getElementById('booking-start-date').value,
    rehearsal_location: document.getElementById('booking-location').value.trim(),
    notes: document.getElementById('booking-notes').value.trim()
  };

  try {
    const res = await fetch('/api/choreography/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gửi yêu cầu thất bại!');

    showToast(data.message);
    closeModal('modal-booking');
    document.getElementById('form-booking').reset();
    loadBookings();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveChoreographer(e) {
  e.preventDefault();
  const token = localStorage.getItem('tpbd_token');

  const data = {
    name: document.getElementById('choreo-name').value.trim(),
    phone: document.getElementById('choreo-phone').value.trim(),
    specialty: document.getElementById('choreo-specialty').value.trim(),
    hourly_rate: parseFloat(document.getElementById('choreo-rate').value || 0),
    bio: document.getElementById('choreo-bio').value.trim()
  };

  try {
    const res = await fetch('/api/choreography/choreographers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Thêm biên đạo thất bại!');

    showToast('Thêm hồ sơ biên đạo viên mới thành công!');
    closeModal('modal-choreographer');
    document.getElementById('form-choreographer').reset();
    loadChoreographers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function quickBookChoreographer(id) {
  openModal('modal-booking');
  const select = document.getElementById('booking-choreographer');
  if (select) select.value = id;
}

async function updateBookingStatus(id, newStatus) {
  const token = localStorage.getItem('tpbd_token');
  try {
    const res = await fetch(`/api/choreography/bookings/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Cập nhật thất bại!');

    showToast('Cập nhật tiến độ bài dựng thành công!');
    loadBookings();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
