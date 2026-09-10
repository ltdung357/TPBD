const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../db');

// Middleware xác thực Token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.query.token;

  if (!token) {
    return res.status(401).json({ message: 'Vui lòng đăng nhập để thực hiện chức năng này!' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn!' });
  }
};

// Đăng nhập
router.post('/login', async (req, res) => {
  const identifier = String(req.body.identifier || req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập email/số điện thoại và mật khẩu!' });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM users WHERE LOWER(email) = $1 OR phone = $1 LIMIT 1`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Tài khoản không tồn tại!' });
    }

    const user = result.rows[0];

    if (user.is_active === false) {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin!' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu không đúng!' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    const { password: _pw, ...safeUser } = user;
    res.json({ message: 'Đăng nhập thành công', token, user: safeUser });
  } catch (err) {
    console.error('[AUTH LOGIN ERR]', err.message);
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Đăng ký
router.post('/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const password = String(req.body.password || '');
  const role = String(req.body.role || 'CUSTOMER').toUpperCase();

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu!' });
  }

  try {
    const pool = getPool();
    const existing = await pool.query(
      `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email này đã được sử dụng!' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const insertRes = await pool.query(
      `INSERT INTO users (name, email, phone, password, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true) RETURNING id, name, email, phone, role, is_active, created_at`,
      [name, email, phone || null, hashed, ['ADMIN', 'STAFF', 'CHOREOGRAPHER', 'CUSTOMER'].includes(role) ? role : 'CUSTOMER']
    );

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công!',
      user: insertRes.rows[0],
    });
  } catch (err) {
    console.error('[AUTH REGISTER ERR]', err.message);
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Kiểm tra token & thông tin người dùng hiện tại
router.get('/check', verifyToken, async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, name, email, phone, role, avatar, is_active, created_at FROM users WHERE id = $1 LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin tài khoản!' });
    }

    res.json({ valid: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Danh sách người dùng (Admin/Staff)
router.get('/users', verifyToken, async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, name, email, phone, role, avatar, is_active, created_at FROM users ORDER BY id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Cập nhật quyền / trạng thái user
router.put('/users/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { role, is_active } = req.body;

  try {
    const pool = getPool();
    await pool.query(
      `UPDATE users SET role = COALESCE($1, role), is_active = COALESCE($2, is_active) WHERE id = $3`,
      [role, is_active, id]
    );
    res.json({ message: 'Cập nhật tài khoản thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

module.exports = { router, verifyToken };
