// ====== DASHBOARD & REPORTS MODULE ======

async function loadDashboardStats() {
  try {
    const res = await fetch('/api/reports/dashboard');
    const data = await res.json();

    const { summary, urgent_rentals } = data;

    // Update Stat Cards
    if (document.getElementById('stat-total-items')) {
      document.getElementById('stat-total-items').innerText = summary.total_items || 0;
    }
    if (document.getElementById('stat-available-inventory')) {
      document.getElementById('stat-available-inventory').innerText = summary.available_inventory || 0;
    }
    if (document.getElementById('stat-active-rentals')) {
      document.getElementById('stat-active-rentals').innerText = summary.active_rentals || 0;
    }
    if (document.getElementById('stat-total-revenue')) {
      document.getElementById('stat-total-revenue').innerText = formatVND(summary.rental_revenue || 0);
    }

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
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Không có đơn thuê nào đang chạy.</td></tr>`;
    if (cardsContainer) cardsContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border);">Không có đơn thuê nào đang chạy.</div>`;
    return;
  }

  if (tbody) {
    tbody.innerHTML = items.map(item => {
      const startDateStr = formatDateTime(item.rental_start || item.created_at, item.rental_start_time);
      return `
        <tr onclick="openOrderDetailModal(${item.id})" style="cursor: pointer;">
          <td><strong style="color: var(--primary);">${item.order_code}</strong></td>
          <td>${item.customer_name}</td>
          <td>${item.customer_phone}</td>
          <td>${startDateStr}</td>
          <td><strong style="color: var(--success);">${formatVND(item.total_amount)}</strong></td>
          <td>${getRentalStatusBadge(item.status)}</td>
        </tr>
      `;
    }).join('');
  }

  if (cardsContainer) {
    cardsContainer.innerHTML = items.map(item => {
      const isReturned = item.status === 'RETURNED';
      const isPaid = !!item.is_paid;
      const borderClass = (isReturned && isPaid) ? 'rental-card-returned' : 'rental-card-unreturned';

      const startDateStr = formatDateTime(item.rental_start || item.created_at, item.rental_start_time);
      const endDateStr = item.rental_end ? formatDateTime(item.rental_end, item.rental_end_time) : '';

      return `
        <div class="rental-card-mobile ${borderClass}" onclick="openOrderDetailModal(${item.id})" style="cursor: pointer;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
            <strong style="font-size: 15px; color: var(--primary);">${item.order_code}</strong>
            ${getRentalStatusBadge(item.status)}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 6px;">
            <span style="color: var(--text-muted);">Khách hàng:</span>
            <strong>${item.customer_name} (${item.customer_phone})</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 4px;">
            <span style="color: var(--text-muted);">Ngày thuê:</span>
            <b>${startDateStr}</b>
          </div>
          ${endDateStr ? `
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 4px;">
              <span style="color: var(--text-muted);">Ngày trả đồ:</span>
              <b style="color: var(--success);">${endDateStr}</b>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding-top: 8px; border-top: 1px dashed var(--border);">
            <strong style="font-size: 15px; color: var(--success);">${formatVND(item.total_amount)}</strong>
          </div>
        </div>
      `;
    }).join('');
  }
}
