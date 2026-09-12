const { Pool } = require('pg');

const onlineUrl = 'postgresql://neondb_owner:npg_GYcke0rtPZ5n@ep-purple-field-b3dcka8a-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function check() {
  const pool = new Pool({
    connectionString: onlineUrl,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const tablesRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('Tables online:', tablesRes.rows.map(r => r.table_name));

    for (const t of tablesRes.rows) {
      const countRes = await pool.query(`SELECT COUNT(*) FROM "${t.table_name}"`);
      console.log(`Table ${t.table_name}: ${countRes.rows[0].count} rows`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

check();
