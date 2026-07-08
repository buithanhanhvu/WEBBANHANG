# HƯỚNG DẪN TỪNG BƯỚC DEMO BỘ TEST API TRÊN INTELLIJ IDEA

Tài liệu này hướng dẫn bạn cách trình diễn (demo) chi tiết **các phương pháp kiểm thử và sử dụng tài liệu API** của dự án **AstraShop** trên phần mềm **IntelliJ IDEA**:
1. **Kiểm thử tự động bằng Code JUnit** (Chạy trực quan bằng giao diện IntelliJ).
2. **Kiểm thử thủ công bằng Postman** (Trình diễn kịch bản mua hàng tự động hóa token).
3. **Kiểm thử và tài liệu hóa bằng Swagger UI / OpenAPI** (Trình diễn giao diện đặc tả API trực quan).

---

## 🛑 CHUẨN BỊ TRƯỚC KHI DEMO
* Đảm bảo **MySQL Server** trên máy tính đã được bật.
* Khởi tạo cơ sở dữ liệu `webbanhang` (nếu chưa có).
* Biết rõ **mật khẩu MySQL** của bạn (ví dụ: `123456`, `root`, hoặc để trống).

---

## 🚀 PHẦN 1: DEMO KIỂM THỬ TỰ ĐỘNG (JUNIT & MOCKMVC) TRÊN INTELLIJ
*Phương pháp này chứng minh code backend có khả năng tự động test toàn bộ logic mà không cần chạy server thủ công.*

### Các bước thực hiện:
1. **Mở file test:**
   * Trong cây thư mục bên trái của IntelliJ, tìm đến: `src` -> `test` -> `java` -> `com.example.webbanhang.controller` -> mở file [ApiControllerTests.java](src/test/java/com/example/webbanhang/controller/ApiControllerTests.java).
2. **Cấu hình mật khẩu MySQL để chạy test không bị lỗi:**
   * Nhấn chuột phải vào class `ApiControllerTests` (dòng 18) -> Chọn **More Run/Debug** -> **Modify Run Configuration...** (hoặc **Edit Configurations...**).
   * Tại ô **VM options**, nhập: `-Dspring.datasource.password=MAT_KHAU_CUA_BAN` (Thay `MAT_KHAU_CUA_BAN` bằng mật khẩu MySQL của bạn. Nếu không có mật khẩu thì nhập `-Dspring.datasource.password=`).
   * Nhấn **OK** để lưu lại.
3. **Chạy test:**
   * Nhấn vào **biểu tượng nút Play màu xanh lá** nằm ngay bên cạnh dòng khai báo `public class ApiControllerTests` (dòng 18).
   * Chọn **Run 'ApiControllerTests'**.
4. **Giải thích kết quả cho người xem:**
   * Khi chạy xong, bạn sẽ thấy cột bên trái hiển thị **13 dấu tích màu xanh lá** tương ứng với 13 test cases chạy thành công tuyệt đối (Passed 13 of 13 tests).

---

## 📬 PHẦN 2: DEMO KIỂM THỬ THỦ CÔNG BẰNG POSTMAN

1. **Khởi chạy Server:** Click vào nút **Play** ở góc trên bên phải IntelliJ để chạy class [WebbanhangApplication.java](src/main/java/com/example/webbanhang/WebbanhangApplication.java).
2. **Import cấu hình:** Mở **Postman** -> Nhấn **Import** -> Chọn file [AstraShop.postman_collection.json](AstraShop.postman_collection.json) trong thư mục gốc dự án.
3. **Trình diễn kịch bản 13 bước:**

#### 🟢 Nhóm 1: Các ca kiểm thử thành công (Success Cases)
*   **1. Đăng ký khách hàng mới:** Nhấn **Send** -> Trả về `200 OK` chứa thông tin user mới.
*   **2. Đăng nhập & Lấy Token:** Nhấn **Send**. Postman sẽ tự động đọc Token và lưu lại vào biến `{{token}}`.
*   **3. Chi tiết sản phẩm:** Nhấn **Send** -> Trả về thông tin sản phẩm có ID = 1 (Không cần token).
*   **4. Thêm sản phẩm vào giỏ:** Nhấn **Send** -> Thành công (Token được đính kèm tự động).
*   **5. Áp dụng mã giảm giá (Voucher):** Nhấn **Send** -> Trả về giỏ hàng mới đã giảm giá 10% (WELCOME10).
*   **6. Đặt hàng (Thanh toán):** Nhấn **Send** -> Đơn hàng chuyển sang trạng thái `PENDING` thành công.
*   **7. Admin Đăng nhập & Lấy Token Admin:** Nhấn **Send**. Postman sẽ tự động lưu token Admin vào biến `{{adminToken}}`.
*   **8. Admin thêm sản phẩm mới:** Nhấn **Send** -> Tạo sản phẩm thành công bằng tài khoản Admin (Chứng minh chức năng CRUD của Admin).

#### 🔴 Nhóm 2: Các ca kiểm thử thất bại/Ràng buộc bảo mật (Failure Cases)
*   **9. Đăng ký trùng tên đăng nhập:** Nhấn **Send** -> Trả về `400 Bad Request` vì username `admin` đã tồn tại.
*   **10. Đăng nhập sai mật khẩu:** Nhấn **Send** -> Trả về `400 Bad Request` do sai mật khẩu.
*   **11. Thêm giỏ hàng khi chưa đăng nhập:** Nhấn **Send** -> Trả về lỗi `403 Forbidden` vì thiếu Token.
*   **12. Khách thường vào Admin Dashboard:** Nhấn **Send** -> Trả về lỗi `403 Forbidden` do tài khoản khách hàng không có quyền Admin.
*   **13. Đánh giá khi chưa mua hàng:** Nhấn **Send** -> Trả về lỗi logic `400 Bad Request` với thông báo *"Bạn chưa mua sản phẩm này..."*.

---

## 🎨 PHẦN 3: HƯỚNG DẪN DEMO / SỬ DỤNG SWAGGER UI

*Swagger UI cung cấp giao diện trực quan hiển thị tài liệu đặc tả API và cho phép bạn click chạy thử trực tiếp trên trình duyệt web.*

### Các bước thực hiện:
1. **Khởi chạy Server:** Đảm bảo class [WebbanhangApplication.java](src/main/java/com/example/webbanhang/WebbanhangApplication.java) đã được chạy thành công trên IntelliJ.
2. **Mở trình duyệt:** Truy cập đường dẫn: **`http://localhost:8080/swagger-ui/index.html`**
3. **Mô tả giao diện cho người xem:**
   * Phía trên là thông tin tiêu đề: **"Astra Shop API Documentation"** (Định nghĩa tại [OpenApiConfig.java](src/main/java/com/example/webbanhang/config/OpenApiConfig.java)).
   * Phía dưới là các nhóm API được phân loại rõ ràng:
     * `Authentication`: Đăng ký, đăng nhập, quên mật khẩu,...
     * `Cart & Orders`: Giỏ hàng, voucher cá nhân, thanh toán, đánh giá sản phẩm.
     * `Catalog`: Xem và lọc sản phẩm, xem danh mục.
     * `Admin API`: Các chức năng dành riêng cho quản trị viên.
4. **Trình diễn chạy thử một API công khai (Public API):**
   * Nhấp chọn nhóm **Catalog** -> Chọn endpoint `GET /api/products/{id}`.
   * Nhấp nút **Try it out** ở góc bên phải.
   * Nhập vào ô `id`: `1`.
   * Nhấn nút **Execute** màu xanh dương lớn.
   * Chỉ cho người xem thấy phần **Response body** bên dưới hiển thị dữ liệu JSON của sản phẩm 1 rất chi tiết.

5. **Trình diễn chạy thử API có bảo mật (Yêu cầu JWT Token):**
   * Nhấp chọn nhóm **Authentication** -> Chọn endpoint `POST /api/auth/login`.
   * Nhấp nút **Try it out**.
   * Nhập dữ liệu đăng nhập mẫu vào ô Request body:
     ```json
     {
       "usernameOrEmail": "customer",
       "password": "customer123"
     }
     ```
   * Nhấn **Execute** -> Hệ thống trả về token trong response body. Hãy bôi đen và **Copy chuỗi Token** này (không copy dấu ngoặc kép).
   * Cuộn lên đầu trang Swagger UI, nhấp vào nút **Authorize** có biểu tượng ổ khóa mở ở góc phải.
   * Dán chuỗi Token vừa copy vào ô **Value** và nhấn nút **Authorize**, sau đó nhấn **Close**.
   * *Bây giờ bạn đã đăng nhập thành công trên Swagger.* Hãy thử chọn API `GET /api/cart` (Lấy giỏ hàng) -> nhấn **Try it out** -> nhấn **Execute**. Hệ thống sẽ trả về giỏ hàng của bạn thành công thay vì bị chặn lỗi `403 Forbidden`.
