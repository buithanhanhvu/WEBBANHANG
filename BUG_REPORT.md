# 🐛 NHẬT KÝ THEO DÕI VÀ QUẢN LÝ LỖI (DEFECT LOG / BUG REPORT)
**Dự án:** AstraShop - Hệ thống Thương mại Điện tử Mini  
**Mô phỏng quy trình quản lý lỗi:** MantisBT / Jira Bug Tracking  

---

## 📌 QUY TRÌNH PHÂN LOẠI MỨC ĐỘ NGIÊM TRỌNG (SEVERITY) & ƯU TIÊN (PRIORITY)

- **Severity (Mức độ nghiêm trọng):**
  - 🔴 **Critical:** Hệ thống sụp đổ, gián đoạn hoàn toàn luồng thanh toán hoặc gây mất mát dữ liệu.
  - 🟠 **High:** Lỗi chức năng chính (ví dụ: Áp voucher sai số tiền, sai tính toán tồn kho).
  - 🟡 **Medium:** Lỗi giao diện, lỗi hiển thị thông báo, mất định dạng UI.
  - 🟢 **Low:** Lỗi chính tả, canh lề khoảng cách UI.

- **Status (Trạng thái vòng đời lỗi):** `NEW` $\rightarrow$ `OPEN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `CLOSED`.

---

## 📋 MẪU BÁO CÁO LỖI NỔI BẬT TRONG DỰ ÁN (SAMPLE DEFECT REPORTS)

### 🔴 BUG-001: Tranh chấp hàng tồn kho (Race Condition) khi 2 khách hàng cùng checkout sản phẩm cuối cùng
- **Bug ID:** `BUG-001`
- **Tiêu đề:** Tồn kho sản phẩm bị âm khi 2 luồng đồng thời gọi API Checkout đặt mua mặt hàng còn 1 sản phẩm.
- **Phân hệ:** Order / Checkout Service.
- **Severity:** 🔴 Critical | **Priority:** P1 (Highest).
- **Trạng thái:** `CLOSED` (Đã khắc phục).
- **Môi trường:** Local Server / MySQL 8.0.
- **Các bước tái hiện (Steps to Reproduce):**
  1. Sản phẩm A có `stock_quantity = 1`.
  2. Tạo 2 tài khoản khách hàng `user1` và `user2` cùng thêm sản phẩm A vào giỏ.
  3. Gửi đồng thời 2 HTTP Request POST `/api/orders` tại cùng 1 thời điểm millisecond.
- **Kết quả thực tế (Actual Result trước khi sửa):** Cả 2 đơn hàng đều tạo thành công, `stock_quantity` bị tụt xuống `-1`.
- **Kết quả mong đợi (Expected Result):** Chỉ 1 đơn hàng thành công, đơn hàng thứ 2 nhận được thông báo lỗi "Sản phẩm đã hết hàng" (HTTP 400).
- **Giải pháp khắc phục (Fix Solution):** Áp dụng Database Row Locking (`SELECT ... FOR UPDATE`) trong phương thức `@Transactional checkout()` tại [ShopService.java](file:///e:/WEBBANHANG/src/main/java/com/example/Webbanhang/service/ShopService.java).

---

### 🟠 BUG-002: Áp dụng mã giảm giá hết hạn hoặc đã vượt quá lượt sử dụng tối đa
- **Bug ID:** `BUG-002`
- **Tiêu đề:** Mã coupon vẫn có thể áp dụng thành công khi `max_uses` đã đạt giới hạn tối đa.
- **Phân hệ:** Coupon Service.
- **Severity:** 🟠 High | **Priority:** P2 (High).
- **Trạng thái:** `CLOSED` (Đã khắc phục).
- **Các bước tái hiện:**
  1. Tạo mã Coupon `DISCOUNT50` với `max_uses = 1`.
  2. Khách hàng 1 áp dụng mã thành công và hoàn tất đơn hàng (`current_uses` tăng thành 1).
  3. Khách hàng 2 tiếp tục nhập mã `DISCOUNT50` tại trang Checkout.
- **Kết quả thực tế (trước khi sửa):** Khách hàng 2 vẫn được chiết khấu 50%.
- **Kết quả mong đợi:** Báo lỗi "Mã giảm giá đã hết lượt sử dụng hoặc không hợp lệ".
- **Giải pháp khắc phục:** Thêm kiểm tra điều kiện `coupon.getCurrentUses() >= coupon.getMaxUses()` và `expiration_date` trong phương thức `applyCoupon()`.

---

### 🟡 BUG-003: Đánh giá sản phẩm hiển thị sai thời gian và không kiểm tra điều kiện mua hàng
- **Bug ID:** `BUG-003`
- **Tiêu đề:** Người dùng chưa từng mua sản phẩm vẫn gửi được đánh giá 5 sao.
- **Phân hệ:** Product Review Module.
- **Severity:** 🟡 Medium | **Priority:** P3 (Medium).
- **Trạng thái:** `CLOSED` (Đã khắc phục).
- **Các bước tái hiện:**
  1. Tạo tài khoản mới chưa phát sinh bất kỳ đơn hàng nào.
  2. Gọi API POST `/api/products/1/reviews` kèm rating 5 sao.
- **Kết quả thực tế (trước khi sửa):** Đánh giá được lưu thành công vào CSDL.
- **Kết quả mong đợi:** Báo lỗi "Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua và nhận hàng thành công (Đơn hàng DELIVERED)".
- **Giải pháp khắc phục:** Bổ sung truy vấn kiểm tra sự tồn tại của bảng `orders` chứa `order_items` với `status = DELIVERED` của `userId` hiện tại trước khi tạo Review.
