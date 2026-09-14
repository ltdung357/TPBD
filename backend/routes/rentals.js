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

  if (!customer_name || !customer_phone || !rental_start || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin khách hàng, ngày nhận đồ và chọn ít nhất 1 sản phẩm!' });
  }

  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // Tính số ngày thuê (Nếu không nhập ngày trả thì mặc định 1 ngày)
    let daysCount = 1;
    if (rental_end) {
      const startDate = new Date(rental_start);
      const endDate = new Date(rental_end);
      const timeDiff = endDate.getTime() - startDate.getTime();
      daysCount = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
    }

    let totalAmount = 0;
    let totalDeposit = parseFloat(deposit_amount || 0);

    const itemsToInsert = [];

    // Kiểm tra thông tin sản phẩm trong kho
    for (const item of items) {
      const costumeRes = await client.query(`SELECT id, name, price_per_day, deposit_fee, available_qty FROM costumes WHERE id = $1 FOR UPDATE`, [item.costume_id]);
      if (costumeRes.rows.length === 0) {
        throw new Error(`Sản phẩm mã ID #${item.costume_id} không tồn tại!`);
      }
      const costume = costumeRes.rows[0];
      const qty = parseInt(item.qty || 1, 10);

      const itemTotal = parseFloat(costume.price_per_day) * qty;
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
    }

    const is_paid = req.body.is_paid === true || req.body.is_paid === 'true';
    const orderCode = 'HDT-' + Math.floor(100000 + Math.random() * 900000);

    // Tạo đơn hàng
    const orderRes = await client.query(
      `INSERT INTO rental_orders (
        order_code, customer_name, customer_phone, customer_email, rental_start, rental_end,
        total_amount, deposit_amount, status, notes, created_by, is_paid
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'RENTED', $9, $10, $11) RETURNING *`,
      [
        orderCode,
        customer_name,
        customer_phone,
        customer_email || '',
        rental_start,
        rental_end || null,
        totalAmount,
        totalDeposit,
        notes || '',
        req.user ? req.user.name : 'System',
        is_paid,
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

// Cập nhật thông tin đơn thuê (ví dụ bổ sung ngày trả đồ, ghi chú)
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { rental_end, notes, deposit_amount } = req.body;

  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    const currentRes = await client.query(`SELECT * FROM rental_orders WHERE id = $1 FOR UPDATE`, [id]);
    if (currentRes.rows.length === 0) {
      throw new Error('Không tìm thấy đơn thuê!');
    }

    const currentOrder = currentRes.rows[0];
    let newEnd = rental_end !== undefined ? (rental_end || null) : currentOrder.rental_end;
    let newNotes = notes !== undefined ? notes : currentOrder.notes;
    let newDeposit = deposit_amount !== undefined ? parseFloat(deposit_amount) : currentOrder.deposit_amount;

    let newTotalAmount = parseFloat(currentOrder.total_amount);

    // Nếu cập nhật ngày trả đồ, tự động tính lại số ngày thuê và tổng tiền
    if (newEnd && currentOrder.rental_start) {
      const startDate = new Date(currentOrder.rental_start);
      const endDate = new Date(newEnd);
      const timeDiff = endDate.getTime() - startDate.getTime();
      const daysCount = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));

      const itemsRes = await client.query(`SELECT * FROM rental_items WHERE rental_id = $1`, [id]);
      let calcTotal = 0;
      for (const item of itemsRes.rows) {
        const itemTotal = parseFloat(item.price_per_day) * parseInt(item.qty, 10);
        calcTotal += itemTotal;
        await client.query(
          `UPDATE rental_items SET days_count = $1, item_total = $2 WHERE id = $3`,
          [daysCount, itemTotal, item.id]
        );
      }
      newTotalAmount = calcTotal;
    }

    const updateRes = await client.query(
      `UPDATE rental_orders 
       SET rental_end = $1, notes = $2, deposit_amount = $3, total_amount = $4
       WHERE id = $5 RETURNING *`,
      [newEnd, newNotes, newDeposit, newTotalAmount, id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Cập nhật thông tin đơn thuê thành công!', order: updateRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
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

    if (status === 'RETURNED') {
      const todayStr = new Date().toISOString().split('T')[0];
      await client.query(
        `UPDATE rental_orders SET status = $1, rental_end = $2 WHERE id = $3`,
        [status, todayStr, id]
      );
    } else {
      await client.query(`UPDATE rental_orders SET status = $1 WHERE id = $2`, [status, id]);
    }

    await client.query('COMMIT');
    res.json({ message: `Cập nhật đơn hàng thành trạng thái ${status} thành công!` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
});

// Cập nhật trạng thái thanh toán (Bấm nút "Đã Trả Tiền" -> mới tính vào doanh thu)
router.put('/:id/payment', verifyToken, async (req, res) => {
  const { id } = req.params;
  const is_paid = req.body.is_paid === true || req.body.is_paid === 'true';

  try {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE rental_orders SET is_paid = $1 WHERE id = $2 RETURNING *`,
      [is_paid, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đơn thuê!' });
    }

    res.json({
      message: is_paid 
        ? 'Xác nhận đơn hàng đã thanh toán thành công! Doanh thu đã được cộng.' 
        : 'Đã hủy xác nhận thanh toán đơn thuê này.',
      order: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

module.exports = router;
