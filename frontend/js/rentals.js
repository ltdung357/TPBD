// ====== RENTALS MODULE ======

let rentalsList = [];
let rentalFilter = { status: 'ALL', pay: 'ALL' };

async function loadRentals(searchQuery = '') {
  try {
    const res = await fetch(`/api/rentals?search=${encodeURIComponent(searchQuery)}`);
    rentalsList = await res.json();
    applyRentalFilter();
  } catch (err) {
    showToast('Lỗi khi tải danh sách đơn thuê: ' + err.message, 'error');
  }
}

// Set filter from select and re-render
function setRentalFilter(type, value) {
  rentalFilter[type] = value;
  applyRentalFilter();
}

// Apply current filters to rentalsList and render
function applyRentalFilter() {
  let filtered = rentalsList;

  if (rentalFilter.status !== 'ALL') {
    filtered = filtered.filter(o => o.status === rentalFilter.status);
  }
  if (rentalFilter.pay === 'PAID') {
    filtered = filtered.filter(o => !!o.is_paid);
  } else if (rentalFilter.pay === 'UNPAID') {
    filtered = filtered.filter(o => !o.is_paid);
  }

  // Update count badge
  const countEl = document.getElementById('rental-filter-count');
  if (countEl) {
    countEl.textContent = filtered.length > 0 ? `${filtered.length} đơn` : 'Không có đơn';
  }

  renderRentalsTable(filtered);
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
    tbody.innerHTML = orders.map(order => {
      const isDraft = order.status === 'DRAFT';
      const clickHandler = isDraft ? `editDraftOrder(${order.id})` : `openOrderDetailModal(${order.id})`;

      return `
      <tr onclick="${clickHandler}" style="cursor: pointer;" title="${isDraft ? 'Bấm vào để sửa đơn nháp' : 'Bấm vào để xem chi tiết đơn thuê'}">
        <td><strong style="color: var(--primary);">${order.order_code}</strong></td>
        <td>${order.customer_name}</td>
        <td>${order.customer_phone}</td>
        <td>${formatDate(order.rental_start)}</td>
        <td>
          ${order.rental_end 
            ? formatDate(order.rental_end) 
            : (isDraft 
                ? `<span style="color: var(--text-muted); font-size: 12px;">--</span>` 
                : `<span class="badge badge-warning" style="font-size: 11px;" onclick="event.stopPropagation(); openUpdateRentalModal(${order.id})" title="Bấm để cập nhật ngày trả đồ"><i class="fa-solid fa-clock"></i> Chưa hẹn ngày</span>`)}
        </td>
        <td><strong style="color: var(--success);">${formatVND(order.total_amount)}</strong></td>
        <td>
          ${isDraft 
            ? `<span style="color: var(--text-muted); font-size: 12px;">--</span>` 
            : (order.is_paid 
                ? `<span class="badge badge-success" style="white-space: nowrap;"><i class="fa-solid fa-circle-check"></i> Đã Thanh Toán</span>` 
                : `<span class="badge badge-warning" style="white-space: nowrap;"><i class="fa-solid fa-clock"></i> Chưa Thanh Toán</span>`)}
        </td>
        <td>${formatVND(order.deposit_amount)}</td>
        <td>
          <div style="display: inline-flex; align-items: center; gap: 6px;">
            ${getRentalStatusBadge(order.status)}
            ${isDraft ? `<button type="button" class="btn btn-sm" style="background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 6px; padding: 2px 6px; font-size: 11px; font-weight: 700; cursor: pointer;" onclick="event.stopPropagation(); deleteDraftOrder(${order.id})" title="Xóa đơn nháp này"><i class="fa-solid fa-trash-can"></i> Xóa</button>` : ''}
          </div>
        </td>
        <td style="text-align: center; color: var(--text-muted); font-size: 12px;">
          ${isDraft 
            ? `<span style="color: #d97706; font-weight: 700;"><i class="fa-solid fa-pen-to-square"></i> Sửa nháp</span>` 
            : `<i class="fa-solid fa-circle-info" style="margin-right: 4px;"></i>Bấm để xem`}
        </td>
      </tr>
    `;
    }).join('');
  }

  // Render Mobile Cards View
  if (cardsContainer) {
    cardsContainer.innerHTML = orders.map(order => {
      const isDraft = order.status === 'DRAFT';
      const isReturned = order.status === 'RETURNED';
      const isPaid = !!order.is_paid;
      // Chỉ khi Đã Trả Đồ VÀ Đã Thanh Toán mới hiện màu xanh (rental-card-returned), chưa trả đồ HOẶC chưa thanh toán thì vẫn màu đỏ (rental-card-unreturned)
      const borderClass = isDraft ? 'rental-card-draft' : ((isReturned && isPaid) ? 'rental-card-returned' : 'rental-card-unreturned');
      const clickHandler = isDraft ? `editDraftOrder(${order.id})` : `openOrderDetailModal(${order.id})`;

      return `
        <div class="rental-card-mobile ${borderClass}" onclick="${clickHandler}" style="cursor: pointer;">
        <!-- Top: Order code & Status Badges -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; padding-bottom: 10px; border-bottom: 1px solid var(--border);">
          <div>
            <div style="font-size: 11px; color: var(--text-muted);">Mã đơn thuê</div>
            <strong style="font-size: 15px; color: var(--primary); font-weight: 800;">${order.order_code}</strong>
          </div>
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
            ${getRentalStatusBadge(order.status)}
            ${isDraft ? `<button type="button" class="btn btn-sm" style="background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 700; cursor: pointer;" onclick="event.stopPropagation(); deleteDraftOrder(${order.id})" title="Xóa đơn nháp này"><i class="fa-solid fa-trash-can"></i> Xóa</button>` : ''}
            ${!isDraft ? (order.is_paid 
              ? `<span class="badge badge-success" style="font-size: 10px;"><i class="fa-solid fa-circle-check"></i> Đã TT</span>` 
              : `<span class="badge badge-warning" style="font-size: 10px;"><i class="fa-solid fa-clock"></i> Chưa TT</span>`) : ''}
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
          ${order.customer_address ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-muted); font-size: 12px;">Địa chỉ:</span>
              <span style="color: var(--text-heading); font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                <i class="fa-solid fa-location-dot" style="font-size: 10px; color: var(--primary);"></i> ${order.customer_address}
              </span>
            </div>
          ` : ''}
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
              : (isDraft 
                  ? `<span style="font-size: 12px; color: var(--text-muted);">--</span>` 
                  : `<span class="badge badge-warning" style="font-size: 10px; cursor: pointer;" onclick="event.stopPropagation(); openUpdateRentalModal(${order.id})"><i class="fa-solid fa-clock"></i> Chưa hẹn ngày</span>`)}
          </div>
        </div>

        <!-- Footer: Total amount & click action hint -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px dashed var(--border); margin-top: 2px;">
          <div>
            <span style="font-size: 11px; color: var(--text-muted); display: block;">Tổng tiền thuê</span>
            <strong style="font-size: 16px; color: var(--success); font-weight: 900;">${formatVND(order.total_amount)}</strong>
          </div>
          <span style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
            ${isDraft 
              ? `<span style="font-size: 12px; font-weight: 700; color: #d97706; display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-pen-to-square"></i> Bấm để sửa nháp</span>` 
              : `<i class="fa-solid fa-hand-pointer" style="font-size: 13px;"></i> Bấm để xem`}
          </span>
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
    case 'DRAFT':
      return `<span class="badge" style="background: #64748b; color: #ffffff;"><i class="fa-solid fa-file-pen"></i> Nháp</span>`;
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

  const draftIdInput = document.getElementById('rental-editing-draft-id');
  if (draftIdInput) draftIdInput.value = '';

  const titleEl = document.getElementById('modal-rental-title');
  if (titleEl) titleEl.innerText = 'Tạo Đơn Thuê Trang Phục & Đạo Cụ';

  const startInput = document.getElementById('rental-start-date');
  const endInput = document.getElementById('rental-end-date');
  if (startInput) {
    startInput.value = new Date().toISOString().split('T')[0];
  }
  if (endInput) {
    endInput.value = '';
  }

  if (!costumesList || costumesList.length === 0) {
    if (typeof loadCostumes === 'function') loadCostumes();
  }

  openModal('modal-rental');
}

function handleCloseRentalModal() {
  const custName = (document.getElementById('rental-cust-name')?.value || '').trim();
  const custPhone = (document.getElementById('rental-cust-phone')?.value || '').trim();
  const custAddress = (document.getElementById('rental-cust-address')?.value || '').trim();
  const notes = (document.getElementById('rental-notes')?.value || '').trim();
  const hasItems = selectedRentalItems && selectedRentalItems.length > 0;

  if (custName || custPhone || custAddress || notes || hasItems) {
    openModal('modal-confirm-draft');
  } else {
    forceCloseRentalModal();
  }
}

function forceCloseRentalModal() {
  closeModal('modal-rental');
  document.getElementById('form-rental').reset();
  if (document.getElementById('rental-editing-draft-id')) {
    document.getElementById('rental-editing-draft-id').value = '';
  }
  if (document.getElementById('rental-cust-address')) {
    document.getElementById('rental-cust-address').value = '';
  }
  const titleEl = document.getElementById('modal-rental-title');
  if (titleEl) titleEl.innerText = 'Tạo Đơn Thuê Trang Phục & Đạo Cụ';

  selectedRentalItems = [];
  renderSelectedRentalItems();
}

async function confirmSaveDraft(shouldSave) {
  closeModal('modal-confirm-draft');

  if (!shouldSave) {
    forceCloseRentalModal();
    return;
  }

  await submitSaveDraftOrder();
}

async function submitSaveDraftOrder() {
  const token = localStorage.getItem('tpbd_token');
  const draftId = document.getElementById('rental-editing-draft-id')?.value;
  const customer_name = document.getElementById('rental-cust-name').value.trim() || 'Khách Nháp';
  const customer_phone = document.getElementById('rental-cust-phone').value.trim() || '0000000000';
  const customer_address = (document.getElementById('rental-cust-address')?.value || '').trim();
  const rental_start = document.getElementById('rental-start-date').value || new Date().toISOString().split('T')[0];
  const notes = document.getElementById('rental-notes').value.trim();

  if (!selectedRentalItems || selectedRentalItems.length === 0) {
    showToast('Vui lòng chọn ít nhất 1 món đồ để lưu bản nháp!', 'error');
    return;
  }

  const endpoint = draftId ? `/api/rentals/${draftId}/full` : '/api/rentals';
  const method = draftId ? 'PUT' : 'POST';

  try {
    const res = await fetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        customer_name,
        customer_phone,
        customer_address,
        rental_start,
        rental_end: null,
        status: 'DRAFT',
        notes,
        is_paid: false,
        items: selectedRentalItems
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi khi lưu đơn nháp!');

    showToast('Đã lưu đơn dưới dạng Bản Nháp (khung màu xám)!');
    forceCloseRentalModal();
    loadRentals();
    if (typeof loadDashboardStats === 'function') loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function editDraftOrder(id) {
  try {
    const res = await fetch(`/api/rentals/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi khi tải đơn nháp!');

    const { order, items } = data;

    const draftIdInput = document.getElementById('rental-editing-draft-id');
    if (draftIdInput) draftIdInput.value = order.id;

    const titleEl = document.getElementById('modal-rental-title');
    if (titleEl) titleEl.innerText = `Chỉnh Sửa & Tiếp Tục Tạo Đơn (${order.order_code})`;

    document.getElementById('rental-cust-name').value = order.customer_name || '';
    document.getElementById('rental-cust-phone').value = order.customer_phone || '';
    if (document.getElementById('rental-cust-address')) {
      document.getElementById('rental-cust-address').value = order.customer_address || '';
    }
    document.getElementById('rental-start-date').value = order.rental_start ? order.rental_start.split('T')[0] : new Date().toISOString().split('T')[0];
    document.getElementById('rental-notes').value = order.notes || '';

    const isPaidCheck = document.getElementById('rental-is-paid');
    if (isPaidCheck) isPaidCheck.checked = !!order.is_paid;

    selectedRentalItems = (items || []).map(i => ({
      costume_id: i.costume_id,
      qty: parseInt(i.qty || 1, 10)
    }));

    if (!costumesList || costumesList.length === 0) {
      if (typeof loadCostumes === 'function') await loadCostumes();
    }

    renderSelectedRentalItems();
    openModal('modal-rental');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteDraftOrder(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa đơn thuê này khỏi hệ thống?')) return;
  const token = localStorage.getItem('tpbd_token');
  try {
    const res = await fetch(`/api/rentals/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Xóa đơn thất bại!');

    showToast(data.message || 'Đã xóa đơn thuê thành công!');
    loadRentals();
    if (typeof loadDashboardStats === 'function') loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

const deleteRentalOrder = deleteDraftOrder;

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
      <div style="display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; background: var(--surface, #ffffff); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
        <!-- Top: Cover Image + Product Name & Size/Code -->
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${coverImg}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0;">
          <div style="flex: 1; min-width: 0;">
            <strong style="font-size: 14px; color: var(--text-heading); display: block; line-height: 1.35; font-weight: 700;">${item.name}</strong>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <span>Mã: <code style="font-weight: 700; color: var(--primary);">${item.code}</code></span>
              ${item.size ? `<span>• Size: <b style="color: var(--text-heading);">${item.size}</b></span>` : ''}
            </div>
          </div>
        </div>

        <!-- Bottom: Quantity controls + Subtotal + Delete button -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px dashed var(--border); margin-top: 2px;">
          <div style="display: flex; align-items: center; background: rgba(0, 0, 0, 0.04); border: 1px solid var(--border); border-radius: 8px; padding: 2px 4px;">
            <button type="button" class="btn btn-sm" style="padding: 2px 10px; font-weight: 800; cursor: pointer; color: #ef4444;" onclick="adjustRentalItemQty(${item.id}, -1)">-</button>
            <input type="number" value="${itemState.qty}" min="1" 
              onchange="setRentalItemQty(${item.id}, this.value)" 
              style="width: 38px; text-align: center; border: none; background: transparent; color: var(--text-heading); font-weight: 800; font-size: 13px;">
            <button type="button" class="btn btn-sm" style="padding: 2px 10px; font-weight: 800; cursor: pointer; color: #10b981;" onclick="adjustRentalItemQty(${item.id}, 1)">+</button>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <strong style="font-size: 15px; color: var(--success); font-weight: 800;">
              ${formatVND(subtotal)}
            </strong>

            <button type="button" class="btn btn-sm" style="color: #ef4444; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 6px 10px; cursor: pointer;" onclick="removeRentalItemById(${item.id})" title="Xóa món này">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
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

  const draftId = document.getElementById('rental-editing-draft-id')?.value;
  const customer_name = document.getElementById('rental-cust-name').value.trim();
  const customer_phone = document.getElementById('rental-cust-phone').value.trim();
  const customer_address = (document.getElementById('rental-cust-address')?.value || '').trim();
  const rental_start = document.getElementById('rental-start-date').value;
  const notes = document.getElementById('rental-notes').value.trim();
  const is_paid = document.getElementById('rental-is-paid')?.checked || false;

  if (!selectedRentalItems || selectedRentalItems.length === 0) {
    showToast('Vui lòng bấm "+ Thêm Món Đồ" để chọn trang phục bằng hình ảnh!', 'error');
    return;
  }

  const endpoint = draftId ? `/api/rentals/${draftId}/full` : '/api/rentals';
  const method = draftId ? 'PUT' : 'POST';

  try {
    const res = await fetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        customer_name,
        customer_phone,
        customer_address,
        rental_start,
        rental_end: null,
        status: 'RENTED',
        notes,
        is_paid,
        items: selectedRentalItems
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi khi lưu đơn thuê!');

    showToast(draftId ? 'Đã hoàn tất và tạo đơn thuê thành công!' : 'Tạo đơn thuê trang phục thành công!');
    forceCloseRentalModal();
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

    const addressEl = document.getElementById('detail-cust-address');
    if (addressEl) {
      addressEl.innerText = order.customer_address || 'Chưa cập nhật địa chỉ';
    }

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
    let actionsHTML = `
      <button class="btn btn-outline btn-sm" onclick="exportRentalInvoice(${order.id})">
        <i class="fa-solid fa-file-pdf"></i> In / Xuất Hóa Đơn (PDF)
      </button>
    `;

    if (!order.is_paid && order.status !== 'DRAFT') {
      actionsHTML += `
        <button class="btn btn-primary btn-sm" onclick="closeModal('modal-order-detail'); updateRentalPayment(${order.id}, true)">
          <i class="fa-solid fa-hand-holding-dollar"></i> Xác Nhận Đã Trả Tiền
        </button>
      `;
    }

    if (['RENTED', 'OVERDUE'].includes(order.status)) {
      actionsHTML += `
        <button class="btn btn-success btn-sm" onclick="closeModal('modal-order-detail'); openReturnRentalModal(${order.id})">
          <i class="fa-solid fa-check"></i> Xác Nhận Trả Đồ
        </button>
        <button class="btn btn-secondary btn-sm" onclick="closeModal('modal-order-detail'); openUpdateRentalModal(${order.id})">
          <i class="fa-solid fa-calendar-pen"></i> Sửa Ngày Trả
        </button>
      `;
    }

    if (order.status === 'DRAFT') {
      actionsHTML += `
        <button class="btn btn-warning btn-sm" onclick="closeModal('modal-order-detail'); editDraftOrder(${order.id})">
          <i class="fa-solid fa-pen-to-square"></i> Sửa & Tiếp Tục Tạo Đơn
        </button>
        <button class="btn btn-primary btn-sm" onclick="closeModal('modal-order-detail'); updateRentalStatus(${order.id}, 'RENTED')">
          <i class="fa-solid fa-check-double"></i> Chốt Đơn (Chuyển Sang Đang Thuê)
        </button>
        <button class="btn btn-danger btn-sm" onclick="closeModal('modal-order-detail'); deleteDraftOrder(${order.id})">
          <i class="fa-solid fa-trash"></i> Xóa Đơn Nháp
        </button>
      `;
    } else {
      actionsHTML += `
        <button class="btn btn-outline btn-sm" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4);" onclick="closeModal('modal-order-detail'); deleteRentalOrder(${order.id})">
          <i class="fa-solid fa-trash-can"></i> Xóa Đơn Này
        </button>
      `;
    }

    footer.innerHTML = actionsHTML;

    openModal('modal-order-detail');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Open modal to return rental with date picker (defaults to today)
function openReturnRentalModal(id) {
  const order = rentalsList.find(o => o.id === id);
  if (!order) {
    fetch(`/api/rentals/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.order) setupAndOpenReturnModal(data.order);
      })
      .catch(err => showToast('Lỗi khi tải thông tin đơn thuê: ' + err.message, 'error'));
    return;
  }
  setupAndOpenReturnModal(order);
}

function setupAndOpenReturnModal(order) {
  document.getElementById('return-rental-id').value = order.id;
  document.getElementById('return-rental-code').innerText = order.order_code;
  document.getElementById('return-rental-cust').innerText = `${order.customer_name} (${order.customer_phone})`;
  
  // Set default return date to TODAY
  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('return-rental-date').value = todayStr;

  openModal('modal-return-rental');
}

function setReturnDateToToday() {
  const todayStr = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('return-rental-date');
  if (dateInput) dateInput.value = todayStr;
}

// Submit Return Rental with selected date
async function submitReturnRental(e) {
  e.preventDefault();
  const token = localStorage.getItem('tpbd_token');
  const id = document.getElementById('return-rental-id').value;
  const rental_end = document.getElementById('return-rental-date').value;

  try {
    const res = await fetch(`/api/rentals/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'RETURNED', rental_end })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Cập nhật trả đồ thất bại!');

    showToast(data.message || 'Xác nhận trả đồ thành công!');
    closeModal('modal-return-rental');
    loadRentals();
    if (typeof loadDashboardStats === 'function') loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Convert number to Vietnamese text for invoice total amount
function docSoThanhChu(number) {
  if (!number || number === 0) return 'Không đồng.';
  const chuSo = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readGroup(group, isHighest) {
    let read = '';
    const tr = Math.floor(group / 100);
    const ch = Math.floor((group % 100) / 10);
    const dv = group % 10;
    if (tr === 0 && ch === 0 && dv === 0) return '';
    if (tr !== 0) {
      read += chuSo[tr] + ' trăm ';
      if (ch === 0 && dv !== 0) read += 'lẻ ';
    } else if (!isHighest && (ch !== 0 || dv !== 0)) {
      read += 'không trăm ';
    }

    if (ch > 1) {
      read += chuSo[ch] + ' mươi ';
      if (dv === 1) read += 'mốt ';
      else if (dv === 5) read += 'lăm ';
      else if (dv > 0) read += chuSo[dv] + ' ';
    } else if (ch === 1) {
      read += 'mười ';
      if (dv === 1) read += 'một ';
      else if (dv === 5) read += 'lăm ';
      else if (dv > 0) read += chuSo[dv] + ' ';
    } else if (ch === 0 && dv > 0) {
      read += chuSo[dv] + ' ';
    }
    return read;
  }

  let numStr = Math.floor(Math.abs(number)).toString();
  let groups = [];
  while (numStr.length > 0) {
    groups.unshift(parseInt(numStr.slice(-3), 10));
    numStr = numStr.slice(0, -3);
  }

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  let result = '';
  let totalGroups = groups.length;

  for (let i = 0; i < totalGroups; i++) {
    let group = groups[i];
    let unitIndex = totalGroups - 1 - i;
    if (group > 0) {
      let isHighest = (i === 0);
      let gText = readGroup(group, isHighest);
      result += gText + (units[unitIndex] ? units[unitIndex] + ' ' : '');
    }
  }

  result = result.trim().replace(/\s+/g, ' ');
  if (!result) return 'Không đồng.';
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng.';
}

// Export Rental Invoice matching Hoa_Don_Ban_Hang_Le.XLS template 100%
async function exportRentalInvoice(id) {
  try {
    const res = await fetch(`/api/rentals/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Không thể tải chi tiết đơn thuê!');

    const { order, items } = data;
    const orderDate = new Date(order.rental_start || order.created_at || Date.now());
    const day = String(orderDate.getDate()).padStart(2, '0');
    const month = String(orderDate.getMonth() + 1).padStart(2, '0');
    const year = orderDate.getFullYear();

    const maxRows = 12; // Padded to 12 rows matching Excel template exactly
    let rowsHTML = '';
    
    for (let i = 0; i < maxRows; i++) {
      const item = items && items[i] ? items[i] : null;
      if (item) {
        rowsHTML += `
          <tr>
            <td style="text-align: center;">${i + 1}</td>
            <td style="text-align: left; font-weight: bold;">${item.costume_name} ${item.size ? `(Size: ${item.size})` : ''}</td>
            <td style="text-align: center;">${item.qty}</td>
            <td style="text-align: right;">${formatVND(item.price_per_day).replace(' đ', '')}</td>
            <td style="text-align: right; font-weight: bold;">${formatVND(item.item_total).replace(' đ', '')}</td>
          </tr>
        `;
      } else {
        rowsHTML += `
          <tr>
            <td style="text-align: center; color: #ccc;">${i + 1}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        `;
      }
    }

    const totalAmountNum = parseFloat(order.total_amount || 0);
    const amountInWords = docSoThanhChu(totalAmountNum);

    const invoiceHTML = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Hóa Đơn Bán Hàng - ${order.order_code}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Times New Roman', Times, serif;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 20px;
            -webkit-print-color-adjust: exact;
          }
          .invoice-box {
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
            padding: 24px;
          }
          
          .store-header {
            width: 100%;
            margin-bottom: 24px;
          }
          .store-header table {
            width: 100%;
            border-collapse: collapse;
          }
          .brand-col {
            width: 42%;
            text-align: center;
            vertical-align: top;
          }
          .brand-title-sm {
            font-family: 'Bookman Old Style', Georgia, serif;
            font-size: 15pt;
            font-weight: bold;
            letter-spacing: 0.5px;
          }
          .brand-title-lg {
            font-family: 'Bookman Old Style', Georgia, serif;
            font-size: 32pt;
            font-weight: bold;
            margin-top: 6px;
            letter-spacing: 1px;
          }
          .info-col {
            width: 58%;
            font-size: 12.5pt;
            font-weight: bold;
            line-height: 1.6;
            vertical-align: top;
            padding-left: 20px;
          }

          .cust-info-section {
            font-size: 14.5pt;
            line-height: 2;
            margin-bottom: 20px;
          }
          .dotted-line {
            display: inline-block;
            border-bottom: 1px dotted #000;
            min-width: 300px;
            font-weight: bold;
            padding-left: 10px;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .items-table th, .items-table td {
            border: 1px solid #000;
            padding: 6px 8px;
            font-size: 13.5pt;
            height: 28px;
          }
          .items-table th {
            font-weight: bold;
            text-align: center;
            background-color: #f2f2f2;
          }

          .total-cell-label {
            font-weight: bold;
            text-align: center;
            font-size: 14pt;
          }
          .total-cell-value {
            font-weight: bold;
            text-align: right;
            font-size: 14.5pt;
          }

          .words-section {
            font-size: 14pt;
            margin-top: 15px;
            margin-bottom: 30px;
            line-height: 1.6;
          }

          .footer-section {
            width: 100%;
            margin-top: 20px;
          }
          .footer-right {
            float: right;
            width: 300px;
            text-align: center;
            font-size: 13.5pt;
          }
          .footer-date {
            margin-bottom: 10px;
          }
          .footer-sign-title {
            font-weight: bold;
            font-size: 14pt;
          }

          @media print {
            #print-invoice-frame-overlay,
            #print-invoice-frame-overlay * {
              visibility: visible !important;
            }
            body > *:not(#print-invoice-frame-overlay) {
              display: none !important;
            }
            #print-invoice-frame-overlay {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: 100% !important;
              display: block !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar" style="background: #3b82f6; color: #fff; padding: 12px; text-align: center; font-family: sans-serif; font-size: 14px; position: sticky; top: 0; z-index: 9999; display: flex; justify-content: center; gap: 12px; align-items: center;">
          <span><strong>Mẫu Hóa Đơn TPBD Thúy Hà (Chuẩn 100% Excel)</strong></span>
          <button onclick="window.print()" style="background: #fff; color: #1d4ed8; border: none; padding: 8px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">
            🖨️ In / Tải File PDF
          </button>
          <button onclick="window.close()" style="background: rgba(255,255,255,0.2); color: #fff; border: 1px solid #fff; padding: 8px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">
            Đóng
          </button>
        </div>

        <div class="invoice-box">
          <!-- Header Store Info -->
          <div class="store-header">
            <table>
              <tr>
                <td class="brand-col">
                  <div class="brand-title-sm">TRANG PHỤC BIỂU DIỄN</div>
                  <div class="brand-title-lg">THÚY HÀ</div>
                </td>
                <td class="info-col">
                  <div>Địa chỉ: Khối Quyết Thắng - TX.Thái Hòa - Nghệ An</div>
                  <div>SĐT: 0394378999 - 0962384661</div>
                  <div>FB: Ha Minh - Mai Diệu Thúy</div>
                  <div>STK BIDV: 5130268161 (Mai Diệu Thúy)</div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Customer Details -->
          <div class="cust-info-section">
            <div>Tên khách hàng: <span class="dotted-line" style="width: 75%;">${order.customer_name}</span></div>
            <div>Địa chỉ: <span class="dotted-line" style="width: 84%;">${order.customer_address || order.customer_organization || ''}</span></div>
            <div>Sđt: <span class="dotted-line" style="width: 86%;">${order.customer_phone}</span></div>
          </div>

          <!-- Table of Items -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50px;">TT</th>
                <th>TÊN TRANG PHỤC</th>
                <th style="width: 70px;">SL</th>
                <th style="width: 130px;">ĐƠN GIÁ</th>
                <th style="width: 150px;">THÀNH TIỀN</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
              <tr class="total-row">
                <td colspan="4" class="total-cell-label">TỔNG CỘNG</td>
                <td class="total-cell-value">${formatVND(order.total_amount).replace(' đ', '')}</td>
              </tr>
            </tbody>
          </table>

          <!-- Amount in Words -->
          <div class="words-section">
            Thành tiền: <strong>${amountInWords}</strong>
          </div>

          <!-- Signature & Date -->
          <div class="footer-section">
            <div class="footer-right">
              <div class="footer-date">Ngày ${day} tháng ${month} năm ${year}</div>
              <div class="footer-sign-title">NGƯỜI BÁN HÀNG</div>
            </div>
            <div style="clear: both;"></div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    // === Mobile-safe: dùng Blob URL + iframe ẩn, không cần popup ===
    const blob = new Blob([invoiceHTML], { type: 'text/html; charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    // Xóa iframe cũ nếu còn
    const oldFrame = document.getElementById('print-invoice-frame-overlay');
    if (oldFrame) oldFrame.remove();

    // Tạo iframe ẩn nhúng vào trang
    const iframe = document.createElement('iframe');
    iframe.id = 'print-invoice-frame-overlay';
    iframe.src = blobUrl;
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:999999;background:#fff;';
    document.body.appendChild(iframe);

    // Nút đóng iframe (hiển thị trong iframe header, nhưng thêm nút đóng bên ngoài phòng hờ)
    iframe.onload = function () {
      URL.revokeObjectURL(blobUrl); // giải phóng bộ nhớ
      // Gắn nút đóng vào iframe document nếu có thể truy cập
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const closeButtons = iframeDoc.querySelectorAll('button');
        closeButtons.forEach(btn => {
          if (btn.textContent.includes('Đóng')) {
            btn.addEventListener('click', () => {
              iframe.remove();
            });
          }
        });
      } catch (e) { /* cross-origin safe */ }
    };
  } catch (err) {
    showToast(err.message, 'error');
  }
}
