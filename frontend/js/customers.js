// ====== CUSTOMERS MODULE ======

let customersList = [];

async function loadCustomers(searchQuery = '') {
  const token = localStorage.getItem('tpbd_token');
  try {
    const res = await fetch(`/api/customers?search=${encodeURIComponent(searchQuery)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    customersList = await res.json();

    renderCustomersTable(customersList);
  } catch (err) {
    showToast('Lỗi khi tải danh sách khách hàng: ' + err.message, 'error');
  }
}

function renderCustomersTable(customers) {
  const tbody = document.getElementById('tbl-customers-list');
  const cardsContainer = document.getElementById('mobile-customers-cards');

  if (!customers || customers.length === 0) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">Chưa có dữ liệu khách hàng.</td></tr>`;
    if (cardsContainer) cardsContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 25px; background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border);">Chưa có dữ liệu khách hàng.</div>`;
    return;
  }

  if (tbody) {
    tbody.innerHTML = customers.map(c => `
      <tr>
        <td>#${c.id}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.phone}</td>
        <td>${c.address || '---'}</td>
        <td>${c.email || '---'}</td>
        <td>${c.organization || '---'}</td>
        <td><span class="badge badge-success">${c.total_orders} lần</span></td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
            <button type="button" class="btn btn-sm btn-outline" onclick="openEditCustomerModal(${c.id})" style="padding: 2px 8px; font-size: 11px;" title="Sửa thông tin khách hàng">
              <i class="fa-solid fa-pen-to-square"></i> Sửa
            </button>
            <button type="button" class="btn btn-sm" style="background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 700; cursor: pointer;" onclick="deleteCustomer(${c.id}, '${(c.name || '').replace(/'/g, "\\'")}')" title="Xóa khách hàng này">
              <i class="fa-solid fa-trash-can"></i> Xóa
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  if (cardsContainer) {
    cardsContainer.innerHTML = customers.map(c => `
      <div class="rental-card-mobile" style="border: 1px solid var(--border);" onclick="openEditCustomerModal(${c.id})">
        <!-- Top: Customer Name & Rental Count Badge & Actions -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
          <strong style="font-size: 15px; color: var(--text-heading); font-weight: 800;">${c.name}</strong>
          <div style="display: flex; gap: 6px; align-items: center;">
            <span class="badge badge-success" style="font-size: 11px;"><i class="fa-solid fa-receipt"></i> ${c.total_orders} lần</span>
            <button type="button" class="btn btn-sm" style="background: rgba(245, 158, 11, 0.12); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 700; cursor: pointer;" onclick="event.stopPropagation(); openEditCustomerModal(${c.id})" title="Sửa khách hàng">
              <i class="fa-solid fa-pen-to-square"></i> Sửa
            </button>
            <button type="button" class="btn btn-sm" style="background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 700; cursor: pointer;" onclick="event.stopPropagation(); deleteCustomer(${c.id}, '${(c.name || '').replace(/'/g, "\\'")}')" title="Xóa khách hàng">
              <i class="fa-solid fa-trash-can"></i> Xóa
            </button>
          </div>
        </div>

        <!-- Phone, Address, Email, Organization -->
        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; margin-top: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-muted); font-size: 12px;">Số điện thoại:</span>
            <a href="tel:${c.phone}" onclick="event.stopPropagation()" style="color: var(--primary); font-weight: 700; text-decoration: none; font-size: 13px; display: inline-flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-phone" style="font-size: 11px;"></i> ${c.phone}
            </a>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-muted); font-size: 12px;">Địa chỉ:</span>
            <span style="color: var(--text-heading); font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; text-align: right;">
              <i class="fa-solid fa-location-dot" style="font-size: 11px; color: var(--primary);"></i> ${c.address || 'Chưa cập nhật'}
            </span>
          </div>

          ${c.organization ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-muted); font-size: 12px;">Đoàn / Đơn vị:</span>
              <strong style="color: var(--text-heading); font-size: 12px;">${c.organization}</strong>
            </div>
          ` : ''}

          ${c.email ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-muted); font-size: 12px;">Email:</span>
              <span style="color: var(--text-heading); font-size: 12px;">${c.email}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  }
}

function openCreateCustomerModal() {
  const form = document.getElementById('form-customer');
  if (form) form.reset();

  const idInput = document.getElementById('cust-editing-id');
  if (idInput) idInput.value = '';

  const titleEl = document.getElementById('modal-customer-title');
  if (titleEl) titleEl.innerText = 'Thêm Khách Hàng Mới';

  const btnSubmit = document.getElementById('btn-submit-customer');
  if (btnSubmit) btnSubmit.innerHTML = `<i class="fa-solid fa-check"></i> Lưu Khách Hàng Mới`;

  openModal('modal-customer');
}

function openEditCustomerModal(id) {
  const customer = (customersList || []).find(c => c.id === id);
  if (!customer) {
    showToast('Không tìm thấy thông tin khách hàng!', 'error');
    return;
  }

  const idInput = document.getElementById('cust-editing-id');
  if (idInput) idInput.value = customer.id;

  document.getElementById('cust-name').value = customer.name || '';
  document.getElementById('cust-phone').value = customer.phone || '';
  document.getElementById('cust-address').value = customer.address || '';
  if (document.getElementById('cust-organization')) {
    document.getElementById('cust-organization').value = customer.organization || '';
  }
  if (document.getElementById('cust-email')) {
    document.getElementById('cust-email').value = customer.email || '';
  }

  const titleEl = document.getElementById('modal-customer-title');
  if (titleEl) titleEl.innerText = `Chỉnh Sửa Khách Hàng (#${customer.id})`;

  const btnSubmit = document.getElementById('btn-submit-customer');
  if (btnSubmit) btnSubmit.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Lưu Cập Nhật Khách Hàng`;

  openModal('modal-customer');
}

async function saveCustomer(e) {
  e.preventDefault();
  const token = localStorage.getItem('tpbd_token');
  const editingId = document.getElementById('cust-editing-id')?.value;

  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const address = document.getElementById('cust-address').value.trim();
  const organization = (document.getElementById('cust-organization')?.value || '').trim();
  const email = (document.getElementById('cust-email')?.value || '').trim();

  if (!name || !phone) {
    showToast('Vui lòng nhập Tên và Số điện thoại khách hàng!', 'error');
    return;
  }

  const endpoint = editingId ? `/api/customers/${editingId}` : '/api/customers';
  const method = editingId ? 'PUT' : 'POST';

  try {
    const res = await fetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, phone, address, organization, email })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi khi lưu khách hàng!');

    showToast(editingId ? 'Cập nhật thông tin khách hàng thành công!' : 'Thêm khách hàng mới thành công!');
    closeModal('modal-customer');
    loadCustomers();

    // Reset customer cache for rental autocomplete suggestions
    if (typeof cachedCustomerList !== 'undefined') {
      cachedCustomerList = [];
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCustomer(id, customerName) {
  if (!confirm(`Bạn có chắc chắn muốn xóa khách hàng "${customerName}" khỏi hệ thống?`)) return;

  const token = localStorage.getItem('tpbd_token');
  try {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Xóa khách hàng thất bại!');

    showToast(`Đã xóa khách hàng "${customerName}" khỏi danh sách!`);
    loadCustomers();

    // Reset customer cache for rental autocomplete suggestions
    if (typeof cachedCustomerList !== 'undefined') {
      cachedCustomerList = [];
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}
