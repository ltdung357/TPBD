const { getPool } = require('../db');

async function testRentalFlow() {
  const pool = getPool();
  
  // 1. Create order without rental_end
  const orderCode = 'HDT-TEST-' + Math.floor(Math.random() * 1000);
  const insertRes = await pool.query(
    `INSERT INTO rental_orders (
      order_code, customer_name, customer_phone, rental_start, rental_end,
      total_amount, deposit_amount, status, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'RENTED', 'Test') RETURNING *`,
    [orderCode, 'Khách Hàng Test', '0999888777', '2026-09-13', null, 200000, 500000]
  );

  console.log('✅ Created rental order without return date:');
  console.log('Order ID:', insertRes.rows[0].id);
  console.log('Order Code:', insertRes.rows[0].order_code);
  console.log('Rental End Date:', insertRes.rows[0].rental_end);

  // 2. Update rental_end later
  const orderId = insertRes.rows[0].id;
  const updateRes = await pool.query(
    `UPDATE rental_orders SET rental_end = $1, notes = $2 WHERE id = $3 RETURNING *`,
    ['2026-09-16', 'Đã bổ sung ngày trả đồ', orderId]
  );

  console.log('\n✅ Updated rental order with return date:');
  console.log('Updated Rental End Date:', updateRes.rows[0].rental_end);
  console.log('Notes:', updateRes.rows[0].notes);

  // 3. Clean up test order
  await pool.query('DELETE FROM rental_orders WHERE id = $1', [orderId]);
  console.log('\n✅ Test order cleaned up successfully.');
  process.exit(0);
}

testRentalFlow().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
