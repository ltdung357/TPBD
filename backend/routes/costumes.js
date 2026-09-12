const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { getPool } = require('../db');
const { verifyToken } = require('./auth');

const uploadDir = path.join(__dirname, '..', '..', 'frontend', 'uploads', 'costumes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'costume-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

// API Upload Ảnh từ Điện thoại / Thư viện (Hỗ trợ upload 1 hoặc nhiều ảnh)
router.post('/upload', verifyToken, upload.array('images', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'Vui lòng chọn hoặc chụp ít nhất 1 ảnh!' });
  }
  const imageUrls = req.files.map(f => '/uploads/costumes/' + f.filename);
  res.json({ message: 'Tải ảnh thành công!', image_urls: imageUrls, image_url: imageUrls[0] });
});

// Lấy danh mục
router.get('/categories', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM costume_categories ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Tạo danh mục mới
router.post('/categories', verifyToken, async (req, res) => {
  const { name, type, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Vui lòng nhập tên danh mục!' });

  try {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO costume_categories (name, type, description) VALUES ($1, $2, $3) RETURNING *`,
      [name, type || 'COSTUME', description || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Xóa danh mục
router.delete('/categories/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const check = await pool.query('SELECT * FROM costume_categories WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Danh mục không tồn tại!' });
    }
    if (check.rows[0].is_default || parseInt(id, 10) <= 5) {
      return res.status(400).json({ message: 'Không thể xóa danh mục mặc định của hệ thống!' });
    }

    await pool.query('UPDATE costumes SET category_id = NULL WHERE category_id = $1', [id]);
    const result = await pool.query('DELETE FROM costume_categories WHERE id = $1 RETURNING *', [id]);
    res.json({ message: 'Đã xóa danh mục thành công!', category: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// ====== QUẢN LÝ PHÂN LOẠI (TYPES) ======
router.get('/types', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM costume_types ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

router.post('/types', verifyToken, async (req, res) => {
  const { name, code } = req.body;
  if (!name) return res.status(400).json({ message: 'Vui lòng nhập tên phân loại!' });
  const typeCode = code || name.toUpperCase().replace(/[^A-Z0-9]/g, '_');

  try {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO costume_types (code, name) VALUES ($1, $2) RETURNING *`,
      [typeCode, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

router.delete('/types/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const check = await pool.query('SELECT * FROM costume_types WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Phân loại không tồn tại!' });
    if (check.rows[0].is_default) return res.status(400).json({ message: 'Không thể xóa phân loại mặc định!' });

    await pool.query('DELETE FROM costume_types WHERE id = $1', [id]);
    res.json({ message: 'Đã xóa phân loại thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

function sortCostumeSizes(sizes) {
  if (!sizes || !Array.isArray(sizes)) return [];
  const customOrder = [
    'FREE SIZE', 'FREE',
    'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL'
  ];

  return sizes.sort((a, b) => {
    const nameA = (a.name || '').trim().toUpperCase();
    const nameB = (b.name || '').trim().toUpperCase();

    const idxA = customOrder.indexOf(nameA);
    const idxB = customOrder.indexOf(nameB);

    if (idxA !== -1 && idxB !== -1) {
      return idxA - idxB;
    }
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;

    const numA = parseInt(nameA.replace(/\D/g, ''), 10);
    const numB = parseInt(nameB.replace(/\D/g, ''), 10);

    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
      return numA - numB;
    }

    return nameA.localeCompare(nameB);
  });
}

// ====== QUẢN LÝ KÍCH THƯỚC (SIZES) ======
router.get('/sizes', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM costume_sizes ORDER BY id ASC');
    const sorted = sortCostumeSizes(result.rows);
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

router.post('/sizes', verifyToken, async (req, res) => {
  const { name, category_label } = req.body;
  if (!name) return res.status(400).json({ message: 'Vui lòng nhập tên kích thước (Size)!' });

  try {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO costume_sizes (name, category_label) VALUES ($1, $2) RETURNING *`,
      [name.trim(), category_label || 'Khác']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

router.delete('/sizes/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const check = await pool.query('SELECT * FROM costume_sizes WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Kích thước không tồn tại!' });
    if (check.rows[0].is_default) return res.status(400).json({ message: 'Không thể xóa kích thước mặc định!' });

    await pool.query('DELETE FROM costume_sizes WHERE id = $1', [id]);
    res.json({ message: 'Đã xóa kích thước thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Lấy danh sách trang phục & đạo cụ (Filter / Search)
router.get('/', async (req, res) => {
  const { search, category_id, type, size, status } = req.query;

  try {
    const pool = getPool();
    let sql = `
      SELECT c.*, cat.name as category_name
      FROM costumes c
      LEFT JOIN costume_categories cat ON c.category_id = cat.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (c.name ILIKE $${params.length} OR c.code ILIKE $${params.length} OR c.description ILIKE $${params.length})`;
    }
    if (category_id) {
      params.push(category_id);
      sql += ` AND c.category_id = $${params.length}`;
    }
    if (type) {
      params.push(type);
      sql += ` AND c.type = $${params.length}`;
    }
    if (size) {
      params.push(size);
      sql += ` AND c.size = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND c.status = $${params.length}`;
    }

    sql += ` ORDER BY c.id DESC`;

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Chi tiết 1 trang phục
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT c.*, cat.name as category_name 
       FROM costumes c 
       LEFT JOIN costume_categories cat ON c.category_id = cat.id 
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy trang phục/đạo cụ này!' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Thêm sản phẩm mới (Trang phục/Đạo cụ)
router.post('/', verifyToken, async (req, res) => {
  const {
    category_id,
    name,
    code,
    type,
    gender,
    size,
    total_qty,
    price_per_day,
    deposit_fee,
    status,
    image_url,
    images,
    description,
  } = req.body;

  if (!name || !price_per_day) {
    return res.status(400).json({ message: 'Vui lòng nhập Tên sản phẩm và Giá thuê/ngày!' });
  }

  try {
    const pool = getPool();
    const generatedCode = code || 'TP-' + Math.floor(1000 + Math.random() * 9000);
    const qty = parseInt(total_qty || 1, 10);
    const imagesArr = Array.isArray(images) ? images : (typeof images === 'string' && images ? JSON.parse(images) : []);

    const result = await pool.query(
      `INSERT INTO costumes (
        category_id, name, code, type, gender, size, total_qty, available_qty,
        price_per_day, deposit_fee, status, image_url, images, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        category_id || null,
        name,
        generatedCode,
        type || 'COSTUME',
        gender || 'UNISEX',
        size || 'FREE',
        qty,
        qty,
        parseFloat(price_per_day),
        parseFloat(deposit_fee || 0),
        status || 'AVAILABLE',
        image_url || (imagesArr.length > 0 ? imagesArr[0] : null),
        JSON.stringify(imagesArr),
        description || '',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[ADD COSTUME ERR]', err.message);
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Cập nhật sản phẩm
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const {
    category_id,
    name,
    code,
    type,
    gender,
    size,
    total_qty,
    available_qty,
    price_per_day,
    deposit_fee,
    status,
    image_url,
    images,
    description,
  } = req.body;

  try {
    const pool = getPool();
    const imagesArr = images ? (Array.isArray(images) ? images : JSON.parse(images)) : null;

    const result = await pool.query(
      `UPDATE costumes SET
        category_id = COALESCE($1, category_id),
        name = COALESCE($2, name),
        code = COALESCE($3, code),
        type = COALESCE($4, type),
        gender = COALESCE($5, gender),
        size = COALESCE($6, size),
        total_qty = COALESCE($7, total_qty),
        available_qty = COALESCE($8, available_qty),
        price_per_day = COALESCE($9, price_per_day),
        deposit_fee = COALESCE($10, deposit_fee),
        status = COALESCE($11, status),
        image_url = COALESCE($12, image_url),
        images = COALESCE($13::jsonb, images),
        description = COALESCE($14, description)
       WHERE id = $15 RETURNING *`,
      [
        category_id,
        name,
        code,
        type,
        gender,
        size,
        total_qty,
        available_qty,
        price_per_day,
        deposit_fee,
        status,
        image_url,
        imagesArr ? JSON.stringify(imagesArr) : null,
        description,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy trang phục/đạo cụ cần sửa!' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Xóa sản phẩm
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const pool = getPool();
    await pool.query('DELETE FROM costumes WHERE id = $1', [req.params.id]);
    res.json({ message: 'Xóa trang phục/đạo cụ thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

module.exports = router;
