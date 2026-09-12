const { Pool } = require('pg');

const onlineUrl = 'postgresql://neondb_owner:npg_GYcke0rtPZ5n@ep-purple-field-b3dcka8a-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function seedOnline() {
  console.log('⚡ Đang kết nối tới Neon Database Online...');
  const pool = new Pool({
    connectionString: onlineUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📦 Đang tạo bảng costume_types & costume_sizes trên Database Online...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS costume_types (
        id SERIAL PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS costume_sizes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        category_label VARCHAR(100) DEFAULT 'Mặc định',
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('🌱 Đang nạp danh sách Phân Loại (Types) mặc định...');
    await pool.query(`
      INSERT INTO costume_types (code, name, is_default) VALUES
      ('COSTUME', 'Trang Phục (Quần áo, váy)', true),
      ('PROP', 'Đạo Cụ (Quạt, nón, kiếm...)', true)
      ON CONFLICT (code) DO UPDATE SET is_default = true;
    `);

    console.log('🌱 Đang nạp danh sách Kích Thước (Sizes) mặc định (gồm Free Size, XXS, XS, S, M, L, XL, XXL, Size 1-12)...');
    await pool.query(`
      INSERT INTO costume_sizes (name, category_label, is_default) VALUES
      ('Free Size', 'Free Size', true),
      ('XXS', 'Size Chữ', true),
      ('XS', 'Size Chữ', true),
      ('S', 'Size Chữ', true),
      ('M', 'Size Chữ', true),
      ('L', 'Size Chữ', true),
      ('XL', 'Size Chữ', true),
      ('XXL', 'Size Chữ', true),
      ('Size 1', 'Size Số', true),
      ('Size 2', 'Size Số', true),
      ('Size 3', 'Size Số', true),
      ('Size 4', 'Size Số', true),
      ('Size 5', 'Size Số', true),
      ('Size 6', 'Size Số', true),
      ('Size 7', 'Size Số', true),
      ('Size 8', 'Size Số', true),
      ('Size 9', 'Size Số', true),
      ('Size 10', 'Size Số', true),
      ('Size 11', 'Size Số', true),
      ('Size 12', 'Size Số', true)
      ON CONFLICT (name) DO UPDATE SET is_default = true;
    `);

    console.log('✅ Đã nạp thành công 100% Phân Loại & Kích Thước mặc định lên Neon Database Online!');
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  } finally {
    await pool.end();
  }
}

seedOnline();
