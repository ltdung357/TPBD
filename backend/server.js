const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Client, Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const applySecurityMiddleware = require('./security');
const { router: authRouter } = require('./routes/auth');
const costumeRouter = require('./routes/costumes');
const rentalRouter = require('./routes/rentals');
const choreoRouter = require('./routes/choreography');
const customerRouter = require('./routes/customers');
const reportRouter = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5050;

// ====== CONFIG CORS & BODY PARSER ======
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ====== SECURITY MIDDLEWARE ======
applySecurityMiddleware(app);

// ====== SERVE FRONTEND STATIC FILES ======
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));
app.use('/uploads', express.static(path.join(FRONTEND_DIR, 'uploads')));

// ====== DATABASE AUTO INIT & SEED DATA ======
const initDatabase = async () => {
  const pgUser = process.env.PG_USER || 'postgres';
  const pgHost = process.env.PG_HOST || 'localhost';
  const pgPassword = process.env.PG_PASSWORD || '1';
  const pgPort = process.env.PG_PORT || 5432;
  const dbName = process.env.PG_DATABASE || 'tpbd_db';

  // 1. Kết nối postgres default DB để tạo `tpbd_db` nếu chưa có
  const client = new Client({
    user: pgUser,
    host: pgHost,
    password: pgPassword,
    port: pgPort,
    database: 'postgres',
  });

  try {
    await client.connect();
    const checkRes = await client.query('SELECT datname FROM pg_database WHERE datname = $1', [dbName]);
    if (checkRes.rowCount === 0) {
      console.log(`⚡ [PostgreSQL] Đang tự động tạo Database "${dbName}"...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ [PostgreSQL] Đã tạo thành công Database "${dbName}"`);
    }
  } catch (err) {
    console.error('⚠️ [PostgreSQL Init Check Warning]', err.message);
  } finally {
    await client.end();
  }

  // 2. Kết nối tới DB `tpbd_db`
  const pool = new Pool({
    user: pgUser,
    host: pgHost,
    database: dbName,
    password: pgPassword,
    port: pgPort,
  });

  // 3. Tạo các Bảng dữ liệu
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
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE costume_categories ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

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
      ALTER TABLE costumes ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';

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

      CREATE TABLE IF NOT EXISTS choreographers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        specialty VARCHAR(255) NOT NULL,
        bio TEXT,
        rating DECIMAL(3,2) DEFAULT 5.0,
        hourly_rate DECIMAL(12,2) DEFAULT 0,
        avatar TEXT,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS choreography_bookings (
        id SERIAL PRIMARY KEY,
        booking_code VARCHAR(100) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        organization VARCHAR(255),
        choreographer_id INTEGER REFERENCES choreographers(id) ON DELETE SET NULL,
        service_type VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        rehearsal_location TEXT,
        performer_count INTEGER DEFAULT 1,
        estimated_price DECIMAL(12,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'PENDING',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
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

    // Đảm bảo 5 danh mục mặc định ban đầu luôn tồn tại
    await pool.query(`
      INSERT INTO costume_categories (id, name, type, description, is_default) VALUES
      (1, 'Áo Dài Biểu Diễn & Cách Tân', 'COSTUME', 'Áo dài múa, áo dài hội nghị, biểu diễn văn nghệ', true),
      (2, 'Trang Phục Dân Tộc Việt Nam', 'COSTUME', 'Mèo, HMông, Tây Bắc, Thái, Chăm, Khmer, Tây Nguyên', true),
      (3, 'Trang Phục Cổ Trang & Vương Triều', 'COSTUME', 'Vua chúa, Hoàng hậu, Quan lại, Cổ phục Việt', true),
      (4, 'Trang Phục Hiện Đại & Flashmob', 'COSTUME', 'Nhạc trẻ, Hip-hop, Cheerleading, Văn nghệ công ty', true),
      (5, 'Đạo Cụ Sân Khấu & Múa', 'PROP', 'Quạt múa, Nón lá, Kiếm, Khèn, Hoa Sen, Cờ hội', true)
      ON CONFLICT (id) DO UPDATE SET is_default = true;
      SELECT setval('costume_categories_id_seq', (SELECT GREATEST(MAX(id), 5) FROM costume_categories));
    `);

    // Seed costume_types & costume_sizes nếu trống
    const typeCheck = await pool.query(`SELECT COUNT(*) FROM costume_types`);
    if (parseInt(typeCheck.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO costume_types (code, name, is_default) VALUES
        ('COSTUME', 'Trang Phục (Quần áo, váy)', true),
        ('PROP', 'Đạo Cụ (Quạt, nón, kiếm...)', true);
      `);
    }

    const sizeCheck = await pool.query(`SELECT COUNT(*) FROM costume_sizes`);
    if (parseInt(sizeCheck.rows[0].count, 10) === 0) {
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
        ('Size 12', 'Size Số', true);
      `);
    }

    // Đảm bảo XXS và XS luôn có trong costume_sizes
    await pool.query(`
      INSERT INTO costume_sizes (name, category_label, is_default)
      VALUES ('XXS', 'Size Chữ', true), ('XS', 'Size Chữ', true)
      ON CONFLICT (name) DO NOTHING;
    `);

    console.log('✅ [PostgreSQL] Các bảng dữ liệu hệ thống TPBD đã kiểm tra / khởi tạo thành công.');

    // 4. Seed dữ liệu mặc định (Admin, Categories, Costumes, Choreographers)
    const adminCheck = await pool.query(`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`);
    if (adminCheck.rows.length === 0) {
      const hashedPw = await bcrypt.hash('123456', 10);
      await pool.query(`
        INSERT INTO users (name, email, phone, password, role)
        VALUES ('Quản Trị Viên - TPBD Thúy Hà', 'admin@tpbd.vn', '0901234567', $1, 'ADMIN')
      `, [hashedPw]);
      console.log('👤 [Seed Data] Đã tạo tài khoản Admin mặc định: admin@tpbd.vn / 123456');
    }

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

      await pool.query(`
        INSERT INTO choreographers (name, phone, email, specialty, bio, rating, hourly_rate, status) VALUES
        ('Nguyễn Hoàng Nam', '0988776655', 'hoangnam.dance@gmail.com', 'Múa Dân Gian & Cổ Phục', 'Tốt nghiệp Học viện Múa Việt Nam, 10 năm kinh nghiệm dựng bài hội diễn toàn quốc', 4.9, 500000, 'ACTIVE'),
        ('Trần Minh Anh', '0912345678', 'minhanh.hiphop@gmail.com', 'Nhảy Modern Dance & Flashmob', 'Chuyên dựng tiết mục văn nghệ công ty, Gala Dinner, khai trương & lễ kỷ niệm', 4.8, 450000, 'ACTIVE'),
        ('Lê Vũ Quỳnh Trang', '0933445566', 'quynhtrang.choreography@gmail.com', 'Múa Đương Đại & Kịch Múa', 'Biên đạo nhiều giải thưởng Liên hoan Tiếng hát Sinh viên toàn quốc', 5.0, 600000, 'ACTIVE');
      `);

      console.log('🌟 [Seed Data] Đã tạo danh mục, trang phục & biên đạo mẫu ban đầu thành công!');
    }
  } catch (err) {
    console.error('❌ [PostgreSQL Init Tables Error]', err.message);
  }
};

initDatabase();

const systemRouter = require('./routes/system');

// ====== MOUNT API ROUTERS ======
app.use('/api/auth', authRouter);
app.use('/api/costumes', costumeRouter);
app.use('/api/rentals', rentalRouter);
app.use('/api/choreography', choreoRouter);
app.use('/api/customers', customerRouter);
app.use('/api/reports', reportRouter);
app.use('/api/system', systemRouter);

// Fallback HTML router
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API Endpoint không tồn tại!' });
  }
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 [TPBD Thúy Hà] Server đang chạy tại: http://localhost:${PORT}`);
});
