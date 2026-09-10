const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = 'postgresql://neondb_owner:npg_GYcke0rtPZ5n@ep-purple-field-b3dcka8a-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function seedNeon() {
  console.log('⚡ Connecting to Neon PostgreSQL...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'CUSTOMER',
        avatar TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS costume_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'COSTUME',
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS costumes (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES costume_categories(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) UNIQUE NOT NULL,
        type VARCHAR(50) DEFAULT 'COSTUME',
        gender VARCHAR(20) DEFAULT 'UNISEX',
        size VARCHAR(20) DEFAULT 'FREE',
        total_qty INTEGER DEFAULT 1,
        available_qty INTEGER DEFAULT 1,
        price_per_day DECIMAL(12,2) DEFAULT 0,
        deposit_fee DECIMAL(12,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'AVAILABLE',
        image_url TEXT,
        images JSONB DEFAULT '[]',
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rental_orders (
        id SERIAL PRIMARY KEY,
        order_code VARCHAR(100) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        customer_email VARCHAR(255),
        rental_start DATE NOT NULL,
        rental_end DATE NOT NULL,
        total_amount DECIMAL(12,2) DEFAULT 0,
        deposit_amount DECIMAL(12,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'RENTED',
        notes TEXT,
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rental_items (
        id SERIAL PRIMARY KEY,
        rental_id INTEGER REFERENCES rental_orders(id) ON DELETE CASCADE,
        costume_id INTEGER REFERENCES costumes(id) ON DELETE RESTRICT,
        qty INTEGER DEFAULT 1,
        price_per_day DECIMAL(12,2) DEFAULT 0,
        days_count INTEGER DEFAULT 1,
        item_total DECIMAL(12,2) DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255),
        organization VARCHAR(255),
        address TEXT,
        total_orders INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('✅ Tables created on Neon.');

    // Seed Admin
    const hashedPw = await bcrypt.hash('zzzzz', 10);
    await pool.query(`
      INSERT INTO users (name, email, phone, password, role)
      VALUES ('Quản Trị Viên - TPBD Thúy Hà', 'admin', '0901234567', $1, 'ADMIN')
      ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
    `, [hashedPw]);

    console.log('👤 Admin account (admin / zzzzz) ready on Neon.');

    // Seed Categories & Costumes if empty
    const catCheck = await pool.query(`SELECT COUNT(*) FROM costume_categories`);
    if (parseInt(catCheck.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO costume_categories (id, name, type, description) VALUES
        (1, 'Áo Dài Biểu Diễn & Cách Tân', 'COSTUME', 'Áo dài múa, áo dài hội nghị, biểu diễn văn nghệ'),
        (2, 'Trang Phục Dân Tộc Việt Nam', 'COSTUME', 'Mèo, HMông, Tây Bắc, Thái, Chăm, Khmer, Tây Nguyên'),
        (3, 'Trang Phục Cổ Trang & Vương Triều', 'COSTUME', 'Vua chúa, Hoàng hậu, Quan lại, Cổ phục Việt'),
        (4, 'Trang Phục Hiện Đại & Flashmob', 'COSTUME', 'Nhạc trẻ, Hip-hop, Cheerleading, Văn nghệ công ty'),
        (5, 'Đạo Cụ Sân Khấu & Múa', 'PROP', 'Quạt múa, Nón lá, Kiếm, Khèn, Hoa Sen, Cờ hội');
      `);

      await pool.query(`
        INSERT INTO costumes (category_id, name, code, type, gender, size, total_qty, available_qty, price_per_day, deposit_fee, status, description, image_url) VALUES
        (1, 'Bộ Áo Dài Múa Hoa Sen Hồng Premium', 'AD-001', 'COSTUME', 'FEMALE', 'M', 15, 15, 120000, 300000, 'AVAILABLE', 'Áo dài lụa thêu tơ sen cao cấp phục vụ tiết mục múa truyền thống', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500&auto=format&fit=crop&q=60'),
        (2, 'Bộ Trang Phục Dân Tộc HMông Hoa Đỏ', 'DT-001', 'COSTUME', 'FEMALE', 'FREE', 20, 20, 150000, 400000, 'AVAILABLE', 'Đầy đủ mũ đính xà cừ, váy xòe gấm thêu tay thổ cẩm', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500&auto=format&fit=crop&q=60'),
        (3, 'Bộ Nhật Bình Cổ Phục Huế Hoàng Cung', 'CP-001', 'COSTUME', 'FEMALE', 'L', 8, 8, 250000, 600000, 'AVAILABLE', 'Trang phục triều Nguyễn cao cấp, hoa văn thêu tinh xảo', 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=500&auto=format&fit=crop&q=60'),
        (4, 'Đội Hình Nhảy Flashmob Kim Tuyến Vàng', 'HD-001', 'COSTUME', 'UNISEX', 'FREE', 30, 30, 90000, 200000, 'AVAILABLE', 'Trang phục nhảy hiện đại nổi bật cho sự kiện công ty', 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=500&auto=format&fit=crop&q=60'),
        (5, 'Cặp Quạt Múa Lụa Dài 1m8 Màu Hồng Thắm', 'DC-001', 'PROP', 'UNISEX', 'FREE', 40, 40, 30000, 100000, 'AVAILABLE', 'Đạo cụ múa quạt lụa xòe mượt mà, khung tre dẻo', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60');
      `);

      console.log('🌟 Sample categories & costumes seeded to Neon.');
    }
  } catch (err) {
    console.error('❌ Neon Seed Error:', err.message);
  } finally {
    await pool.end();
  }
}

seedNeon();
