// ====== CUSTOMERS MODULE ======

async function loadCustomers(searchQuery = '') {
  const token = localStorage.getItem('tpbd_token');
  try {
    const res = await fetch(`/api/customers?search=${encodeURIComponent(searchQuery)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const customers = await res.json();

    renderCustomersTable(customers);
  } catch (err) {
    showToast('Lỗi khi tải danh sách khách hàng: ' + err.message, 'error');
  }
}

function renderCustomersTable(customers) {
  const tbody = document.getElementById('tbl-customers-list');
  const cardsContainer = document.getElementById('mobile-customers-cards');

  if (!customers || customers.length === 0) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Chưa có dữ liệu khách hàng.</td></tr>`;
    if (cardsContainer) cardsContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 25px; background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border);">Chưa có dữ liệu khách hàng.</div>`;
    return;
  }

  if (tbody) {
    tbody.innerHTML = customers.map(c => `
      <tr>
        <td>#${c.id}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.phone}</td>
        <td>${c.email || '---'}</td>
        <td>${c.organization || '---'}</td>
        <td><span class="badge badge-success">${c.total_orders} lần</span></td>
      </tr>
    `).join('');
  }

  if (cardsContainer) {
    cardsContainer.innerHTML = customers.map(c => `
      <div class="rental-card-mobile" style="border: 1px solid var(--border);">
        <!-- Top: Customer Name & Rental Count Badge -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
          <strong style="font-size: 15px; color: var(--text-heading); font-weight: 800;">${c.name}</strong>
          <span class="badge badge-success" style="font-size: 11px;"><i class="fa-solid fa-receipt"></i> ${c.total_orders} lần thuê</span>
        </div>

        <!-- Phone, Email, Organization -->
        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; margin-top: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-muted); font-size: 12px;">Số điện thoại:</span>
            <a href="tel:${c.phone}" style="color: var(--primary); font-weight: 700; text-decoration: none; font-size: 13px; display: inline-flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-phone" style="font-size: 11px;"></i> ${c.phone}
            </a>
          </div>

          ${c.email ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-muted); font-size: 12px;">Email:</span>
              <span style="color: var(--text-heading); font-size: 12px;">${c.email}</span>
            </div>
          ` : ''}

          ${c.organization ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-muted); font-size: 12px;">Đoàn / Đơn vị:</span>
              <strong style="color: var(--text-heading); font-size: 12px;">${c.organization}</strong>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  }
}
