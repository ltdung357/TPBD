const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const onlineUrl = 'postgresql://neondb_owner:npg_GYcke0rtPZ5n@ep-purple-field-b3dcka8a-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function syncOnlineToLocalStrict() {
  console.log('--------------------------------------------------------');
  console.log('⚡ [1/3] KẾT NỐI DATABASE ONLINE (NEON CLOUD)...');
  const onlinePool = new Pool({
    connectionString: onlineUrl,
    ssl: { rejectUnauthorized: false }
  });

  console.log('⚡ [2/3] KẾT NỐI DATABASE LOCAL (POSTGRESQL tpbd_db)...');
  const localPool = new Pool({
    user: process.env.PG_USER || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    database: process.env.PG_DATABASE || 'tpbd_db',
    password: process.env.PG_PASSWORD || '1',
    port: parseInt(process.env.PG_PORT || '5432', 10),
  });

  try {
    console.log('--------------------------------------------------------');
    console.log('🧹 [3/3] ĐANG XÓA DỮ LIỆU CŨ VÀ TẢI DỮ LIỆU TỪ ONLINE VỀ LOCAL...');

    // Làm sạch dữ liệu local trước khi tải dữ liệu online về
    await localPool.query(`
      TRUNCATE TABLE rental_items, rental_orders, customers, costumes, costume_categories, users CASCADE;
    `);

    // 1. Sync users
    const usersRes = await onlinePool.query('SELECT * FROM users ORDER BY id ASC');
    for (const u of usersRes.rows) {
      await localPool.query(
        `INSERT INTO users (id, name, email, phone, password, role, avatar, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [u.id, u.name, u.email, u.phone, u.password, u.role, u.avatar, u.is_active, u.created_at]
      );
    }
    console.log(`  ✅ Đã đồng bộ ${usersRes.rows.length} tài khoản người dùng.`);

    // 2. Sync costume_categories
    const catsRes = await onlinePool.query('SELECT * FROM costume_categories ORDER BY id ASC');
    for (const cat of catsRes.rows) {
      await localPool.query(
        `INSERT INTO costume_categories (id, name, type, description, created_at) VALUES ($1, $2, $3, $4, $5)`,
        [cat.id, cat.name, cat.type, cat.description, cat.created_at]
      );
    }
    console.log(`  ✅ Đã đồng bộ ${catsRes.rows.length} danh mục trang phục.`);

    // 3. Sync costumes
    const costumesRes = await onlinePool.query('SELECT * FROM costumes ORDER BY id ASC');
    for (const c of costumesRes.rows) {
      await localPool.query(`
        INSERT INTO costumes (
          id, category_id, name, code, type, gender, size, total_qty, available_qty,
          price_per_day, deposit_fee, status, image_url, images, description, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `, [
        c.id, c.category_id, c.name, c.code, c.type, c.gender, c.size,
        c.total_qty, c.available_qty, c.price_per_day, c.deposit_fee,
        c.status, c.image_url, typeof c.images === 'string' ? c.images : JSON.stringify(c.images || []), c.description, c.created_at
      ]);
    }
    console.log(`  ✅ Đã đồng bộ ${costumesRes.rows.length} sản phẩm trang phục / đạo cụ.`);

    // 4. Sync customers
    const custRes = await onlinePool.query('SELECT * FROM customers ORDER BY id ASC');
    for (const cust of custRes.rows) {
      await localPool.query(`
        INSERT INTO customers (id, name, phone, email, organization, address, total_orders, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [cust.id, cust.name, cust.phone, cust.email, cust.organization, cust.address, cust.total_orders, cust.created_at]);
    }
    console.log(`  ✅ Đã đồng bộ ${custRes.rows.length} thông tin khách hàng.`);

    // 5. Sync rental_orders
    const ordersRes = await onlinePool.query('SELECT * FROM rental_orders ORDER BY id ASC');
    for (const o of ordersRes.rows) {
      await localPool.query(`
        INSERT INTO rental_orders (
          id, order_code, customer_name, customer_phone, customer_email,
          rental_start, rental_end, total_amount, deposit_amount, status, notes, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        o.id, o.order_code, o.customer_name, o.customer_phone, o.customer_email,
        o.rental_start, o.rental_end, o.total_amount, o.deposit_amount, o.status,
        o.notes, o.created_by, o.created_at
      ]);
    }
    console.log(`  ✅ Đã đồng bộ ${ordersRes.rows.length} đơn cho thuê.`);

    // 6. Sync rental_items
    const itemsRes = await onlinePool.query('SELECT * FROM rental_items ORDER BY id ASC');
    for (const item of itemsRes.rows) {
      await localPool.query(`
        INSERT INTO rental_items (id, rental_id, costume_id, qty, price_per_day, days_count, item_total)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [item.id, item.rental_id, item.costume_id, item.qty, item.price_per_day, item.days_count, item.item_total]);
    }
    console.log(`  ✅ Đã đồng bộ ${itemsRes.rows.length} chi tiết đơn cho thuê.`);

    // Reset sequences
    await localPool.query(`
      SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
      SELECT setval('costume_categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM costume_categories));
      SELECT setval('costumes_id_seq', (SELECT COALESCE(MAX(id), 1) FROM costumes));
      SELECT setval('customers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM customers));
      SELECT setval('rental_orders_id_seq', (SELECT COALESCE(MAX(id), 1) FROM rental_orders));
      SELECT setval('rental_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM rental_items));
    `);

    console.log('--------------------------------------------------------');
    console.log('🎉 HOÀN TẤT CHÍNH XÁC 100% ĐỒNG BỘ DATABASE ONLINE VỀ LOCALHOST!');
    console.log('--------------------------------------------------------');
  } catch (err) {
    console.error('❌ Lỗi đồng bộ Database:', err.message);
  } finally {
    await onlinePool.end();
    await localPool.end();
  }
}

syncOnlineToLocalStrict();
