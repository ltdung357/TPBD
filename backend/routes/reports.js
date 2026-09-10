const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { verifyToken } = require('./auth');

// Báo cáo tổng quan Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const pool = getPool();

    // 1. Thống kê số lượng sản phẩm
    const costumesRes = await pool.query(`
      SELECT 
        COUNT(*) as total_items,
        SUM(total_qty) as total_inventory,
        SUM(available_qty) as available_inventory,
        SUM(CASE WHEN type = 'COSTUME' THEN 1 ELSE 0 END) as total_costumes,
        SUM(CASE WHEN type = 'PROP' THEN 1 ELSE 0 END) as total_props
      FROM costumes
    `);

    // 2. Thống kê đơn thuê
    const rentalsRes = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'RENTED' THEN 1 ELSE 0 END) as active_rentals,
        SUM(CASE WHEN status = 'RETURNED' THEN 1 ELSE 0 END) as completed_rentals,
        SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END) as overdue_rentals,
        COALESCE(SUM(CASE WHEN status IN ('RENTED', 'RETURNED') THEN total_amount ELSE 0 END), 0) as rental_revenue
      FROM rental_orders
    `);

    // 3. Thống kê biên đạo
    const choreoRes = await pool.query(`
      SELECT 
        COUNT(*) as total_choreographers,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_choreographers
      FROM choreographers
    `);

    const bookingsRes = await pool.query(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as active_bookings,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_bookings,
        COALESCE(SUM(CASE WHEN status IN ('IN_PROGRESS', 'COMPLETED') THEN estimated_price ELSE 0 END), 0) as choreo_revenue
      FROM choreography_bookings
    `);

    // 4. Các đơn cần chú ý (Sắp quá hạn hoặc đã quá hạn)
    const urgentRentals = await pool.query(`
      SELECT id, order_code, customer_name, customer_phone, rental_end, status, total_amount
      FROM rental_orders
      WHERE status IN ('RENTED', 'OVERDUE')
      ORDER BY rental_end ASC
      LIMIT 5
    `);

    // 5. Lịch biên đạo sắp tới
    const upcomingBookings = await pool.query(`
      SELECT cb.id, cb.booking_code, cb.customer_name, cb.service_type, cb.start_date, cb.status, c.name as choreographer_name
      FROM choreography_bookings cb
      LEFT JOIN choreographers c ON cb.choreographer_id = c.id
      WHERE cb.status IN ('PENDING', 'APPROVED', 'IN_PROGRESS')
      ORDER BY cb.start_date ASC
      LIMIT 5
    `);

    const costumeStats = costumesRes.rows[0] || {};
    const rentalStats = rentalsRes.rows[0] || {};
    const choreoStats = choreoRes.rows[0] || {};
    const bookingStats = bookingsRes.rows[0] || {};

    const totalRevenue = parseFloat(rentalStats.rental_revenue || 0) + parseFloat(bookingStats.choreo_revenue || 0);

    res.json({
      summary: {
        total_items: parseInt(costumeStats.total_items || 0, 10),
        total_inventory: parseInt(costumeStats.total_inventory || 0, 10),
        available_inventory: parseInt(costumeStats.available_inventory || 0, 10),
        active_rentals: parseInt(rentalStats.active_rentals || 0, 10),
        overdue_rentals: parseInt(rentalStats.overdue_rentals || 0, 10),
        total_choreographers: parseInt(choreoStats.total_choreographers || 0, 10),
        active_bookings: parseInt(bookingStats.active_bookings || 0, 10),
        rental_revenue: parseFloat(rentalStats.rental_revenue || 0),
        choreo_revenue: parseFloat(bookingStats.choreo_revenue || 0),
        total_revenue: totalRevenue,
      },
      urgent_rentals: urgentRentals.rows,
      upcoming_bookings: upcomingBookings.rows,
    });
  } catch (err) {
    console.error('[REPORT DASHBOARD ERR]', err.message);
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

module.exports = router;
