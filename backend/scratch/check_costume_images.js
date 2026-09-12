const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const localPool = new Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'tpbd_db',
  password: process.env.PG_PASSWORD || '1',
  port: parseInt(process.env.PG_PORT || '5432', 10),
});

const onlineUrl = 'postgresql://neondb_owner:npg_GYcke0rtPZ5n@ep-purple-field-b3dcka8a-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const onlinePool = new Pool({ connectionString: onlineUrl, ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    console.log('--- LOCAL COSTUMES ---');
    const localRes = await localPool.query('SELECT id, name, image_url, images FROM costumes');
    console.log(JSON.stringify(localRes.rows, null, 2));

    console.log('--- ONLINE COSTUMES ---');
    const onlineRes = await onlinePool.query('SELECT id, name, image_url, images FROM costumes');
    console.log(JSON.stringify(onlineRes.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await localPool.end();
    await onlinePool.end();
  }
}

check();
