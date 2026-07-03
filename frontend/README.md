# Astra Shop - Frontend Client

Dự án Frontend cho hệ thống cửa hàng thương mại điện tử **Astra Shop**, được xây dựng bằng **React 19**, **TypeScript** và **Vite**. Trang web mang phong cách hiện đại với thiết kế responsive, mượt mà và tối ưu trải nghiệm người dùng.

---

## 🛠️ Công nghệ sử dụng (Technology Stack)

Ứng dụng Frontend sử dụng các thư viện và giải pháp hiện đại nhất hiện nay:

*   **Core:** React 19, TypeScript, Vite (cho tốc độ khởi động và build cực nhanh).
*   **Quản lý trạng thái (State Management):**
    *   **Zustand:** Quản lý giỏ hàng tập trung (`Cart Store`) và thông tin đăng nhập (`Auth Store`).
    *   **TanStack Query (React Query v5):** Quản lý việc truy vấn dữ liệu từ API (Caching, Auto-refetching, Mutations, Query Invalidation).
*   **Biểu mẫu & Xác thực (Form & Validation):**
    *   **React Hook Form:** Quản lý trạng thái biểu mẫu tối ưu hiệu năng (nhẹ hơn và tránh render thừa).
    *   **Bean-equivalent Client Validation:** Ràng buộc nhập liệu chặt chẽ cho Email, Số điện thoại, khớp mật khẩu.
*   **Giao diện & Styling:**
    *   **Tailwind CSS v4:** Styling linh hoạt, hiện đại.
    *   **Lucide React:** Bộ icons vector cao cấp, sắc nét.
*   **Giao tiếp API:** **Axios** client (đã được cấu hình tự động đính kèm Bearer Token JWT và tự động làm mới token qua Refresh Token).

---

## ✨ Tính năng chính (Key Features)

1.  **Trang chủ (Home):** Hiển thị danh mục nổi bật, sản phẩm bán chạy nhất cùng biểu ngữ khuyến mãi.
2.  **Cửa hàng (Shop/Product List):** 
    *   Lọc sản phẩm theo danh mục, khoảng giá, thương hiệu, đánh giá trung bình.
    *   Tìm kiếm sản phẩm theo tên và sắp xếp theo ngày tạo, giá cả, chữ cái.
    *   Phân trang hiệu năng cao kết hợp Caching từ React Query.
3.  **Chi tiết sản phẩm (Product Detail):**
    *   Xem thư viện ảnh chi tiết.
    *   Xem lịch sử biến động giá của sản phẩm dưới dạng bảng trực quan.
    *   Gửi đánh giá/nhận xét (chỉ áp dụng đối với khách hàng đã mua và nhận hàng thành công).
4.  **Giỏ hàng (Cart):** Quản lý giỏ hàng trực quan thông qua Sidebar/Drawer trượt nhanh gọn, đồng bộ tức thì với cơ sở dữ liệu.
5.  **Thanh toán (Checkout):** Nhập thông tin giao hàng, tích hợp áp dụng mã giảm giá (Coupon/Voucher) và tính toán tổng tiền thanh toán ngay lập tức.
6.  **Ví Voucher (Vouchers):** Thu thập mã giảm giá đang phát hành và quản lý ví voucher cá nhân.
7.  **Đơn hàng của tôi (My Orders):** Theo dõi lịch sử mua hàng, trạng thái xử lý đơn hàng (Pending, Confirmed, Shipping, Delivered) và chức năng Hủy đơn hàng.
8.  **Hồ sơ cá nhân (Profile):** Cập nhật họ tên, số điện thoại, địa chỉ mặc định, thay đổi ảnh đại diện (Upload ảnh trực tiếp) và đổi mật khẩu tài khoản.
9.  **Bảo mật:** Quản lý phân quyền hiển thị giữa người dùng thông thường và Quản trị viên (Admin Dashboard).

---

## 📁 Cấu trúc thư mục chính (Project Structure)

```
frontend/
├── src/
│   ├── components/      # Các component dùng chung (CartDrawer, ProductCard, v.v.)
│   ├── pages/           # Các trang giao diện chính (Home, ProductDetail, Profile, v.v.)
│   ├── services/        # Cấu hình Axios client kết nối API (api.ts)
│   ├── store/           # Quản lý trạng thái bằng Zustand (useCartStore, useAuthStore, v.v.)
│   ├── types/           # Định nghĩa kiểu dữ liệu TypeScript (types.ts)
│   ├── App.tsx          # Router và bố cục chính của ứng dụng SPA
│   ├── index.css        # Khởi tạo Tailwind CSS v4
│   └── main.tsx         # Điểm khởi đầu DOM và Provider của React Query
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 🚀 Hướng dẫn khởi chạy (Setup & Installation)

### Yêu cầu hệ thống
*   Đã cài đặt **Node.js** (khuyến nghị phiên bản 18 trở lên).

### Bước 1: Cài đặt thư viện phụ thuộc
Di chuyển vào thư mục `frontend` và cài đặt các package cần thiết:
```bash
cd frontend
npm install
```

### Bước 2: Khởi chạy dự án ở chế độ Development
Chạy lệnh sau để khởi động máy chủ thử nghiệm:
```bash
npm run dev
```
Giao diện sẽ hiển thị tại đường dẫn mặc định: `http://localhost:5173`.

### Bước 3: Biên dịch dự án cho production (Build)
Biên dịch mã nguồn sang thư mục `dist/` để phân phối hoặc deploy:
```bash
npm run build
```
Mã nguồn sau khi build sẽ được tự động tích hợp trực tiếp vào tài nguyên tĩnh của Spring Boot tại thư mục `src/main/resources/static/` mỗi khi bạn đóng gói dự án Java.
