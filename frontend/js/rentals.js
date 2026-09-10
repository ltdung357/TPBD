// ====== RENTALS MODULE ======

let rentalsList = [];

async function loadRentals(searchQuery = '') {
  try {
    const res = await fetch(`/api/rentals?search=${encodeURIComponent(searchQuery)}`);
    rentalsList = await res.json();

    renderRentalsTable(rentalsList);
  } catch (err) {
    showToast('Lỗi khi tải danh sách đơn thuê: ' + err.message, 'error');
  }
}

function renderRentalsTable(orders) {
  const tbody = document.getElementById('tbl-rentals-list');
  if (!tbody) return;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 20px;">Chưa có đơn thuê nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(order => `
    <tr>
      <td><strong>${order.order_code}</strong></td>
      <td>${order.customer_name}</td>
      <td>${order.customer_phone}</td>
      <td>${formatDate(order.rental_start)}</td>
      <td>${formatDate(order.rental_end)}</td>
      <td><strong style="color: var(--success);">${formatVND(order.total_amount)}</strong></td>
      <td>${formatVND(order.deposit_amount)}</td>
      <td>${getRentalStatusBadge(order.status)}</td>
      <td>
        ${order.status === 'RENTED' || order.status === 'OVERDUE' ? `
          <button class="btn btn-success btn-sm" onclick="updateRentalStatus(${order.id}, 'RETURNED')">
            <i class="fa-solid fa-check"></i> Trả Đồ
          </button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

function getRentalStatusBadge(status) {
  switch (status) {
    case 'RENTED':
      return `<span class="badge badge-info"><i class="fa-solid fa-truck-fast"></i> Đang Thuê</span>`;
    case 'RETURNED':
      return `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Đã Trả Đồ</span>`;
    case 'OVERDUE':
      return `<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation"></i> Quá Hạn</span>`;
    case 'CANCELLED':
      return `<span class="badge badge-warning"><i class="fa-solid fa-xmark"></i> Đã Hủy</span>`;
    default:
      return `<span class="badge badge-info">${status}</span>`;
  }
}

// Dynamic Items Picker Row for Rental Form
function addRentalItemRow() {
  const container = document.getElementById('rental-items-list');
  if (!container) return;

  const rowId = 'row-' + Date.now();
  const row = document.createElement('div');
  row.id = rowId;
  row.className = 'form-row';
  row.style.alignItems = 'center';

  const optionsHTML = costumesList.map(c => `<option value="${c.id}">${c.name} (${c.code}) - ${formatVND(c.price_per_day)}/ngày (Kho: ${c.available_qty})</option>`).join('');

  row.innerHTML = `
    <div style="flex: 2;">
      <select class="form-control rental-costume-select">${optionsHTML}</select>
    </div>
    <div style="flex: 1;">
      <input type="number" class="form-control rental-costume-qty" value="1" min="1" placeholder="Số lượng">
    </div>
    <button type="button" class="btn btn-danger btn-sm" onclick="document.getElementById('${rowId}').remove()">&times;</button>
  `;

  container.appendChild(row);
}

// Open modal rental order with pre-filled dates
document.addEventListener('DOMContentLoaded', () => {
  const startInput = document.getElementById('rental-start-date');
  const endInput = document.getElementById('rental-end-date');
  if (startInput && endInput) {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
    startInput.value = today;
    endInput.value = tomorrow;
  }
});

async function createRentalOrder(e) {
  e.preventDefault();
  const token = localStorage.getItem('tpbd_token');

  const customer_name = document.getElementById('rental-cust-name').value.trim();
  const customer_phone = document.getElementById('rental-cust-phone').value.trim();
  const rental_start = document.getElementById('rental-start-date').value;
  const rental_end = document.getElementById('rental-end-date').value;
  const notes = document.getElementById('rental-notes').value.trim();

  // Collect items
  const selects = document.querySelectorAll('.rental-costume-select');
  const qtys = document.querySelectorAll('.rental-costume-qty');

  const items = [];
  selects.forEach((sel, idx) => {
    const costume_id = parseInt(sel.value, 10);
    const qty = parseInt(qtys[idx].value || 1, 10);
    if (costume_id && qty > 0) {
      items.push({ costume_id, qty });
    }
  });

  if (items.length === 0) {
    showToast('Vui lòng chọn ít nhất 1 sản phẩm thuê!', 'error');
    return;
  }

  try {
    const res = await fetch('/api/rentals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        customer_name,
        customer_phone,
        rental_start,
        rental_end,
        notes,
        items
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Tạo đơn thuê thất bại!');

    showToast('Tạo đơn thuê trang phục thành công!');
    closeModal('modal-rental');
    document.getElementById('form-rental').reset();
    document.getElementById('rental-items-list').innerHTML = '';
    loadRentals();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function updateRentalStatus(id, newStatus) {
  const token = localStorage.getItem('tpbd_token');
  try {
    const res = await fetch(`/api/rentals/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Cập nhật thất bại!');

    showToast(data.message);
    loadRentals();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
