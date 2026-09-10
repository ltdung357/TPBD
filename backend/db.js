const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      user: process.env.PG_USER || 'postgres',
      host: process.env.PG_HOST || 'localhost',
      database: process.env.PG_DATABASE || 'tpbd_db',
      password: process.env.PG_PASSWORD || '1',
      port: parseInt(process.env.PG_PORT || '5432', 10),
    });
  }
  return pool;
}

async function query(text, params) {
  const p = getPool();
  return await p.query(text, params);
}

module.exports = {
  getPool,
  query,
};
