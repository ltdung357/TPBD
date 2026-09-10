// ====== DASHBOARD & REPORTS MODULE ======

async function loadDashboardStats() {
  try {
    const res = await fetch('/api/reports/dashboard');
    const data = await res.json();

    const { summary, urgent_rentals } = data;

    // Update Stat Cards
    document.getElementById('stat-total-items').innerText = summary.total_items || 0;
    document.getElementById('stat-available-inventory').innerText = summary.available_inventory || 0;
    document.getElementById('stat-active-rentals').innerText = summary.active_rentals || 0;
    document.getElementById('stat-total-revenue').innerText = formatVND(summary.rental_revenue || 0);

    // Render Urgent Rentals Table
    renderUrgentRentals(urgent_rentals);
  } catch (err) {
    console.error('Lỗi khi tải Dashboard Stats:', err.message);
  }
}

function renderUrgentRentals(items) {
  const tbody = document.getElementById('tbl-urgent-rentals');
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Không có đơn thuê nào sắp đến hạn.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr>
      <td><strong>${item.order_code}</strong></td>
      <td>${item.customer_name}</td>
      <td>${item.customer_phone}</td>
      <td>${formatDate(item.rental_end)}</td>
      <td><strong style="color: var(--success);">${formatVND(item.total_amount)}</strong></td>
      <td>${getRentalStatusBadge(item.status)}</td>
    </tr>
  `).join('');
}
