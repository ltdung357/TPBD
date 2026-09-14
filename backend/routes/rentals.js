const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { verifyToken } = require('./auth');

// Helper sync customer order count excluding DRAFT orders
async function syncCustomerOrderCount(client, phone, name, email, address) {
  if (!phone) return;
  const countRes = await client.query(
    `SELECT COUNT(*) as cnt FROM rental_orders WHERE customer_phone = $1 AND status != 'DRAFT'`,
    [phone]
  );
  const realOrdersCount = parseInt(countRes.rows[0].cnt || 0, 10);

  await client.query(
    `INSERT INTO customers (name, phone, email, address, total_orders)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (phone) DO UPDATE 
     SET total_orders = $5, 
         name = EXCLUDED.name, 
         address = CASE WHEN EXCLUDED.address != '' THEN EXCLUDED.address ELSE customers.address END`,
    [name || 'Khách Hàng', phone, email || '', address || '', realOrdersCount]
  );
}

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
    customer_address,
    rental_start,
    rental_start_time,
    rental_end,
    rental_end_time,
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

    const orderStatus = req.body.status === 'DRAFT' ? 'DRAFT' : 'RENTED';
    const is_paid = orderStatus === 'DRAFT' ? false : (req.body.is_paid === true || req.body.is_paid === 'true');
    const orderCode = 'HDT-' + Math.floor(100000 + Math.random() * 900000);

    // Tạo đơn hàng
    const orderRes = await client.query(
      `INSERT INTO rental_orders (
        order_code, customer_name, customer_phone, customer_email, customer_address, rental_start, rental_start_time, rental_end, rental_end_time,
        total_amount, deposit_amount, status, notes, created_by, is_paid
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        orderCode,
        customer_name,
        customer_phone,
        customer_email || '',
        customer_address || '',
        rental_start,
        rental_start_time || '',
        rental_end || null,
        rental_end_time || '',
        totalAmount,
        totalDeposit,
        orderStatus,
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

    // Tự động đồng bộ danh sách & số lần thuê của Khách hàng (bỏ qua đơn nháp DRAFT)
    await syncCustomerOrderCount(client, customer_phone, customer_name, customer_email, customer_address);

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

// Cập nhật toàn bộ thông tin đơn thuê / đơn nháp (sửa đơn nháp tiếp tục tạo đơn)
router.put('/:id/full', verifyToken, async (req, res) => {
  const { id } = req.params;
  const {
    customer_name,
    customer_phone,
    customer_email,
    customer_address,
    rental_start,
    rental_start_time,
    rental_end,
    rental_end_time,
    deposit_amount,
    status,
    notes,
    items,
  } = req.body;

  if (!customer_name || !customer_phone || !rental_start || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin khách hàng, ngày nhận đồ và chọn ít nhất 1 sản phẩm!' });
  }

  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    const checkRes = await client.query(`SELECT * FROM rental_orders WHERE id = $1 FOR UPDATE`, [id]);
    if (checkRes.rows.length === 0) {
      throw new Error('Không tìm thấy đơn thuê!');
    }

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

    const orderStatus = status || 'RENTED';
    const is_paid = orderStatus === 'DRAFT' ? false : (req.body.is_paid === true || req.body.is_paid === 'true');

    await client.query(`DELETE FROM rental_items WHERE rental_id = $1`, [id]);

    for (const item of itemsToInsert) {
      await client.query(
        `INSERT INTO rental_items (rental_id, costume_id, qty, price_per_day, days_count, item_total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, item.costume_id, item.qty, item.price_per_day, item.days_count, item.item_total]
      );
    }



    const orderRes = await client.query(
      `UPDATE rental_orders 
       SET customer_name = $1, customer_phone = $2, customer_email = $3, customer_address = $4, rental_start = $5, rental_start_time = $6, rental_end = $7, rental_end_time = $8,
           total_amount = $9, deposit_amount = $10, status = $11, notes = $12, is_paid = $13
       WHERE id = $14 RETURNING *`,
      [
        customer_name,
        customer_phone,
        customer_email || '',
        customer_address || '',
        rental_start,
        rental_start_time || '',
        rental_end || null,
        rental_end_time || '',
        totalAmount,
        totalDeposit,
        orderStatus,
        notes || '',
        is_paid,
        id
      ]
    );

    await syncCustomerOrderCount(client, customer_phone, customer_name, customer_email, customer_address);

    await client.query('COMMIT');
    res.json({ message: 'Cập nhật và tạo đơn thuê thành công!', order: orderRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[UPDATE RENTAL FULL ERR]', err.message);
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
});

// Xóa đơn thuê / đơn nháp
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const checkRes = await client.query(`SELECT * FROM rental_orders WHERE id = $1 FOR UPDATE`, [id]);
    if (checkRes.rows.length === 0) {
      throw new Error('Không tìm thấy đơn thuê để xóa!');
    }
    const order = checkRes.rows[0];

    await client.query(`DELETE FROM rental_items WHERE rental_id = $1`, [id]);
    await client.query(`DELETE FROM rental_orders WHERE id = $1`, [id]);
    await syncCustomerOrderCount(client, order.customer_phone, order.customer_name, order.customer_email, order.customer_address);

    await client.query('COMMIT');
    res.json({ message: 'Xóa đơn thành công!' });
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
  const { status, rental_end, rental_end_time } = req.body; // 'RETURNED', 'CANCELLED'

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
      const returnDate = rental_end || new Date().toISOString().split('T')[0];
      const returnTime = rental_end_time || '';
      let newTotalAmount = parseFloat(currentOrder.total_amount);

      if (returnDate && currentOrder.rental_start) {
        const startDate = new Date(currentOrder.rental_start);
        const endDate = new Date(returnDate);
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

      await client.query(
        `UPDATE rental_orders SET status = $1, rental_end = $2, rental_end_time = $3, total_amount = $4 WHERE id = $5`,
        [status, returnDate, returnTime, newTotalAmount, id]
      );
    } else {
      await client.query(`UPDATE rental_orders SET status = $1 WHERE id = $2`, [status, id]);
    }

    await syncCustomerOrderCount(client, currentOrder.customer_phone, currentOrder.customer_name, currentOrder.customer_email, currentOrder.customer_address);

    await client.query('COMMIT');
    res.json({ message: `Xác nhận trả đồ thành công!` });
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
