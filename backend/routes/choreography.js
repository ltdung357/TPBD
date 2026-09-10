const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { verifyToken } = require('./auth');

// Lấy danh sách Biên đạo viên (Choreographers)
router.get('/choreographers', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM choreographers ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Thêm Biên đạo viên mới
router.post('/choreographers', verifyToken, async (req, res) => {
  const { name, phone, email, specialty, bio, rating, hourly_rate, avatar, status } = req.body;

  if (!name || !phone || !specialty) {
    return res.status(400).json({ message: 'Vui lòng nhập Tên, Số điện thoại và Thể loại sở trường!' });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO choreographers (
        name, phone, email, specialty, bio, rating, hourly_rate, avatar, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        name,
        phone,
        email || '',
        specialty,
        bio || '',
        parseFloat(rating || 5.0),
        parseFloat(hourly_rate || 0),
        avatar || null,
        status || 'ACTIVE',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Cập nhật Biên đạo viên
router.put('/choreographers/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, specialty, bio, rating, hourly_rate, avatar, status } = req.body;

  try {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE choreographers SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        email = COALESCE($3, email),
        specialty = COALESCE($4, specialty),
        bio = COALESCE($5, bio),
        rating = COALESCE($6, rating),
        hourly_rate = COALESCE($7, hourly_rate),
        avatar = COALESCE($8, avatar),
        status = COALESCE($9, status)
       WHERE id = $10 RETURNING *`,
      [name, phone, email, specialty, bio, rating, hourly_rate, avatar, status, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Lấy danh sách Book Biên đạo (Bookings)
router.get('/bookings', async (req, res) => {
  const { status, search } = req.query;

  try {
    const pool = getPool();
    let sql = `
      SELECT cb.*, c.name as choreographer_name, c.phone as choreographer_phone, c.specialty
      FROM choreography_bookings cb
      LEFT JOIN choreographers c ON cb.choreographer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND cb.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (cb.booking_code ILIKE $${params.length} OR cb.customer_name ILIKE $${params.length} OR cb.organization ILIKE $${params.length} OR cb.service_type ILIKE $${params.length})`;
    }

    sql += ` ORDER BY cb.id DESC`;

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Đặt lịch Biên đạo múa/nhảy mới
router.post('/bookings', async (req, res) => {
  const {
    customer_name,
    customer_phone,
    organization,
    choreographer_id,
    service_type,
    start_date,
    end_date,
    rehearsal_location,
    performer_count,
    estimated_price,
    notes,
  } = req.body;

  if (!customer_name || !customer_phone || !service_type || !start_date) {
    return res.status(400).json({ message: 'Vui lòng điền Tên khách hàng, Số điện thoại, Dịch vụ biên đạo và Ngày bắt đầu tập!' });
  }

  try {
    const pool = getPool();
    const bookingCode = 'BĐ-' + Math.floor(100000 + Math.random() * 900000);

    const result = await pool.query(
      `INSERT INTO choreography_bookings (
        booking_code, customer_name, customer_phone, organization, choreographer_id,
        service_type, start_date, end_date, rehearsal_location, performer_count,
        estimated_price, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', $12) RETURNING *`,
      [
        bookingCode,
        customer_name,
        customer_phone,
        organization || '',
        choreographer_id || null,
        service_type,
        start_date,
        end_date || null,
        rehearsal_location || '',
        parseInt(performer_count || 1, 10),
        parseFloat(estimated_price || 0),
        notes || '',
      ]
    );

    // Lưu vào Khách hàng
    await pool.query(
      `INSERT INTO customers (name, phone, organization, total_orders)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (phone) DO UPDATE 
       SET total_orders = customers.total_orders + 1, name = EXCLUDED.name`,
      [customer_name, customer_phone, organization || '']
    );

    res.status(201).json({
      message: 'Gửi yêu cầu book biên đạo thành công! Ban quản lý sẽ liên hệ xác nhận trong thời gian sớm nhất.',
      booking: result.rows[0],
    });
  } catch (err) {
    console.error('[CREATE BOOKING ERR]', err.message);
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Cập nhật trạng thái hợp đồng/lịch biên đạo
router.put('/bookings/:id/status', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { status, choreographer_id, estimated_price } = req.body;

  try {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE choreography_bookings SET
        status = COALESCE($1, status),
        choreographer_id = COALESCE($2, choreographer_id),
        estimated_price = COALESCE($3, estimated_price)
       WHERE id = $4 RETURNING *`,
      [status, choreographer_id, estimated_price, id]
    );

    res.json({ message: 'Cập nhật lịch biên đạo thành công!', booking: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

module.exports = router;
