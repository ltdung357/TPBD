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

async function fix() {
  const defaultImg = 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500&auto=format&fit=crop&q=60';
  try {
    console.log('🧹 Đang làm sạch các link ảnh hỏng trên Online Database...');
    const onlineRes = await onlinePool.query('SELECT id, name, image_url, images FROM costumes');
    for (const c of onlineRes.rows) {
      let cover = c.image_url;
      let imgs = Array.isArray(c.images) ? c.images : [];
      if (typeof c.images === 'string') {
        try { imgs = JSON.parse(c.images); } catch(e) { imgs = []; }
      }

      // Filter out non-base64 /uploads/costumes/ paths that don't exist on disk
      imgs = imgs.filter(url => typeof url === 'string' && (url.startsWith('http') || url.startsWith('data:image')));
      if (!cover || (!cover.startsWith('http') && !cover.startsWith('data:image'))) {
        cover = imgs.length > 0 ? imgs[0] : defaultImg;
      }
      if (imgs.length === 0) {
        imgs = [cover];
      }

      await onlinePool.query(
        'UPDATE costumes SET image_url = $1, images = $2 WHERE id = $3',
        [cover, JSON.stringify(imgs), c.id]
      );
    }
    console.log('✅ Đã dọn dẹp link ảnh hỏng trên Online Database thành công!');

    console.log('🧹 Đang làm sạch các link ảnh hỏng trên Local Database...');
    const localRes = await localPool.query('SELECT id, name, image_url, images FROM costumes');
    for (const c of localRes.rows) {
      let cover = c.image_url;
      let imgs = Array.isArray(c.images) ? c.images : [];
      if (typeof c.images === 'string') {
        try { imgs = JSON.parse(c.images); } catch(e) { imgs = []; }
      }

      imgs = imgs.filter(url => typeof url === 'string' && (url.startsWith('http') || url.startsWith('data:image')));
      if (!cover || (!cover.startsWith('http') && !cover.startsWith('data:image'))) {
        cover = imgs.length > 0 ? imgs[0] : defaultImg;
      }
      if (imgs.length === 0) {
        imgs = [cover];
      }

      await localPool.query(
        'UPDATE costumes SET image_url = $1, images = $2 WHERE id = $3',
        [cover, JSON.stringify(imgs), c.id]
      );
    }
    console.log('✅ Đã dọn dẹp link ảnh hỏng trên Local Database thành công!');

  } catch (err) {
    console.error('❌ Lỗi:', err);
  } finally {
    await localPool.end();
    await onlinePool.end();
  }
}

fix();
