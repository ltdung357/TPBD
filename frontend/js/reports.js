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
  const cardsContainer = document.getElementById('mobile-urgent-rentals-cards');

  if (!items || items.length === 0) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Không có đơn thuê nào sắp đến hạn.</td></tr>`;
    if (cardsContainer) cardsContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border);">Không có đơn thuê nào sắp đến hạn.</div>`;
    return;
  }

  if (tbody) {
    tbody.innerHTML = items.map(item => `
      <tr onclick="openOrderDetailModal(${item.id})" style="cursor: pointer;">
        <td><strong style="color: var(--primary);">${item.order_code}</strong></td>
        <td>${item.customer_name}</td>
        <td>${item.customer_phone}</td>
        <td>${formatDate(item.rental_end)}</td>
        <td><strong style="color: var(--success);">${formatVND(item.total_amount)}</strong></td>
        <td>${getRentalStatusBadge(item.status)}</td>
      </tr>
    `).join('');
  }

  if (cardsContainer) {
    cardsContainer.innerHTML = items.map(item => {
      const isReturned = item.status === 'RETURNED';
      const isPaid = !!item.is_paid;
      const borderClass = (isReturned && isPaid) ? 'rental-card-returned' : 'rental-card-unreturned';

      return `
        <div class="rental-card-mobile ${borderClass}" onclick="openOrderDetailModal(${item.id})" style="cursor: pointer;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
            <strong style="font-size: 15px; color: var(--primary);">${item.order_code}</strong>
            ${getRentalStatusBadge(item.status)}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 4px;">
            <span style="color: var(--text-muted);">Khách hàng:</span>
            <strong>${item.customer_name} (${item.customer_phone})</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px;">
            <span style="color: var(--text-muted);">Hạn trả đồ:</span>
            <b>${formatDate(item.rental_end)}</b>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 8px; border-top: 1px dashed var(--border);">
            <strong style="font-size: 15px; color: var(--success);">${formatVND(item.total_amount)}</strong>
          </div>
        </div>
      `;
    }).join('');
  }
}
