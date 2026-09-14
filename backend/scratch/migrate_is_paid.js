const { getPool } = require('../db');

async function migrateOnline() {
  try {
    const pool = getPool();
    console.log('⚡ Running database migrations...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rental_orders (
        id SERIAL PRIMARY KEY,
        order_code VARCHAR(100) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        customer_email VARCHAR(255),
        rental_start DATE NOT NULL,
        rental_end DATE,
        total_amount DECIMAL(12,2) DEFAULT 0,
        deposit_amount DECIMAL(12,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'RENTED',
        notes TEXT,
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE rental_orders ALTER COLUMN rental_end DROP NOT NULL;
      ALTER TABLE rental_orders ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
    `);

    console.log('✅ Migration successful! Column is_paid ensured on rental_orders.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
}

migrateOnline();
