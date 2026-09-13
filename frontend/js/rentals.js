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
  const cardsContainer = document.getElementById('mobile-rentals-cards');

  if (!orders || orders.length === 0) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 20px;">Chưa có đơn thuê nào.</td></tr>`;
    }
    if (cardsContainer) {
      cardsContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px; background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border);">Chưa có đơn thuê nào.</div>`;
    }
    return;
  }

  // Render Desktop Table Rows
  if (tbody) {
    tbody.innerHTML = orders.map(order => `
      <tr onclick="openOrderDetailModal(${order.id})" style="cursor: pointer;" title="Bấm vào để xem chi tiết đơn thuê">
        <td><strong style="color: var(--primary);">${order.order_code}</strong></td>
        <td>${order.customer_name}</td>
        <td>${order.customer_phone}</td>
        <td>${formatDate(order.rental_start)}</td>
        <td>
          ${order.rental_end 
            ? formatDate(order.rental_end) 
            : `<span class="badge badge-warning" style="font-size: 11px;" onclick="event.stopPropagation(); openUpdateRentalModal(${order.id})" title="Bấm để cập nhật ngày trả đồ"><i class="fa-solid fa-clock"></i> Chưa hẹn ngày</span>`}
        </td>
        <td><strong style="color: var(--success);">${formatVND(order.total_amount)}</strong></td>
        <td>
          ${order.is_paid 
            ? `<span class="badge badge-success" style="white-space: nowrap;"><i class="fa-solid fa-circle-check"></i> Đã Thanh Toán</span>` 
            : `<span class="badge badge-warning" style="white-space: nowrap;"><i class="fa-solid fa-clock"></i> Chưa Thanh Toán</span>`}
        </td>
        <td>${formatVND(order.deposit_amount)}</td>
        <td>${getRentalStatusBadge(order.status)}</td>
        <td style="display: flex; gap: 6px; flex-wrap: wrap;" onclick="event.stopPropagation()">
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openOrderDetailModal(${order.id})" title="Xem chi tiết đơn thuê">
            <i class="fa-solid fa-eye"></i> Xem
          </button>
          ${!order.is_paid ? `
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); updateRentalPayment(${order.id}, true)" title="Xác nhận khách đã thanh toán tiền thuê">
              <i class="fa-solid fa-hand-holding-dollar"></i> Đã Trả Tiền
            </button>
          ` : ''}
          ${order.status === 'RENTED' || order.status === 'OVERDUE' ? `
            <button class="btn btn-success btn-sm" onclick="event.stopPropagation(); updateRentalStatus(${order.id}, 'RETURNED')">
              <i class="fa-solid fa-check"></i> Trả Đồ
            </button>
            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openUpdateRentalModal(${order.id})" title="Cập nhật ngày trả đồ">
              <i class="fa-solid fa-calendar-pen"></i> Ngày Trả
            </button>
          ` : ''}
        </td>
      </tr>
    `).join('');
  }

  // Render Mobile Cards View
  if (cardsContainer) {
    cardsContainer.innerHTML = orders.map(order => {
      const isReturned = order.status === 'RETURNED';
      const borderClass = isReturned ? 'rental-card-returned' : 'rental-card-unreturned';

      return `
        <div class="rental-card-mobile ${borderClass}" onclick="openOrderDetailModal(${order.id})" style="cursor: pointer;">
        <!-- Top: Order code & Status Badges -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; padding-bottom: 10px; border-bottom: 1px solid var(--border);">
          <div>
            <div style="font-size: 11px; color: var(--text-muted);">Mã đơn thuê</div>
            <strong style="font-size: 15px; color: var(--primary); font-weight: 800;">${order.order_code}</strong>
          </div>
          <div style="display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end;">
            ${getRentalStatusBadge(order.status)}
            ${order.is_paid 
              ? `<span class="badge badge-success" style="font-size: 10px;"><i class="fa-solid fa-circle-check"></i> Đã TT</span>` 
              : `<span class="badge badge-warning" style="font-size: 10px;"><i class="fa-solid fa-clock"></i> Chưa TT</span>`}
          </div>
        </div>

        <!-- Customer & Phone -->
        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-muted); font-size: 12px;">Khách hàng:</span>
            <strong style="color: var(--text-heading); font-size: 14px;">${order.customer_name}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-muted); font-size: 12px;">Số điện thoại:</span>
            <a href="tel:${order.customer_phone}" onclick="event.stopPropagation()" style="color: var(--primary); font-weight: 700; text-decoration: none; font-size: 13px; display: inline-flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-phone" style="font-size: 11px;"></i> ${order.customer_phone}
            </a>
          </div>
        </div>

        <!-- Rental Start / End timeline box -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.04); padding: 8px 12px; border-radius: 10px; border: 1px solid var(--border);">
          <div>
            <span style="font-size: 11px; color: var(--text-muted); display: block;">Ngày nhận đồ</span>
            <b style="font-size: 12px; color: var(--text-heading);">${formatDate(order.rental_start)}</b>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 11px; color: var(--text-muted); display: block;">Hạn trả đồ</span>
            ${order.rental_end 
              ? `<b style="font-size: 12px; color: var(--text-heading);">${formatDate(order.rental_end)}</b>` 
              : `<span class="badge badge-warning" style="font-size: 10px; cursor: pointer;" onclick="event.stopPropagation(); openUpdateRentalModal(${order.id})"><i class="fa-solid fa-clock"></i> Chưa hẹn ngày</span>`}
          </div>
        </div>

        <!-- Footer: Total amount & Action buttons -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px dashed var(--border); margin-top: 2px;">
          <div>
            <span style="font-size: 11px; color: var(--text-muted); display: block;">Tổng tiền thuê</span>
            <strong style="font-size: 16px; color: var(--success); font-weight: 900;">${formatVND(order.total_amount)}</strong>
          </div>

          <div style="display: flex; gap: 6px; flex-wrap: wrap;" onclick="event.stopPropagation()">
            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openOrderDetailModal(${order.id})" style="padding: 6px 10px; font-size: 12px;" title="Xem chi tiết">
              <i class="fa-solid fa-eye"></i> Xem
            </button>
            ${!order.is_paid ? `
              <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); updateRentalPayment(${order.id}, true)" style="padding: 6px 10px; font-size: 12px;" title="Xác nhận khách đã thanh toán">
                <i class="fa-solid fa-hand-holding-dollar"></i> Đã Trả Tiền
              </button>
            ` : ''}
            ${order.status === 'RENTED' || order.status === 'OVERDUE' ? `
              <button class="btn btn-success btn-sm" onclick="event.stopPropagation(); updateRentalStatus(${order.id}, 'RETURNED')" style="padding: 6px 10px; font-size: 12px;">
                <i class="fa-solid fa-check"></i> Trả Đồ
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    }).join('');
  }
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

let selectedRentalItems = []; // Array of { costume_id, qty }

// Open modal to create a new rental order
function openCreateRentalModal() {
  selectedRentalItems = [];
  renderSelectedRentalItems();

  const form = document.getElementById('form-rental');
  if (form) form.reset();

  const startInput = document.getElementById('rental-start-date');
  const endInput = document.getElementById('rental-end-date');
  if (startInput) {
    startInput.value = new Date().toISOString().split('T')[0];
  }
  if (endInput) {
    endInput.value = ''; // Mặc định không bắt buộc ngày trả đồ
  }

  // Ensure costumes data is loaded for picker
  if (!costumesList || costumesList.length === 0) {
    if (typeof loadCostumes === 'function') loadCostumes();
  }

  openModal('modal-rental');
}

// Render selected items list in #modal-rental
function renderSelectedRentalItems() {
  const container = document.getElementById('rental-items-list');
  if (!container) return;

  if (!selectedRentalItems || selectedRentalItems.length === 0) {
    container.innerHTML = `
      <div onclick="openVisualCostumePicker()" style="text-align: center; padding: 16px; border: 2px dashed var(--border); border-radius: 12px; background: rgba(255, 255, 255, 0.02); cursor: pointer; color: var(--text-muted); font-size: 13px; font-weight: 600;" title="Bấm để chọn món đồ">
        <i class="fa-solid fa-plus-circle" style="color: var(--primary); margin-right: 6px;"></i> Chưa có món đồ nào. Bấm vào đây để chọn.
      </div>
    `;
    return;
  }

  container.innerHTML = selectedRentalItems.map(itemState => {
    const item = (costumesList || []).find(c => c.id === itemState.costume_id);
    if (!item) return '';

    let imgList = [];
    try {
      imgList = typeof item.images === 'string' ? JSON.parse(item.images) : (item.images || []);
    } catch(e) {}
    if (imgList.length === 0 && item.image_url) imgList = [item.image_url];
    const coverImg = item.image_url || (imgList.length > 0 ? imgList[0] : 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500&auto=format&fit=crop&q=60');

    const subtotal = parseFloat(item.price_per_day || 0) * itemState.qty;

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
          <img src="${coverImg}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0;">
          <div style="flex: 1; min-width: 0;">
            <strong style="font-size: 13px; color: var(--text-heading); display: block; line-height: 1.3; word-break: break-word;" title="${item.name}">${item.name}</strong>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <span>Mã: <code style="font-weight: 700; color: var(--primary);">${item.code}</code></span>
              ${item.size ? `<span>• Size: <b style="color: var(--text-heading);">${item.size}</b></span>` : ''}
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
          <div style="display: flex; align-items: center; background: rgba(255, 255, 255, 0.06); border: 1px solid var(--border); border-radius: 8px; padding: 2px 4px;">
            <button type="button" class="btn btn-sm" style="padding: 2px 8px; font-weight: 800; cursor: pointer;" onclick="adjustRentalItemQty(${item.id}, -1)">-</button>
            <input type="number" value="${itemState.qty}" min="1" 
              onchange="setRentalItemQty(${item.id}, this.value)" 
              style="width: 36px; text-align: center; border: none; background: transparent; color: var(--text-heading); font-weight: 800; font-size: 13px;">
            <button type="button" class="btn btn-sm" style="padding: 2px 8px; font-weight: 800; cursor: pointer;" onclick="adjustRentalItemQty(${item.id}, 1)">+</button>
          </div>

          <div style="font-weight: 800; font-size: 14px; color: var(--success); text-align: right; white-space: nowrap;">
            ${formatVND(subtotal)}
          </div>

          <button type="button" class="btn btn-sm" style="color: #ef4444; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 6px 10px; cursor: pointer;" onclick="removeRentalItemById(${item.id})" title="Xóa món này">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}
function addRentalItemById(id) {
  const costume = (costumesList || []).find(c => c.id === id);
  if (!costume) return;

  const existing = selectedRentalItems.find(i => i.costume_id === id);
  if (existing) {
    existing.qty++;
  } else {
    selectedRentalItems.push({ costume_id: id, qty: 1 });
  }

  renderSelectedRentalItems();
  renderVisualCostumePicker();
}

// Adjust item quantity (+1 / -1)
function adjustRentalItemQty(id, delta) {
  const existingIndex = selectedRentalItems.findIndex(i => i.costume_id === id);
  if (existingIndex === -1) return;

  const newQty = selectedRentalItems[existingIndex].qty + delta;

  if (newQty <= 0) {
    selectedRentalItems.splice(existingIndex, 1);
  } else {
    selectedRentalItems[existingIndex].qty = newQty;
  }

  renderSelectedRentalItems();
  renderVisualCostumePicker();
}

// Set quantity directly
function setRentalItemQty(id, val) {
  const qty = parseInt(val, 10);
  const existingIndex = selectedRentalItems.findIndex(i => i.costume_id === id);
  if (existingIndex === -1) return;

  if (isNaN(qty) || qty <= 0) {
    selectedRentalItems.splice(existingIndex, 1);
  } else {
    selectedRentalItems[existingIndex].qty = qty;
  }

  renderSelectedRentalItems();
  renderVisualCostumePicker();
}

// Remove item from order
function removeRentalItemById(id) {
  selectedRentalItems = selectedRentalItems.filter(i => i.costume_id !== id);
  renderSelectedRentalItems();
  renderVisualCostumePicker();
}

// Open Visual Costume Picker Modal
function openVisualCostumePicker() {
  if (!costumesList || costumesList.length === 0) {
    if (typeof loadCostumes === 'function') loadCostumes();
  }

  // Populate categories filter dropdown in picker
  const catSelect = document.getElementById('picker-category-filter');
  if (catSelect && typeof categoriesList !== 'undefined') {
    let catHTML = `<option value="ALL">Tất cả danh mục</option>`;
    catHTML += categoriesList.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    catSelect.innerHTML = catHTML;
  }

  openModal('modal-select-costumes');
  renderVisualCostumePicker();
}

// Render Grid Cards in Visual Costume Picker Modal
function renderVisualCostumePicker() {
  const grid = document.getElementById('picker-items-grid');
  if (!grid) return;

  const search = (document.getElementById('picker-search-input')?.value || '').toLowerCase().trim();
  const categoryId = document.getElementById('picker-category-filter')?.value || 'ALL';
  const typeCode = document.getElementById('picker-type-filter')?.value || 'ALL';

  let items = costumesList || [];

  if (search) {
    items = items.filter(c => 
      (c.name && c.name.toLowerCase().includes(search)) || 
      (c.code && c.code.toLowerCase().includes(search))
    );
  }

  if (categoryId !== 'ALL') {
    items = items.filter(c => String(c.category_id) === String(categoryId));
  }

  if (typeCode !== 'ALL') {
    items = items.filter(c => c.type === typeCode);
  }

  const summaryEl = document.getElementById('picker-selected-summary');
  if (summaryEl) {
    const totalQty = selectedRentalItems.reduce((acc, i) => acc + i.qty, 0);
    summaryEl.innerText = `Đã chọn: ${selectedRentalItems.length} loại (${totalQty} sản phẩm)`;
  }

  if (items.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Không tìm thấy trang phục hoặc đạo cụ phù hợp!</div>`;
    return;
  }

  grid.innerHTML = items.map(item => {
    const existing = selectedRentalItems.find(i => i.costume_id === item.id);
    const qtyInOrder = existing ? existing.qty : 0;

    let imgList = [];
    try {
      imgList = typeof item.images === 'string' ? JSON.parse(item.images) : (item.images || []);
    } catch(e) {}
    if (imgList.length === 0 && item.image_url) imgList = [item.image_url];
    const coverImg = item.image_url || (imgList.length > 0 ? imgList[0] : 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500&auto=format&fit=crop&q=60');

    return `
      <div style="border: 1px solid ${qtyInOrder > 0 ? 'var(--primary)' : 'var(--border)'}; border-radius: 12px; padding: 10px; display: flex; flex-direction: column; justify-content: space-between; background: var(--bg-card); transition: all 0.2s; position: relative; ${qtyInOrder > 0 ? 'box-shadow: 0 0 10px rgba(59, 130, 246, 0.2); border-color: #3b82f6;' : ''}">
        
        <div style="position: relative; width: 100%; height: 130px; border-radius: 8px; overflow: hidden; background: #111; margin-bottom: 8px;">
          <img src="${coverImg}" style="width: 100%; height: 100%; object-fit: cover;">
          <span class="badge ${item.available_qty > 0 ? 'badge-success' : 'badge-danger'}" style="position: absolute; top: 6px; right: 6px; font-size: 10px; padding: 3px 6px;">
            Kho: ${item.available_qty}
          </span>
          ${item.size ? `<span class="badge badge-info" style="position: absolute; bottom: 6px; left: 6px; font-size: 10px; padding: 3px 6px;">Size: ${item.size}</span>` : ''}
        </div>

        <div style="flex: 1; margin-bottom: 8px;">
          <strong style="font-size: 13px; color: var(--text-heading); display: block; line-height: 1.3; max-height: 34px; overflow: hidden;" title="${item.name}">${item.name}</strong>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
            Mã: <code>${item.code}</code>
          </div>
          <div style="font-size: 13px; font-weight: 800; color: var(--primary); margin-top: 4px;">
            ${formatVND(item.price_per_day)}
          </div>
        </div>

        <div>
          ${qtyInOrder > 0 ? `
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 8px; padding: 4px 6px;">
              <button type="button" class="btn btn-sm" style="padding: 2px 10px; font-weight: 800; color: #ef4444; cursor: pointer;" onclick="adjustRentalItemQty(${item.id}, -1)">-</button>
              <span style="font-weight: 800; color: var(--success); font-size: 13px;"><i class="fa-solid fa-check"></i> SL: ${qtyInOrder}</span>
              <button type="button" class="btn btn-sm" style="padding: 2px 10px; font-weight: 800; color: var(--success); cursor: pointer;" onclick="adjustRentalItemQty(${item.id}, 1)">+</button>
            </div>
          ` : `
            <button type="button" class="btn btn-primary btn-sm" style="width: 100%; justify-content: center; font-weight: 700; border-radius: 8px; cursor: pointer;" onclick="addRentalItemById(${item.id})">
              <i class="fa-solid fa-plus"></i> Thêm Món
            </button>
          `}
        </div>

      </div>
    `;
  }).join('');
}

async function createRentalOrder(e) {
  e.preventDefault();
  const token = localStorage.getItem('tpbd_token');

  const customer_name = document.getElementById('rental-cust-name').value.trim();
  const customer_phone = document.getElementById('rental-cust-phone').value.trim();
  const rental_start = document.getElementById('rental-start-date').value;
  const rental_end = document.getElementById('rental-end-date').value;
  const notes = document.getElementById('rental-notes').value.trim();
  const is_paid = document.getElementById('rental-is-paid')?.checked || false;

  if (!selectedRentalItems || selectedRentalItems.length === 0) {
    showToast('Vui lòng bấm "+ Thêm Món Đồ" để chọn trang phục bằng hình ảnh!', 'error');
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
        rental_end: rental_end || null,
        notes,
        is_paid,
        items: selectedRentalItems
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Tạo đơn thuê thất bại!');

    showToast('Tạo đơn thuê trang phục thành công!');
    closeModal('modal-rental');
    document.getElementById('form-rental').reset();
    selectedRentalItems = [];
    renderSelectedRentalItems();
    loadRentals();
    if (typeof loadDashboardStats === 'function') loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function updateRentalPayment(id, isPaid) {
  const token = localStorage.getItem('tpbd_token');
  try {
    const res = await fetch(`/api/rentals/${id}/payment`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ is_paid: isPaid })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Cập nhật thanh toán thất bại!');

    showToast(data.message);
    loadRentals();
    if (typeof loadDashboardStats === 'function') loadDashboardStats();
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
    if (typeof loadDashboardStats === 'function') loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Open modal to update rental order end date
function openUpdateRentalModal(id) {
  const order = rentalsList.find(o => o.id === id);
  if (!order) return;

  document.getElementById('update-rental-id').value = order.id;
  document.getElementById('update-rental-code').value = order.order_code;
  document.getElementById('update-rental-cust').value = `${order.customer_name} (${order.customer_phone})`;
  document.getElementById('update-rental-end-date').value = order.rental_end ? order.rental_end.split('T')[0] : '';
  document.getElementById('update-rental-notes').value = order.notes || '';

  openModal('modal-update-rental');
}

// Submit update for rental order (end date & notes)
async function submitUpdateRentalOrder(e) {
  e.preventDefault();
  const token = localStorage.getItem('tpbd_token');

  const id = document.getElementById('update-rental-id').value;
  const rental_end = document.getElementById('update-rental-end-date').value;
  const notes = document.getElementById('update-rental-notes').value.trim();

  try {
    const res = await fetch(`/api/rentals/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        rental_end: rental_end || null,
        notes
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Cập nhật thất bại!');

    showToast('Cập nhật thông tin đơn thuê thành công!');
    closeModal('modal-update-rental');
    loadRentals();
    if (typeof loadDashboardStats === 'function') loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Open modal to view full details of a rental order (for mobile & desktop)
async function openOrderDetailModal(id) {
  try {
    const res = await fetch(`/api/rentals/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Không thể tải chi tiết đơn thuê!');

    const { order, items } = data;

    document.getElementById('detail-order-code').innerText = order.order_code;
    document.getElementById('detail-order-date').innerText = 'Ngày tạo: ' + formatDate(order.created_at || order.rental_start);
    document.getElementById('detail-cust-name').innerText = order.customer_name;
    document.getElementById('detail-cust-phone').innerText = order.customer_phone;
    document.getElementById('detail-cust-phone').href = 'tel:' + order.customer_phone;

    document.getElementById('detail-rental-start').innerText = formatDate(order.rental_start);
    document.getElementById('detail-rental-end').innerText = order.rental_end ? formatDate(order.rental_end) : 'Chưa hẹn ngày';

    document.getElementById('detail-total-amount').innerText = formatVND(order.total_amount);
    document.getElementById('detail-deposit-amount').innerText = 'Tiền cọc: ' + formatVND(order.deposit_amount);

    // Badges
    document.getElementById('detail-payment-badge').innerHTML = order.is_paid 
      ? `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Đã Thanh Toán</span>` 
      : `<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Chưa Thanh Toán</span>`;

    document.getElementById('detail-status-badge').innerHTML = getRentalStatusBadge(order.status);

    // Notes
    const notesContainer = document.getElementById('detail-notes-container');
    if (order.notes) {
      notesContainer.style.display = 'block';
      document.getElementById('detail-notes-text').innerText = order.notes;
    } else {
      notesContainer.style.display = 'none';
    }

    // Items List
    const itemsContainer = document.getElementById('detail-items-list');
    itemsContainer.innerHTML = (items || []).map(item => {
      let imgList = [];
      try {
        imgList = typeof item.images === 'string' ? JSON.parse(item.images) : (item.images || []);
      } catch(e) {}
      if (imgList.length === 0 && item.image_url) imgList = [item.image_url];
      const coverImg = item.image_url || (imgList.length > 0 ? imgList[0] : 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500&auto=format&fit=crop&q=60');

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;">
          <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
            <img src="${coverImg}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0;">
            <div style="min-width: 0;">
              <strong style="font-size: 13px; color: var(--text-heading); display: block;">${item.costume_name}</strong>
              <small style="font-size: 11px; color: var(--text-muted);">
                Mã: <code>${item.costume_code}</code> ${item.size ? `| Size: <b>${item.size}</b>` : ''}
              </small>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 13px; font-weight: 800; color: var(--text-heading);">SL: ${item.qty}</div>
            <div style="font-size: 12px; font-weight: 700; color: var(--success);">${formatVND(item.item_total)}</div>
          </div>
        </div>
      `;
    }).join('');

    // Actions Footer
    const footer = document.getElementById('detail-actions-footer');
    let actionsHTML = '';

    if (!order.is_paid) {
      actionsHTML += `
        <button class="btn btn-primary btn-sm" onclick="closeModal('modal-order-detail'); updateRentalPayment(${order.id}, true)">
          <i class="fa-solid fa-hand-holding-dollar"></i> Xác Nhận Đã Trả Tiền
        </button>
      `;
    }

    if (['RENTED', 'OVERDUE'].includes(order.status)) {
      actionsHTML += `
        <button class="btn btn-success btn-sm" onclick="closeModal('modal-order-detail'); updateRentalStatus(${order.id}, 'RETURNED')">
          <i class="fa-solid fa-check"></i> Xác Nhận Trả Đồ
        </button>
        <button class="btn btn-secondary btn-sm" onclick="closeModal('modal-order-detail'); openUpdateRentalModal(${order.id})">
          <i class="fa-solid fa-calendar-pen"></i> Sửa Ngày Trả
        </button>
      `;
    }

    footer.innerHTML = actionsHTML;

    openModal('modal-order-detail');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
