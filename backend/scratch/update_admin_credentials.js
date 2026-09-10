const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

async function updateAdmin() {
  const pool = new Pool({
    user: process.env.PG_USER || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    database: process.env.PG_DATABASE || 'tpbd_db',
    password: process.env.PG_PASSWORD || '1',
    port: process.env.PG_PORT || 5432,
  });

  try {
    const hashedPw = await bcrypt.hash('zzzzz', 10);
    
    // Update existing admin or insert new
    const res = await pool.query(
      `UPDATE users SET email = 'admin', password = $1 WHERE role = 'ADMIN' OR email = 'admin@tpbd.vn' RETURNING *`,
      [hashedPw]
    );

    if (res.rowCount === 0) {
      await pool.query(
        `INSERT INTO users (name, email, phone, password, role) VALUES ('Quản Trị Viên', 'admin', '0901234567', $1, 'ADMIN')`,
        [hashedPw]
      );
      console.log('✅ Created admin account: admin / zzzzz');
    } else {
      console.log('✅ Updated admin account:', res.rows[0].email, 'with new password zzzzz');
    }
  } catch (err) {
    console.error('❌ Error updating admin:', err.message);
  } finally {
    await pool.end();
  }
}

updateAdmin();
