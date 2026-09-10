# 🎭 HUỚNG DẪN VẬN HÀNH & QUẢN TRỊ HỆ THỐNG TRANG PHỤC BIỂU DIỄN THÚY HÀ (TPBD)

---

## 🌐 1. THÔNG TIN TRANG WEB ONLINE & DỰ ÁN

- **Link trang web chính thức (Mọi người cùng xem)**: [https://tpbd-thuyha.onrender.com](https://tpbd-thuyha.onrender.com)
- **Thư mục nguồn trên máy tính (Local)**: `C:\xampp\htdocs\TPBD`
- **Kho lưu trữ mã nguồn GitHub**: [https://github.com/ltdung357/TPBD](https://github.com/ltdung357/TPBD)

---

## 🔐 2. THÔNG TIN ĐĂNG NHẬP CHỦ TIỆM / QUẢN LÝ (ADMIN)

- **Đường dẫn đăng nhập**: Bấm nút **"Đăng Nhập Quản Lý"** ở menu bên trái trang web (hoặc truy cập `https://tpbd-thuyha.onrender.com/login.html`).
- **Tên đăng nhập / Email**: `admin`
- **Mật khẩu**: `zzzzz`
- **Quyền hạn**: Quản trị viên (Toàn quyền Thêm, Chỉnh Sửa, Xóa mẫu trang phục/đạo cụ, Tạo Đơn Thuê, Xem Doanh Thu & Danh Sách Khách Hàng).

---

## 🛢️ 3. CƠ SỞ DỮ LIỆU & MÁY CHỦ ONLINE (MIỄN PHÍ VĨNH VIỄN 100%)

### 🔹 Cơ sở dữ liệu (PostgreSQL Database):
- **Đơn vị cung cấp**: **Neon.tech** *(Miễn phí vĩnh viễn 100%)*
- **Tài khoản quản lý DB**: Đăng nhập bằng GitHub `ltdung357` tại [neon.tech](https://neon.tech)
- **Chuỗi kết nối (Connection String)**:
  `postgresql://neondb_owner:npg_GYcke0rtPZ5n@ep-purple-field-b3dcka8a-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`

### 🔹 Máy chủ Web App:
- **Đơn vị cung cấp**: **Render.com** *(Miễn phí vĩnh viễn 100%)*
- **Tài khoản quản lý Máy chủ**: Đăng nhập bằng GitHub `ltdung357` tại [dashboard.render.com](https://dashboard.render.com)
- **Tên Web Service**: `tpbd-thuyha`

---

## ✨ 4. CÁC TÍNH NĂNG NỔI BẬT CỦA HỆ THỐNG

1. **Giao diện Khách Xem Hàng (Guest Mode)**:
   - Khách vào web xem ngay danh mục **Trang Phục & Đạo Cụ** mà không bị bắt đăng nhập.
   - Bấm vào từng trang phục xem được **Thư viện ảnh**, số lượng sẵn có, giá thuê/ngày, giá cọc và nút bấm gọi/Zalo trực tiếp tới tiệm.
2. **Bộ Lọc Thông Minh**:
   - Lọc theo danh mục: *Áo Dài Biểu Diễn, Trang Phục Dân Tộc, Cổ Trang & Vương Triều, Hiện Đại & Flashmob, Đạo Cụ Sân Khấu*.
   - Lọc theo Kích thước: *Free size, S, M, L, XL, XXL, và các size số (Size 1 đến Size 12)*.
3. **Thư Viện Ảnh & Chọn Ảnh Đại Diện**:
   - Cho phép chụp hoặc chọn nhiều ảnh từ điện thoại cùng lúc.
   - Cho phép chọn 1 ảnh bất kỳ làm **Ảnh Đại Diện** hiển thị ngoài danh mục.
4. **Xóa Sản Phẩm Đơn Giản & An Toàn**:
   - Nút **"Xóa Mẫu"** nằm trực tiếp bên trong Hộp thoại **Chỉnh Sửa** sản phẩm.
5. **Quản Lý Đơn Thuê & Doanh Thu**:
   - Tự động trừ số lượng sẵn có trong kho khi cho thuê và hồi phục lại kho khi khách trả đồ.
   - Thống kê chi tiết Tổng Doanh Thu, Các đơn đang chạy và cảnh báo đơn sắp đến hạn trả.

---

## 🛠️ 5. HƯỚNG DẪN CẬP NHẬT CODE KHI NÂNG CẤP TRANG WEB (GIT)

Khi bạn thực hiện chỉnh sửa code dưới máy tính local `C:\xampp\htdocs\TPBD` và muốn đưa bản cập nhật lên mạng, bạn chỉ cần mở **PowerShell** và gõ 3 dòng lệnh:

```powershell
cd C:\xampp\htdocs\TPBD
git add .
git commit -m "Cap nhat trang web TPBD"
git push origin main
```

*(Sau khi `git push` thành công, Render.com sẽ tự động làm mới trang web online sau 1 phút mà bạn không cần thao tác gì thêm!)*

---

*Tài liệu được tạo tự động và lưu trữ tại `C:\xampp\htdocs\TPBD\HUONG_DAN_HE_THONG_TPBD.md`.*
