const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { verifyToken } = require('./auth');

// Lấy danh sách đơn thuê
router.get('/', async (req, res) => {
  const { status, search } = req.query;

  try {
    const pool = getPool();
    let sql = `SELECT * FROM rental_orders WHERE 1=1`;
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (order_code ILIKE $${params.length} OR customer_name ILIKE $${params.length} OR customer_phone ILIKE $${params.length})`;
    }

    sql += ` ORDER BY id DESC`;

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Chi tiết đơn thuê và các sản phẩm trong đơn
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const orderRes = await pool.query(`SELECT * FROM rental_orders WHERE id = $1`, [req.params.id]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đơn thuê này!' });
    }

    const itemsRes = await pool.query(
      `SELECT ri.*, c.name as costume_name, c.code as costume_code, c.size, c.image_url
       FROM rental_items ri
       JOIN costumes c ON ri.costume_id = c.id
       WHERE ri.rental_id = $1`,
      [req.params.id]
    );

    res.json({
      order: orderRes.rows[0],
      items: itemsRes.rows,
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// Tạo đơn thuê mới (trừ kho tự động)
router.post('/', verifyToken, async (req, res) => {
  const {
    customer_name,
    customer_phone,
    customer_email,
    rental_start,
    rental_end,
    deposit_amount,
    notes,
    items, // Array of { costume_id, qty }
  } = req.body;

  if (!customer_name || !customer_phone || !rental_start || !rental_end || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin khách hàng, thời gian thuê và chọn ít nhất 1 sản phẩm!' });
  }

  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // Tính số ngày thuê
    const startDate = new Date(rental_start);
    const endDate = new Date(rental_end);
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysCount = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));

    let totalAmount = 0;
    let totalDeposit = parseFloat(deposit_amount || 0);

    const itemsToInsert = [];

    // Kiểm tra số lượng sẵn có trong kho
    for (const item of items) {
      const costumeRes = await client.query(`SELECT id, name, price_per_day, deposit_fee, available_qty FROM costumes WHERE id = $1 FOR UPDATE`, [item.costume_id]);
      if (costumeRes.rows.length === 0) {
        throw new Error(`Sản phẩm mã ID #${item.costume_id} không tồn tại!`);
      }
      const costume = costumeRes.rows[0];
      const qty = parseInt(item.qty || 1, 10);

      if (costume.available_qty < qty) {
        throw new Error(`Sản phẩm "${costume.name}" chỉ còn sẵn ${costume.available_qty} cái trong kho (yêu cầu thuê ${qty})!`);
      }

      const itemTotal = parseFloat(costume.price_per_day) * qty * daysCount;
      totalAmount += itemTotal;
      if (!deposit_amount) {
        totalDeposit += parseFloat(costume.deposit_fee || 0) * qty;
      }

      itemsToInsert.push({
        costume_id: costume.id,
        qty: qty,
        price_per_day: parseFloat(costume.price_per_day),
        days_count: daysCount,
        item_total: itemTotal,
      });

      // Trừ kho sẵn có
      await client.query(
        `UPDATE costumes SET available_qty = available_qty - $1, status = CASE WHEN available_qty - $1 <= 0 THEN 'OUT_OF_STOCK' ELSE status END WHERE id = $2`,
        [qty, costume.id]
      );
    }

    const orderCode = 'HDT-' + Math.floor(100000 + Math.random() * 900000);

    // Tạo đơn hàng
    const orderRes = await client.query(
      `INSERT INTO rental_orders (
        order_code, customer_name, customer_phone, customer_email, rental_start, rental_end,
        total_amount, deposit_amount, status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'RENTED', $9, $10) RETURNING *`,
      [
        orderCode,
        customer_name,
        customer_phone,
        customer_email || '',
        rental_start,
        rental_end,
        totalAmount,
        totalDeposit,
        notes || '',
        req.user ? req.user.name : 'System',
      ]
    );

    const orderId = orderRes.rows[0].id;

    // Chèn chi tiết các món
    for (const item of itemsToInsert) {
      await client.query(
        `INSERT INTO rental_items (rental_id, costume_id, qty, price_per_day, days_count, item_total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, item.costume_id, item.qty, item.price_per_day, item.days_count, item.item_total]
      );
    }

    // Tự động thêm/cập nhật danh sách Khách hàng
    await client.query(
      `INSERT INTO customers (name, phone, email, total_orders)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (phone) DO UPDATE 
       SET total_orders = customers.total_orders + 1, name = EXCLUDED.name`,
      [customer_name, customer_phone, customer_email || '']
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Tạo đơn thuê trang phục thành công!', order: orderRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[CREATE RENTAL ERR]', err.message);
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
});

// Cập nhật trạng thái đơn thuê (Ví dụ: Khách trả đồ -> Cộng lại kho)
router.put('/:id/status', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'RETURNED', 'OVERDUE', 'CANCELLED'

  if (!status) return res.status(400).json({ message: 'Vui lòng chọn trạng thái mới!' });

  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    const currentRes = await client.query(`SELECT * FROM rental_orders WHERE id = $1 FOR UPDATE`, [id]);
    if (currentRes.rows.length === 0) {
      throw new Error('Không tìm thấy đơn thuê!');
    }
    const currentOrder = currentRes.rows[0];

    // Nếu đơn từ RENTED/OVERDUE đổi sang RETURNED hoặc CANCELLED -> Hoàn trả số lượng trang phục vào kho
    if (['RENTED', 'OVERDUE', 'APPROVED', 'PENDING'].includes(currentOrder.status) && ['RETURNED', 'CANCELLED'].includes(status)) {
      const itemsRes = await client.query(`SELECT costume_id, qty FROM rental_items WHERE rental_id = $1`, [id]);
      for (const item of itemsRes.rows) {
        await client.query(
          `UPDATE costumes 
           SET available_qty = LEAST(total_qty, available_qty + $1),
               status = 'AVAILABLE'
           WHERE id = $2`,
          [item.qty, item.costume_id]
        );
      }
    }

    await client.query(`UPDATE rental_orders SET status = $1 WHERE id = $2`, [status, id]);

    await client.query('COMMIT');
    res.json({ message: `Cập nhật đơn hàng thành trạng thái ${status} thành công!` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
