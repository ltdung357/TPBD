const { getPool } = require('../db');

async function testPaymentFlow() {
  const pool = getPool();
  
  // 1. Check revenue before
  const resBefore = await pool.query(`
    SELECT COALESCE(SUM(CASE WHEN is_paid = true THEN total_amount ELSE 0 END), 0) as paid_revenue
    FROM rental_orders
  `);
  console.log('Revenue before paid orders test:', resBefore.rows[0].paid_revenue);

  // 2. Insert unpaid order
  const insertRes = await pool.query(`
    INSERT INTO rental_orders (
      order_code, customer_name, customer_phone, rental_start, total_amount, status, is_paid
    ) VALUES ($1, $2, $3, $4, $5, 'RENTED', false) RETURNING *`,
    ['HDT-PAY-TEST', 'Khách Hàng Test Thanh Toán', '0911223344', '2026-09-13', 500000]
  );
  const orderId = insertRes.rows[0].id;
  console.log('✅ Created unpaid order HDT-PAY-TEST, is_paid =', insertRes.rows[0].is_paid);

  // 3. Check revenue again (should remain unchanged)
  const resMid = await pool.query(`
    SELECT COALESCE(SUM(CASE WHEN is_paid = true THEN total_amount ELSE 0 END), 0) as paid_revenue
    FROM rental_orders
  `);
  console.log('Revenue after adding unpaid order (should not increase):', resMid.rows[0].paid_revenue);

  // 4. Update order to is_paid = true
  const payRes = await pool.query(`
    UPDATE rental_orders SET is_paid = true WHERE id = $1 RETURNING *`,
    [orderId]
  );
  console.log('✅ Clicked "Đã Trả Tiền", is_paid =', payRes.rows[0].is_paid);

  // 5. Check revenue again (should now include 500000)
  const resAfter = await pool.query(`
    SELECT COALESCE(SUM(CASE WHEN is_paid = true THEN total_amount ELSE 0 END), 0) as paid_revenue
    FROM rental_orders
  `);
  console.log('Revenue after clicking "Đã Trả Tiền" (increased):', resAfter.rows[0].paid_revenue);

  // Clean up
  await pool.query('DELETE FROM rental_orders WHERE id = $1', [orderId]);
  console.log('✅ Cleaned up test order.');
  process.exit(0);
}

testPaymentFlow().catch(err => {
  console.error(err);
  process.exit(1);
});
