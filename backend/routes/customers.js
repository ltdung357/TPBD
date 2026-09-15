const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { verifyToken } = require('./auth');

// Lấy danh sách khách hàng
router.get('/', verifyToken, async (req, res) => {
  const { search } = req.query;

  try {
    const pool = getPool();
    let sql = `
      SELECT c.id, c.name, c.phone, c.email, c.organization, c.address, c.created_at,
        COALESCE(
          (SELECT COUNT(*) FROM rental_orders r WHERE r.customer_phone = c.phone AND r.status != 'DRAFT'), 0
        ) as total_orders
      FROM customers c
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (c.name ILIKE $1 OR c.phone ILIKE $1 OR c.email ILIKE $1 OR c.organization ILIKE $1 OR c.address ILIKE $1)`;
    }

    sql += ` ORDER BY total_orders DESC, c.id DESC`;

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Lấy chi tiết 1 khách hàng
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const result = await pool.query(`SELECT * FROM customers WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin khách hàng!' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Thêm thông tin khách hàng mới
router.post('/', verifyToken, async (req, res) => {
  const { name, phone, email, organization, address } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ message: 'Vui lòng nhập Tên và Số điện thoại khách hàng!' });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO customers (name, phone, email, organization, address)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (phone) DO UPDATE 
       SET name = EXCLUDED.name, email = EXCLUDED.email, organization = EXCLUDED.organization, address = EXCLUDED.address
       RETURNING *`,
      [name, phone, email || '', organization || '', address || '']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Cập nhật thông tin khách hàng theo ID
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, organization, address } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ message: 'Vui lòng nhập Tên và Số điện thoại khách hàng!' });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE customers
       SET name = $1, phone = $2, email = $3, organization = $4, address = $5
       WHERE id = $6 RETURNING *`,
      [name, phone, email || '', organization || '', address || '', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng cần sửa!' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Xóa khách hàng theo ID
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const result = await pool.query(`DELETE FROM customers WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng cần xóa!' });
    }
    res.json({ message: 'Đã xóa khách hàng thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

module.exports = router;
