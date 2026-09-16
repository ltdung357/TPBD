const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const https = require('https');
const { verifyToken } = require('./auth');

const envPath = path.join(__dirname, '..', '..', '.env');

function getDeployHook() {
  if (process.env.RENDER_DEPLOY_HOOK) return process.env.RENDER_DEPLOY_HOOK;
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/RENDER_DEPLOY_HOOK=(.+)/);
    if (match) return match[1].trim();
  }
  return null;
}

// GET /api/system/deploy-status
router.get('/deploy-status', verifyToken, (req, res) => {
  const hook = getDeployHook();
  res.json({ configured: !!hook });
});

// POST /api/system/save-deploy-hook
router.post('/save-deploy-hook', verifyToken, (req, res) => {
  const { deploy_hook } = req.body;
  if (!deploy_hook || !deploy_hook.startsWith('http')) {
    return res.status(400).json({ message: 'URL Deploy Hook không hợp lệ!' });
  }

  try {
    process.env.RENDER_DEPLOY_HOOK = deploy_hook.trim();
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    if (envContent.includes('RENDER_DEPLOY_HOOK=')) {
      envContent = envContent.replace(/RENDER_DEPLOY_HOOK=.*/, `RENDER_DEPLOY_HOOK=${deploy_hook.trim()}`);
    } else {
      envContent += `\nRENDER_DEPLOY_HOOK=${deploy_hook.trim()}\n`;
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
    res.json({ message: 'Lưu URL Deploy Hook thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi ghi tệp .env: ' + err.message });
  }
});

// POST /api/system/trigger-deploy
router.post('/trigger-deploy', verifyToken, (req, res) => {
  const hook = getDeployHook();
  if (!hook) {
    return res.status(400).json({ 
      message: 'Chưa cấu hình URL Deploy Hook của Render!', 
      need_config: true 
    });
  }

  const clientReq = https.request(hook, { method: 'POST' }, (renderRes) => {
    let body = '';
    renderRes.on('data', chunk => body += chunk);
    renderRes.on('end', () => {
      if (renderRes.statusCode >= 200 && renderRes.statusCode < 300) {
        return res.json({ message: '🚀 Đã gửi lệnh Restart Web Online thành công! Render sẽ cập nhật trang web sau 30-60 giây.' });
      } else {
        return res.status(500).json({ message: `Lỗi từ Render (${renderRes.statusCode}): ${body}` });
      }
    });
  });

  clientReq.on('error', (err) => {
    return res.status(500).json({ message: 'Không thể kết nối tới Render: ' + err.message });
  });

  clientReq.end();
});

// ====== RECYCLE BIN & DATA RECOVERY SYSTEM (ADMIN ONLY) ======
const { getPool } = require('../db');

// GET /api/system/recycle-bin - Danh sách các mục trong thùng rác
router.get('/recycle-bin', verifyToken, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Chỉ Quản Trị Viên mới có quyền truy cập Thùng Rác!' });
  }

  try {
    const pool = getPool();
    const result = await pool.query(`SELECT * FROM recycle_bin ORDER BY id DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error('[RECYCLE BIN GET ERR]', err.message);
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// POST /api/system/recycle-bin/restore/:id - Khôi phục mục đã xóa
router.post('/recycle-bin/restore/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Chỉ Quản Trị Viên mới có quyền Khôi phục dữ liệu!' });
  }

  const { id } = req.params;

  try {
    const pool = getPool();
    const itemRes = await pool.query(`SELECT * FROM recycle_bin WHERE id = $1`, [id]);
    if (itemRes.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy mục dữ liệu trong Thùng Rác!' });
    }

    const item = itemRes.rows[0];
    const data = typeof item.item_data === 'string' ? JSON.parse(item.item_data) : item.item_data;

    if (item.item_type === 'COSTUME') {
      // Khôi phục mẫu trang phục / đạo cụ
      await pool.query(
        `INSERT INTO costumes (id, category_id, name, code, type, gender, size, total_qty, available_qty, price_per_day, deposit_fee, status, image_url, images, size_quantities, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           available_qty = EXCLUDED.available_qty,
           status = EXCLUDED.status`,
        [
          data.id, data.category_id || 1, data.name, data.code || `COS-${Date.now()}`,
          data.type || 'COSTUME', data.gender || 'UNISEX', data.size || 'FREE',
          data.total_qty || 1, data.available_qty || 1, data.price_per_day || 0,
          data.deposit_fee || 0, data.status || 'AVAILABLE', data.image_url || null,
          JSON.stringify(data.images || []), JSON.stringify(data.size_quantities || []), data.description || null
        ]
      );
      await pool.query(`SELECT setval('costumes_id_seq', (SELECT GREATEST(MAX(id), 1) FROM costumes))`);
    } else if (item.item_type === 'RENTAL') {
      // Khôi phục đơn thuê & danh sách món đồ
      const order = data.order || data;
      const items = data.items || [];

      await pool.query(
        `INSERT INTO rental_orders (id, order_code, customer_name, customer_phone, customer_email, rental_start, rental_end, total_amount, deposit_amount, status, notes, created_by, is_paid, customer_address, rental_start_time, rental_end_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
        [
          order.id, order.order_code, order.customer_name, order.customer_phone, order.customer_email || null,
          order.rental_start, order.rental_end || null, order.total_amount || 0, order.deposit_amount || 0,
          order.status || 'RENTED', order.notes || null, order.created_by || 'Admin',
          order.is_paid || false, order.customer_address || null, order.rental_start_time || null, order.rental_end_time || null
        ]
      );
      await pool.query(`SELECT setval('rental_orders_id_seq', (SELECT GREATEST(MAX(id), 1) FROM rental_orders))`);

      if (items && items.length > 0) {
        for (const it of items) {
          await pool.query(
            `INSERT INTO rental_items (rental_id, costume_id, qty, price_per_day, days_count, item_total)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [order.id, it.costume_id, it.qty || 1, it.price_per_day || 0, it.days_count || 1, it.item_total || 0]
          );
        }
      }
    } else if (item.item_type === 'CUSTOMER') {
      // Khôi phục khách hàng
      await pool.query(
        `INSERT INTO customers (id, name, phone, email, organization, address, total_orders)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone`,
        [
          data.id, data.name, data.phone, data.email || null,
          data.organization || null, data.address || null, data.total_orders || 0
        ]
      );
      await pool.query(`SELECT setval('customers_id_seq', (SELECT GREATEST(MAX(id), 1) FROM customers))`);
    } else if (item.item_type === 'USER') {
      // Khôi phục tài khoản người dùng
      await pool.query(
        `INSERT INTO users (id, name, username, email, phone, password, role, avatar, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active`,
        [
          data.id, data.name, data.username || data.name, data.email || null,
          data.phone || null, data.password, data.role || 'CUSTOMER',
          data.avatar || null, data.is_active !== undefined ? data.is_active : true
        ]
      );
      await pool.query(`SELECT setval('users_id_seq', (SELECT GREATEST(MAX(id), 1) FROM users))`);
    }

    // Xóa khỏi bảng recycle_bin sau khi đã khôi phục thành công
    await pool.query(`DELETE FROM recycle_bin WHERE id = $1`, [id]);

    res.json({ message: `Đã khôi phục thành công dữ liệu "${item.item_title}"!` });
  } catch (err) {
    console.error('[RECYCLE BIN RESTORE ERR]', err.message);
    res.status(500).json({ message: 'Lỗi khôi phục dữ liệu: ' + err.message });
  }
});

// DELETE /api/system/recycle-bin/purge/:id - Xóa vĩnh viễn 1 mục
router.delete('/recycle-bin/purge/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Chỉ Quản Trị Viên mới có quyền xóa vĩnh viễn!' });
  }

  const { id } = req.params;
  try {
    const pool = getPool();
    await pool.query(`DELETE FROM recycle_bin WHERE id = $1`, [id]);
    res.json({ message: 'Đã xóa vĩnh viễn mục dữ liệu này!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

// DELETE /api/system/recycle-bin/purge-all - Dọn sạch toàn bộ thùng rác
router.delete('/recycle-bin/purge-all', verifyToken, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Chỉ Quản Trị Viên mới có quyền dọn sạch thùng rác!' });
  }

  try {
    const pool = getPool();
    await pool.query(`TRUNCATE TABLE recycle_bin`);
    res.json({ message: 'Đã dọn sạch toàn bộ Thùng Rác thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
  }
});

module.exports = router;
