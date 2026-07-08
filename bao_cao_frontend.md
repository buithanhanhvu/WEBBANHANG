# BÁO CÁO THIẾT KẾ & TÍCH HỢP FRONTEND - HỆ THỐNG THƯƠNG MẠI ĐIỆN TỬ ASTRASHOP

Tài liệu này tổng hợp và giải thích chi tiết cách hệ thống Frontend (React 18/19 + TypeScript + TailwindCSS) của dự án **AstraShop** đáp ứng đầy đủ và chuẩn xác các yêu cầu học thuật và tiêu chí đánh giá của đề tài.

---

## 1. Công Nghệ Và Kiến Trúc Frontend (Tech Stack & Architecture)

Ứng dụng Frontend được thiết kế theo cấu trúc thư mục dạng **Component-Driven Architecture** chuẩn mực, sử dụng các công nghệ hiện đại nhất:

* **React 18 + TypeScript:** Tăng cường độ an toàn của code (Type-safe), quản lý vòng đời component hiệu quả.
* **Vite:** Công cụ build siêu tốc giúp tăng tốc độ phát triển (HMR) và đóng gói mã nguồn tối ưu.
* **TailwindCSS (v4):** Xây dựng giao diện Responsive, hiện đại, hỗ trợ hiệu ứng mượt mà và giao diện tối (Dark mode) sang trọng.
* **React Router v6:** Quản lý định tuyến trang, phân chia rõ ràng các Route công khai (Public Routes), Route bảo mật (Private Routes) và Route dành riêng cho Admin.
* **React Query (TanStack Query v5):** Quản lý bộ đệm (Caching) dữ liệu đồng bộ từ server, tự động gọi lại dữ liệu khi mất kết nối hoặc chuyển trang.
* **Axios:** Cấu hình Client gọi API, tự động gắn JWT Access Token vào tiêu đề Authorization và tự động xử lý Refresh Token khi token hết hạn.
* **React Hook Form + Yup/Zod:** Xử lý và Validation toàn bộ biểu mẫu (Form đăng ký, đăng nhập, thanh toán).

---

## 2. Quản Lý Trạng Thái Toàn Cục (Zustand State Management)

Theo yêu cầu, ứng dụng quản lý trạng thái giỏ hàng và xác thực bằng **Zustand** - thư viện gọn nhẹ và tối ưu hơn Redux rất nhiều:

### A. Quản lý Giỏ hàng (`useCartStore.ts`)
* Lưu trữ danh sách sản phẩm trong giỏ hàng (`cartItems`).
* Đồng bộ trực tiếp số lượng và sản phẩm với Backend qua API `/api/cart`.
* Cung cấp các hàm: `addToCart()`, `updateQuantity()`, `removeItem()`, `clearCart()`, và áp dụng mã giảm giá `applyCoupon()`.
* Sử dụng cơ chế cập nhật lạc quan (Optimistic Update) giúp giao diện thay đổi tức thì, nâng cao UX.

### B. Quản lý Xác thực (`useAuthStore.ts`)
* Lưu trữ thông tin người dùng đăng nhập (`user`) và các mã token (`accessToken`, `refreshToken`).
* Cung cấp hàm `login()`, `logout()` và `updateProfile()`.
* Tự động lưu trạng thái đăng nhập vào `localStorage` để duy trì phiên làm việc khi reload trang.

---

## 3. Hiện Thực Các Component Yêu Cầu

Các component cốt lõi được xây dựng chuẩn UX/UI và đặt tại thư mục `frontend/src/components/`:

1. **`ProductCard.tsx` (Thẻ sản phẩm):**
   * Hiển thị ảnh sản phẩm rõ nét, tên thương hiệu, tên sản phẩm.
   * Badge giảm giá (%) nổi bật ở góc ảnh.
   * Nút **"Thêm nhanh" (Quick Add)** giúp người dùng mua hàng trực tiếp mà không cần vào trang chi tiết.
2. **`FilterSidebar.tsx` (Thanh bộ lọc):**
   * Lọc theo Danh mục sản phẩm (Category).
   * Lọc theo Khoảng giá sử dụng thanh trượt kéo (Price Range Slider).
   * Lọc theo Thương hiệu (Brand).
3. **`CartDrawer.tsx` (Ngăn kéo giỏ hàng):**
   * Ngăn kéo trượt mượt mà ra từ cạnh phải màn hình khi người dùng click vào icon Giỏ hàng.
   * Cập nhật tăng/giảm số lượng sản phẩm tức thì và tự động tính tổng tiền.
4. **`CouponInput.tsx` (Nhập mã giảm giá):**
   * Ô nhập mã coupon thiết kế trực quan.
   * Hiển thị thông báo phản hồi (Feedback) màu xanh khi áp dụng thành công hoặc màu đỏ khi mã không hợp lệ/hết hạn.
5. **`OrderStatusStepper.tsx` (Thanh trạng thái đơn hàng):**
   * Thể hiện 5 bước của đơn hàng dạng Stepper: `PENDING` $\rightarrow$ `CONFIRMED` $\rightarrow$ `SHIPPING` $\rightarrow$ `DELIVERED` hoặc `CANCELLED`.
   * Sử dụng màu sắc tương ứng để biểu thị trạng thái hiện tại của đơn hàng.
6. **`ProductImageGallery.tsx` (Bộ sưu tập ảnh):**
   * Hiển thị ảnh sản phẩm chính cỡ lớn.
   * Danh sách ảnh thumbnail bên dưới, cho phép click để đổi ảnh chính mượt mà.

---

## 4. Các Trang Và Màn Hình Đã Xây Dựng (Pages)

Tất cả các màn hình yêu cầu đều được thiết kế giao diện cao cấp và đặt tại `frontend/src/pages/`:

* **`Home.tsx` (Trang chủ):** Hiển thị Banner quảng cáo chất lượng cao, các danh mục sản phẩm nổi bật dưới dạng lưới, và phần sản phẩm bán chạy nhất kèm hiệu ứng hover.
* **`ProductList.tsx` (Danh sách sản phẩm):** Hỗ trợ tìm kiếm, lọc qua `FilterSidebar`, sắp xếp sản phẩm theo giá hoặc ngày tạo, tích hợp phân trang.
* **`ProductDetail.tsx` (Chi tiết sản phẩm):** Hiển thị bộ ảnh gallery, giá gốc và giá sau chiết khấu, số lượng tồn kho thực tế, mô tả chi tiết sản phẩm và danh sách đánh giá/bình luận của người dùng.
* **`Cart.tsx` (Trang giỏ hàng):** Hiển thị danh sách chi tiết các món hàng, hỗ trợ nhập voucher và hiển thị ví voucher của người dùng để chọn nhanh.
* **`Checkout.tsx` (Thanh toán):** Form nhập thông tin nhận hàng (Tên, SĐT, Địa chỉ, ghi chú). Tích hợp chọn nhanh voucher khả dụng và hiển thị thông tin hóa đơn tổng hợp.
* **`MyOrders.tsx` (Đơn hàng của tôi):** Danh sách lịch sử đơn hàng của người dùng. Click vào từng đơn hàng sẽ hiển thị chi tiết các món đã mua, số tiền và thanh trạng thái stepper. Hỗ trợ nút Hủy đơn nhanh.
* **`Profile.tsx` (Hồ sơ cá nhân):** Quản lý thông tin cá nhân, cập nhật địa chỉ và đổi mật khẩu.
* **`Vouchers.tsx` (Ví Voucher):** Nơi người dùng khám phá và nhấn thu thập (collect) các mã giảm giá đang hoạt động trên hệ thống.
* **`Wishlist.tsx` (Sản phẩm yêu thích):** Lưu trữ danh sách sản phẩm yêu thích và hiển thị thông báo tự động nếu sản phẩm trong danh sách này được giảm giá.
* **`AdminDashboard.tsx` (Trang quản trị):** Giao diện Dashboard cao cấp dành riêng cho ADMIN, bao gồm:
  * Biểu đồ doanh thu dạng đường (Line Chart).
  * Biểu đồ cơ cấu doanh thu theo Danh mục (Doughnut Chart).
  * Danh sách sản phẩm bán chạy nhất.
  * Quản lý CRUD Sản phẩm, Danh mục, Voucher, Đơn hàng.
  * Phân hệ **Thùng rác (Recycle Bin)** quản lý xóa mềm và khôi phục dữ liệu nhanh.

---

## 5. Tích Hợp API & Bảo Mật Ở Frontend

* **Interceptor của Axios:** Tự động đính kèm Token JWT vào Header của các request yêu cầu xác thực.
* **Xử lý Token hết hạn (Token Refreshing):** Nếu API trả về mã lỗi `401 Unauthorized` (do Access Token hết hạn), Axios Interceptor sẽ chặn request lại, tự động gọi API `/api/auth/refresh` bằng `refreshToken` để lấy Access Token mới, sau đó thực hiện lại request bị lỗi trước đó một cách trong suốt với người dùng.
* **Bảo vệ Định tuyến (Route Guarding):** 
  * Sử dụng component `ProtectedRoute` để chặn người dùng chưa đăng nhập truy cập các trang cá nhân, giỏ hàng, thanh toán.
  * Sử dụng component `AdminRoute` để chỉ cho phép tài khoản có role `ADMIN` truy cập trang quản trị.

---

## 6. Thiết Kế Responsive & Mobile First

Ứng dụng Frontend sử dụng hệ thống Grid và Flexbox của TailwindCSS để tự động co giãn hiển thị trên mọi loại thiết bị di động, máy tính bảng và máy tính để bàn:
* **Trên Mobile:** Thanh bộ lọc `FilterSidebar` chuyển thành Drawer thu gọn, thanh Header tối ưu dạng menu Hamburger.
* **Trải nghiệm người dùng (UX) nâng cao:** Tích hợp bộ xương giả lập (Skeleton Loading) khi tải dữ liệu, thông báo Toast báo thành công/thất bại nổi lên góc màn hình, hiệu ứng chuyển trang mượt mà.
