# Mini E-Commerce System

Backend Spring Boot + MySQL, frontend static chạy cùng server Spring Boot.

## Chạy dự án

Nếu MySQL `root` không có mật khẩu:

```powershell
.\mvnw.cmd spring-boot:run
```

Nếu MySQL có mật khẩu, truyền biến môi trường trước khi chạy:

```powershell
$env:DB_PASSWORD='mat-khau-mysql-cua-ban'
.\mvnw.cmd spring-boot:run
```

Ứng dụng mở tại:

```text
http://localhost:8080
```

Tài khoản mẫu được seed khi app kết nối được MySQL:

- Admin: `admin` / `admin123`
- Customer: `customer` / `customer123`

Database mặc định là `webbanhang` trên `127.0.0.1:3306`. App tự tạo database nếu user MySQL có quyền `CREATE DATABASE`, tự tạo bảng và seed dữ liệu mẫu.

## Chức năng chính

- Đăng ký, đăng nhập, JWT, profile.
- Xem, tìm kiếm, lọc, chi tiết sản phẩm.
- Giỏ hàng, cập nhật số lượng, xóa sản phẩm.
- Áp coupon, checkout, trừ tồn kho, lịch sử đơn hàng.
- Review sản phẩm sau khi đơn được admin xác nhận.
- Admin dashboard, CRUD sản phẩm/danh mục/coupon, quản lý đơn hàng, theo dõi tồn kho thấp.
