# TÀI LIỆU ÔN TẬP BẢO VỆ ĐỒ ÁN - HỆ THỐNG THƯƠNG MẠI ĐIỆN TỬ ASTRASHOP

Tài liệu này tổng hợp toàn bộ nguyên lý hoạt động, luồng xử lý (flow), cấu trúc dữ liệu và logic code của từng chức năng trong hệ thống **AstraShop** (bao gồm cả Frontend React và Backend Spring Boot) nhằm phục vụ tốt nhất việc trả lời các câu hỏi phản biện từ Hội đồng Giáo viên khi bảo vệ đồ án.

---

## 1. Cơ Chế Xác Thực & Phân Quyền (Authentication & RBAC)

### ❓ Câu hỏi của Thầy/Cô có thể gặp:
*   *Hệ thống đăng nhập bằng gì? Cơ chế JWT hoạt động cụ thể thế nào?*
*   *Access Token và Refresh Token khác nhau ra sao? Tại sao cần cả hai loại token này?*
*   *Làm thế nào để phân quyền Admin và Customer ở cả Backend và Frontend?*
*   *Khi Access Token hết hạn, làm sao để người dùng không bị văng ra ngoài đăng nhập lại liên tục?*

### 💡 Nguyên lý hoạt động & Thiết kế:
*   **Stateless Authentication (Xác thực không trạng thái):** Hệ thống không dùng Session/Cookie truyền thống trên Server để lưu trạng thái đăng nhập. Thay vào đó, sau khi người dùng đăng nhập thành công bằng tài khoản/email, Backend sinh ra một chuỗi mã hóa gọi là **JWT (JSON Web Token)** chứa thông tin của người dùng (như username, vai trò/role) và gửi trả về cho Client. Client sẽ tự lưu trữ token này và đính kèm vào Header của mọi request tiếp theo.
*   **Access Token vs Refresh Token:**
    *   **Access Token:** Có thời hạn ngắn (ví dụ: 15-30 phút). Được dùng để ký và xác thực các request gửi lên server. Vì thời hạn ngắn nên nếu có bị lộ, kẻ xấu cũng không lợi dụng được lâu.
    *   **Refresh Token:** Có thời hạn dài (ví dụ: 7 ngày), được lưu trữ dưới Database. Khi Access Token hết hạn, Client tự động dùng Refresh Token này gửi lên endpoint `/api/auth/refresh` để xin cấp lại một Access Token mới mà người dùng không cần phải gõ lại mật khẩu để đăng nhập.
*   **Axios Interceptor (Bảo vệ phía Client):**
    *   Sử dụng bộ lọc trung gian (Interceptor) của Axios. Trước khi gửi request đi, tự động đọc Access Token từ Zustand Store và đính kèm vào Header `Authorization: Bearer <Access_Token>`.
    *   Khi nhận phản hồi lỗi `401 Unauthorized` hoặc `403 Token Expired`, Interceptor sẽ tạm dừng các request khác, thực hiện gọi API `/api/auth/refresh` để lấy Access Token mới. Nếu lấy thành công, nó cập nhật Token mới và chạy lại (retry) các request bị lỗi trước đó. Nếu Refresh Token cũng hết hạn, nó tự động gọi hàm `logout()` đưa người dùng về trang đăng nhập.

### 🛠️ Các file Code & Database liên quan:
*   **Backend:**
    *   Thực thể & DB: [User.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/domain/User.java) (bảng `users`), [RefreshToken.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/domain/RefreshToken.java) (bảng `refresh_tokens`).
    *   Cấu hình Security: [SecurityConfig.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/security/SecurityConfig.java) (Cấu hình tắt CSRF, quản lý CORS, chỉ định các endpoint công khai và phân quyền các API bắt đầu bằng `/api/admin/**`).
    *   Bộ lọc Request: [JwtAuthenticationFilter.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/security/JwtAuthenticationFilter.java) (Đọc Token từ Header, xác thực và đẩy thông tin vào Spring Security Context).
    *   Xử lý logic: [JwtService.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/security/JwtService.java), [AuthService.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/service/AuthService.java).
    *   Phân quyền Endpoint: Dùng `@PreAuthorize("hasRole('ADMIN')")` trực tiếp trên các phương thức của Controller của Admin.
*   **Frontend:**
    *   Axios Interceptor: [api.ts](file:///e:/WEBBANHANG/frontend/src/services/api.ts).
    *   Quản lý State: [useAuthStore.ts](file:///e:/WEBBANHANG/frontend/src/store/useAuthStore.ts).
    *   Trang UI: [Login.tsx](file:///e:/WEBBANHANG/frontend/src/pages/Login.tsx), [Register.tsx](file:///e:/WEBBANHANG/frontend/src/pages/Register.tsx).

---

## 2. Quên Mật Khẩu & Đặt Lại Mật Khẩu (Forgot & Reset Password qua OTP Email)

### ❓ Câu hỏi của Thầy/Cô có thể gặp:
*   *Quy trình khôi phục mật khẩu diễn ra thế nào?*
*   *Mã OTP được quản lý và kiểm tra thời hạn hết hạn ra sao dưới Database?*

### 💡 Nguyên lý hoạt động & Thiết kế:
1.  **Yêu cầu OTP:** Khách hàng nhập email yêu cầu đặt lại mật khẩu. Hệ thống kiểm tra xem email có tồn tại trong hệ thống không.
2.  Nếu tồn tại, hệ thống sinh ra một chuỗi ký tự ngẫu nhiên (OTP Code) gồm 6 chữ số.
3.  **Lưu Database & Giới hạn thời gian:** Thông tin OTP này được lưu vào bảng `password_resets` với khóa chính là `email`, kèm theo `expiry_time` (Thời hạn hết hạn được set là 1 phút kể từ lúc tạo).
4.  **Gửi Mail:** Backend sử dụng thư viện `JavaMailSender` của Spring để gửi mã OTP này trực tiếp đến email của người dùng dưới dạng mail HTML.
5.  **Xác thực & Reset:** Người dùng nhập OTP cùng mật khẩu mới gửi lên. Backend kiểm tra:
    *   Có bản ghi OTP nào tương ứng với email này không?
    *   Mã OTP gửi lên có khớp không?
    *   Thời gian hiện tại có vượt quá `expiry_time` không?
    *   Nếu tất cả hợp lệ, Backend băm mật khẩu mới bằng thư viện **BCrypt** rồi cập nhật vào bảng `users`. Cuối cùng, thực hiện xóa bản ghi OTP này khỏi bảng `password_resets` để tránh việc mã này bị tái sử dụng.

### 🛠️ Các file Code & Database liên quan:
*   **Backend:**
    *   Thực thể & DB: [PasswordReset.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/domain/PasswordReset.java) (bảng `password_resets`).
    *   Xử lý logic: `AuthService.forgotPassword()` (tạo OTP & gửi mail), `AuthService.resetPassword()` (kiểm tra & cập nhật pass).
    *   Repository: `PasswordResetRepository.java`.
*   **Frontend:**
    *   Trang UI xử lý form gửi OTP và nhập mật khẩu mới: [Login.tsx](file:///e:/WEBBANHANG/frontend/src/pages/Login.tsx) (phần tab/form quên mật khẩu).

---

## 3. Lọc Tìm Kiếm, Phân Trang & Sắp Xếp Sản Phẩm (Catalog Filtering, Pagination & Sorting)

### ❓ Câu hỏi của Thầy/Cô có thể gặp:
*   *Tại sao phải phân trang ở Database (Server-side) mà không tải hết lên Client rồi phân trang bằng Javascript?*
*   *Câu truy vấn tìm kiếm và lọc sản phẩm đa tiêu chí hoạt động như thế nào?*

### 💡 Nguyên lý hoạt động & Thiết kế:
*   **Phân trang ở Database (Server-side Pagination):** Khi cơ sở dữ liệu có hàng nghìn, hàng triệu sản phẩm, việc tải hết dữ liệu lên RAM rồi phân trang trên UI sẽ làm sập trình duyệt và tốn băng thông nghiêm trọng. Do đó, hệ thống sử dụng các tham số `page` (trang hiện tại) và `size` (số lượng phần tử mỗi trang) để giới hạn dữ liệu trả về bằng các câu lệnh SQL `LIMIT` và `OFFSET` dưới database.
*   **Lọc đa tiêu chí (Dynamic Filtering):** Khách hàng có thể tìm kiếm theo từ khóa, lọc theo danh mục (`category_id`), thương hiệu (`brand`), khoảng giá (`minPrice` đến `maxPrice`), và sắp xếp theo giá (`price` tăng/giảm) hoặc ngày tạo.
*   Backend sử dụng **Spring Data JPA Query Methods** hoặc truy vấn JPQL động để sinh ra câu lệnh SQL có các mệnh đề `WHERE` tương ứng với các tiêu chí lọc được truyền lên từ Frontend.

### 🛠️ Các file Code & Database liên quan:
*   **Backend:**
    *   Controller: [CatalogController.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/controller/CatalogController.java).
    *   Repository: [ProductRepository.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/repository/ProductRepository.java) (sử dụng `@Query` hoặc phương thức truy vấn động trả về đối tượng `Page<Product>` chứa danh sách trang hiện tại và tổng số trang).
*   **Frontend:**
    *   Trang hiển thị & xử lý bộ lọc: [ProductList.tsx](file:///e:/WEBBANHANG/frontend/src/pages/ProductList.tsx) (sử dụng State để quản lý các query params và cập nhật lại danh sách qua Axios).

---

## 4. Quản Lý Giỏ Hàng Lâu Dài (Persistent Shopping Cart)

### ❓ Câu hỏi của Thầy/Cô có thể gặp:
*   *Giỏ hàng của hệ thống được lưu trữ ở đâu? Tại sao?*
*   *Khi người dùng thêm sản phẩm vào giỏ hàng, hệ thống kiểm tra logic gì?*

### 💡 Nguyên lý hoạt động & Thiết kế:
*   **Database-backed Cart (Giỏ hàng lưu ở DB):** Hệ thống không dùng LocalStorage để lưu giỏ hàng vì muốn đảm bảo khi người dùng đăng nhập trên điện thoại hay máy tính khác thì giỏ hàng vẫn được đồng bộ và giữ nguyên. Giỏ hàng được lưu trong bảng `cart_items` liên kết với `users` và `products`.
*   **Ràng buộc số lượng tồn kho (Inventory Constraint):**
    *   Khi người dùng bấm "Thêm vào giỏ hàng" hoặc tăng số lượng trong trang giỏ hàng, Backend sẽ truy vấn bảng `products` để lấy số lượng tồn kho hiện tại (`stock`).
    *   Nếu số lượng khách hàng muốn mua vượt quá số lượng tồn kho, Backend lập tức chặn lại và trả về lỗi `400 Bad Request` kèm thông báo: "Số lượng vượt quá tồn kho hiện có".

### 🛠️ Các file Code & Database liên quan:
*   **Backend:**
    *   Thực thể & DB: [CartItem.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/domain/CartItem.java) (bảng `cart_items`).
    *   Xử lý logic: `ShopService.addToCart()`, `ShopService.updateCartQuantity()`.
    *   Repository: `CartItemRepository.java`.
*   **Frontend:**
    *   Quản lý State giỏ hàng toàn cục: [useCartStore.ts](file:///e:/WEBBANHANG/frontend/src/store/useCartStore.ts).
    *   Trang UI giỏ hàng: [Cart.tsx](file:///e:/WEBBANHANG/frontend/src/pages/Cart.tsx).

---

## 5. Hệ Thống Mã Giảm Giá & Ví Voucher (Coupons & User Coupons)

### ❓ Câu hỏi của Thầy/Cô có thể gặp:
*   *Quy trình tạo, thu thập và áp dụng Coupon diễn ra như thế nào?*
*   *Làm thế nào để đảm bảo một khách hàng không thể dùng quá giới hạn hoặc dùng mã giảm giá đã hết hạn?*

### 💡 Nguyên lý hoạt động & Thiết kế:
1.  **Phát hành Coupon (Admin):** Admin tạo mới mã coupon trong Dashboard, thiết lập `discount_percent` (phần trăm giảm), `max_uses` (lượt dùng tối đa toàn hệ thống), `start_date` và `end_date`.
2.  **Sưu tầm Coupon (Ví cá nhân - User Coupons):** Khách hàng vào trang Mã giảm giá, bấm "Thu thập". Hệ thống ghi nhận liên kết vào bảng trung gian `user_coupons` (giữa `users` và `coupons`). Đồng thời có khóa duy nhất `UNIQUE KEY (user_id, coupon_id)` đảm bảo mỗi khách hàng chỉ có thể thu thập mã đó đúng 1 lần vào ví.
3.  **Áp dụng mã giảm giá:** Khi thanh toán, hệ thống sẽ kiểm tra:
    *   Mã coupon có tồn tại và đang ở trạng thái kích hoạt (`active = true`) không?
    *   Thời gian hiện tại có nằm trong khoảng `start_date` và `end_date` không?
    *   Số lượt đã sử dụng trên hệ thống (`used_count`) có vượt quá `max_uses` không?
    *   Khách hàng đã thu thập mã này vào ví của mình chưa?
    *   Nếu tất cả hợp lệ, Backend tính toán số tiền giảm: `discount_amount = total_amount * (discount_percent / 100)`. Số tiền thanh toán thực tế sẽ bằng `total_amount - discount_amount`.

### 🛠️ Các file Code & Database liên quan:
*   **Backend:**
    *   Thực thể & DB: [Coupon.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/domain/Coupon.java) (bảng `coupons`), [UserCoupon.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/domain/UserCoupon.java) (bảng `user_coupons`).
    *   Xử lý logic: `ShopService.collectCoupon()`, `ShopService.applyCoupon()`.
*   **Frontend:**
    *   Trang danh sách voucher để thu thập: [Vouchers.tsx](file:///e:/WEBBANHANG/frontend/src/pages/Vouchers.tsx).
    *   Áp dụng voucher lúc checkout: [Checkout.tsx](file:///e:/WEBBANHANG/frontend/src/pages/Checkout.tsx).

---

## 6. Đặt Hàng & Thanh Toán (Checkout & Transactional Integrity)

### ❓ Câu hỏi của Thầy/Cô có thể gặp:
*   *Làm thế nào để đảm bảo tính toàn vẹn dữ liệu khi đặt hàng (ví dụ: đang đặt hàng thì lỗi mạng, hoặc sản phẩm bị hết hàng)?*
*   *Tại sao phải lưu giá bán sản phẩm vào bảng `order_items` trong khi đã có giá ở bảng `products`?*

### 💡 Nguyên lý hoạt động & Thiết kế:
*   **Đảm bảo tính toàn vẹn bằng Database Transaction (`@Transactional`):**
    Quy trình đặt hàng bao gồm rất nhiều bước cập nhật cơ sở dữ liệu liên hoàn:
    1. Tạo đơn hàng mới trong bảng `orders`.
    2. Tạo danh sách các mặt hàng chi tiết trong bảng `order_items`.
    3. Trừ số lượng tồn kho (`stock`) của từng sản phẩm trong bảng `products`.
    4. Cập nhật số lần sử dụng (`used_count`) của Coupon được áp dụng.
    5. Xóa các sản phẩm đã mua khỏi giỏ hàng (`cart_items`).
    *Để tránh trường hợp một bước bị lỗi (ví dụ: sản phẩm bị hết hàng giữa chừng) nhưng các bước trước vẫn được lưu (đơn hàng vẫn tạo, giỏ hàng vẫn bị xóa), toàn bộ phương thức `createOrder` được bọc trong annotation `@Transactional`. Nếu xảy ra lỗi ở bất kỳ bước nào, hệ thống sẽ thực hiện **Rollback** (hủy bỏ toàn bộ các thay đổi và khôi phục database về trạng thái trước khi đặt hàng).*
*   **Lưu giá bán lịch sử (Historic Price Locking):**
    Giá bán sản phẩm trong bảng `products` có thể thay đổi liên tục theo thời gian (tăng giá, giảm giá, hoặc sửa giá). Nếu bảng `order_items` chỉ liên kết khóa ngoại tới `products` mà không lưu lại giá bán tại thời điểm mua, thì khi giá sản phẩm thay đổi, tổng tiền của các hóa đơn cũ đã mua trong quá khứ cũng sẽ bị thay đổi theo, gây sai lệch nghiêm trọng cho báo cáo tài chính. Do đó, hệ thống bắt buộc phải sao chép giá bán thực tế tại thời điểm mua (`price`) và lưu trực tiếp vào bảng `order_items`.

### 🛠️ Các file Code & Database liên quan:
*   **Backend:**
    *   Thực thể & DB: [Order.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/domain/Order.java) (bảng `orders`), [OrderItem.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/domain/OrderItem.java) (bảng `order_items`).
    *   Xử lý logic: `ShopService.createOrder()` (được đánh dấu `@Transactional` ở mức method).
*   **Frontend:**
    *   Trang xử lý đặt hàng: [Checkout.tsx](file:///e:/WEBBANHANG/frontend/src/pages/Checkout.tsx).
    *   Trang lịch sử đơn hàng: [MyOrders.tsx](file:///e:/WEBBANHANG/frontend/src/pages/MyOrders.tsx).

---

## 7. Ràng Buộc Logic Đánh Giá & Bình Luận (Product Reviews Guard Logic)

### ❓ Câu hỏi của Thầy/Cô có thể gặp:
*   *Làm thế nào để hệ thống ngăn chặn việc đánh giá ảo (Spam Reviews)?*

### 💡 Nguyên lý hoạt động & Thiết kế:
*   Hệ thống áp dụng logic kiểm tra lịch sử mua sắm nghiêm ngặt trước khi cho phép người dùng đăng đánh giá cho một sản phẩm:
    1. Khi người dùng gửi đánh giá, Backend nhận thông tin `user_id` từ Token xác thực và `product_id` của sản phẩm được đánh giá.
    2. Backend thực hiện truy vấn bảng `orders` kết hợp với `order_items` để tìm xem có đơn hàng nào của `user_id` này chứa `product_id` đó hay không.
    3. Đồng thời, trạng thái của đơn hàng đó bắt buộc phải là **`DELIVERED`** (Đã giao hàng thành công).
    4. Nếu thỏa mãn cả 2 điều kiện trên, hệ thống mới cho phép ghi nhận đánh giá vào bảng `reviews`. Nếu không, hệ thống sẽ từ chối và trả về lỗi `400 Bad Request` kèm thông báo: "Bạn chỉ có thể đánh giá sản phẩm sau khi đã nhận hàng thành công".

### 🛠️ Các file Code & Database liên quan:
*   **Backend:**
    *   Thực thể & DB: [Review.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/domain/Review.java) (bảng `reviews`).
    *   Xử lý logic kiểm tra đơn hàng: `ShopService.createReview()`.
*   **Frontend:**
    *   Trang UI hiển thị và gửi form đánh giá: [ProductDetail.tsx](file:///e:/WEBBANHANG/frontend/src/pages/ProductDetail.tsx) (chỉ hiển thị form đánh giá cho người dùng khi API xác nhận họ đủ điều kiện).

---

## 8. Cơ Chế Thùng Rác Hệ Thống (Recycle Bin - Soft Delete)

### ❓ Câu hỏi của Thầy/Cô có thể gặp:
*   *Tại sao hệ thống không dùng lệnh DELETE cứng để xóa dữ liệu? Xóa mềm hoạt động như thế nào?*
*   *Làm thế nào để khôi phục lại dữ liệu và các mối quan hệ liên kết cũ (ví dụ: khôi phục một danh mục và liên kết lại các sản phẩm cũ của danh mục đó)?*

### 💡 Nguyên lý hoạt động & Thiết kế:
*   **Tại sao cần xóa mềm (Soft Delete)?**
    Nếu Admin thực hiện xóa cứng một thực thể (ví dụ: Danh mục hoặc Người dùng) bằng lệnh `DELETE FROM`, database sẽ bị lỗi ràng buộc khóa ngoại (Foreign Key Constraint Violation) nếu thực thể đó đang được liên kết với các bảng khác (ví dụ: danh mục đang chứa sản phẩm, hoặc người dùng đang có đơn hàng). Nếu xóa cưỡng bức (Cascade Delete), toàn bộ đơn hàng và sản phẩm liên quan sẽ bị mất sạch, gây mất mát dữ liệu nghiêm trọng.
    Giải pháp là **Xóa mềm (Soft Delete)** thông qua cơ chế sao lưu JSON vào bảng `recycle_bin`.
*   **Luồng xử lý Xóa mềm:**
    1. Khi Admin bấm "Xóa" một đối tượng (User, Product, Category, hoặc Coupon):
    2. Backend lấy thông tin đối tượng đó, chuyển đổi toàn bộ thuộc tính của đối tượng thành một chuỗi văn bản JSON.
    3. Lưu một bản ghi mới vào bảng `recycle_bin` chứa: `entity_type` (Tên bảng gốc), `entity_id` (ID gốc), `display_name` (Tên hiển thị), và `original_data` (Chuỗi JSON chứa dữ liệu sao lưu).
    4. Thực hiện xóa đối tượng đó khỏi bảng gốc. Lúc này, các liên kết khóa ngoại cũ sẽ tự động được xử lý an toàn (ví dụ: các sản phẩm thuộc danh mục bị xóa sẽ được chuyển `category_id` về `NULL` thay vì bị xóa mất).
*   **Luồng xử lý Khôi phục (Restore):**
    1. Khi Admin bấm "Khôi phục" trong Thùng rác:
    2. Backend đọc chuỗi JSON từ bảng `recycle_bin`, chuyển đổi ngược lại thành đối tượng (Map/DTO).
    3. Thực hiện câu lệnh SQL `INSERT` trực tiếp (Native Query) để đẩy dữ liệu cũ vào lại bảng gốc với đúng ID gốc để bảo toàn các mối liên kết cũ.
    4. **Xử lý khôi phục liên kết đặc biệt:**
        *   **Restoring Product:** Khi khôi phục sản phẩm, hệ thống kiểm tra xem danh mục cũ của nó (`category_id`) có còn tồn tại trong DB không. Nếu có thì gán lại, nếu danh mục đó đã bị xóa hoàn toàn thì tạm thời gán `category_id = NULL`.
        *   **Restoring Category:** Khi xóa danh mục, danh sách các ID sản phẩm cũ thuộc danh mục đó được đóng gói vào JSON. Khi khôi phục danh mục, hệ thống sẽ tự động chạy lệnh `UPDATE products SET category_id = <category_id> WHERE id IN (<product_ids>)` để gom các sản phẩm cũ trở lại danh mục này.

### 🛠️ Các file Code & Database liên quan:
*   **Backend:**
    *   Thực thể & DB: [RecycleBin.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/domain/RecycleBin.java) (bảng `recycle_bin`).
    *   Xử lý logic Sao lưu & Khôi phục: [RecycleBinService.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/service/RecycleBinService.java).
    *   Controller quản trị: [AdminController.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/controller/admin/AdminController.java).
*   **Frontend:**
    *   Giao diện quản lý thùng rác, khôi phục/xóa vĩnh viễn: [AdminDashboard.tsx](file:///e:/WEBBANHANG/frontend/src/pages/AdminDashboard.tsx) (Tab Recycle Bin).

---

## 9. Lịch Sử Biến Động Giá & Thông Báo Giảm Giá (Price History & Wishlist Notification)

### ❓ Câu hỏi của Thầy/Cô có thể gặp:
*   *Lịch sử thay đổi giá bán được ghi lại khi nào và hoạt động ra sao?*
*   *Làm thế nào để hệ thống thông báo giảm giá cho khách hàng khi sản phẩm yêu thích được giảm giá?*

### 💡 Nguyên lý hoạt động & Thiết kế:
*   **Ghi nhận lịch sử giá:** Khi Admin chỉnh sửa thông tin sản phẩm (thay đổi giá bán gốc `price` hoặc phần trăm giảm giá `discount_percent`), Backend sẽ so sánh giá trị mới với giá trị hiện tại lưu trong database. Nếu có sự thay đổi, Backend tự động chèn một bản ghi mới vào bảng `price_history` lưu lại: `old_price`, `new_price`, `old_discount`, `new_discount` và thời gian thay đổi `changed_at`.
*   **Thông báo giảm giá (Wishlist Integration):**
    *   Khách hàng có thể thêm sản phẩm yêu thích vào danh sách `wishlists`.
    *   Khi Admin cập nhật giá sản phẩm giảm xuống (giá mới thấp hơn giá cũ), hệ thống sẽ tìm kiếm tất cả khách hàng đang lưu sản phẩm này trong danh sách yêu thích của họ.
    *   Hệ thống sinh ra thông báo giảm giá tương ứng để hiển thị cho khách hàng khi họ truy cập trang web hoặc xem danh sách thông báo yêu thích.

### 🛠️ Các file Code & Database liên quan:
*   **Backend:**
    *   Thực thể & DB: [PriceHistory.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/domain/PriceHistory.java) (bảng `price_history`), [Wishlist.java](file:///e:/WEBBANHANG/src/main/java/com/example/webbanhang/domain/Wishlist.java) (bảng `wishlists`).
    *   Xử lý logic: Ghi nhận lịch sử giá trong phương thức cập nhật sản phẩm tại `CatalogService.updateProduct()`.
*   **Frontend:**
    *   Trang danh sách yêu thích và nhận thông báo: [Wishlist.tsx](file:///e:/WEBBANHANG/frontend/src/pages/Wishlist.tsx), sử dụng store [useWishlistStore.ts](file:///e:/WEBBANHANG/frontend/src/store/useWishlistStore.ts).
