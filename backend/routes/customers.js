const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { verifyToken } = require('./auth');

// Lấy danh sách khách hàng
router.get('/', verifyToken, async (req, res) => {
  const { search } = req.query;

  try {
    const pool = getPool();
    let sql = `SELECT * FROM customers WHERE 1=1`;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1 OR organization ILIKE $1)`;
    }

    sql += ` ORDER BY total_orders DESC, id DESC`;

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Thêm/Sửa thông tin khách hàng
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

module.exports = router;
