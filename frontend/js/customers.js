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
  if (!tbody) return;

  if (!customers || customers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Chưa có dữ liệu khách hàng.</td></tr>`;
    return;
  }

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
