# 📊 MA TRẬN KỊCH BẢN KIỂM THỬ CHI TIẾT (TEST CASES MATRIX)

**Dự án:** AstraShop - Hệ thống Thương mại Điện tử Mini  
**Áp dụng kỹ thuật:** Phân vùng tương đương (Equivalence Partitioning), Phân tích giá trị biên (Boundary Value Analysis), Bảng quyết định (Decision Table).

---

## 👨‍💻 PHẦN 1: PHÂN HỆ XÁC THỰC & NGƯỜI DÙNG (AUTHENTICATION & USER)

| Test Case ID | Feature | Mô tả Kịch bản Kiểm thử | Điều kiện tiền đề (Pre-conditions) | Các bước thực hiện (Steps) | Dữ liệu kiểm thử (Test Data) | Kết quả mong đợi (Expected Output) | Kỹ thuật áp dụng |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_AUTH_001** | Đăng ký | Đăng ký tài khoản mới thành công với dữ liệu hợp lệ | Chưa đăng nhập, Username chưa tồn tại | 1. Mở trang Đăng ký<br>2. Nhập thông tin hợp lệ<br>3. Nhấn nút "Đăng ký" | Username: `testuser01`<br>Email: `test01@gmail.com`<br>Pass: `Password123`<br>Phone: `0912345678` | Đăng ký thành công, nhận JWT Token, chuyển hướng về trang chủ. | Hộp đen (Normal Flow) |
| **TC_AUTH_002** | Đăng ký | Đăng ký thất bại khi trùng tên đăng nhập (Username) | Username `customer` đã tồn tại trong DB | 1. Mở trang Đăng ký<br>2. Nhập Username `customer`<br>3. Nhấn nút "Đăng ký" | Username: `customer`<br>Pass: `Password123` | Hệ thống báo lỗi "Username đã tồn tại", mã lỗi 400 Bad Request. | Phân vùng tương đương (Invalid) |
| **TC_AUTH_003** | Đăng ký | Đăng ký thất bại khi mật khẩu quá yếu (< 6 ký tự) | Form đăng ký rỗng | 1. Nhập mật khẩu 3 ký tự<br>2. Nhấn "Đăng ký" | Password: `123` | Báo lỗi validation "Mật khẩu phải từ 6 ký tự trở lên". | Giá trị biên (Boundary Analysis) |
| **TC_AUTH_004** | Đăng nhập | Đăng nhập thành công với tài khoản Khách hàng | Tài khoản đã đăng ký | 1. Mở trang Login<br>2. Nhập username/pass hợp lệ<br>3. Nhấn "Đăng nhập" | User: `customer`<br>Pass: `customer123` | Đăng nhập thành công, trả về JWT Access Token & Refresh Token. | Normal Flow |
| **TC_AUTH_005** | Đăng nhập | Đăng nhập thất bại khi sai mật khẩu | Tài khoản `customer` tồn tại | 1. Nhập password sai<br>2. Nhấn "Đăng nhập" | User: `customer`<br>Pass: `wrongpass` | Báo lỗi "Tên đăng nhập hoặc mật khẩu không chính xác" (HTTP 401). | Negative Testing |
| **TC_AUTH_006** | Đăng nhập | Đăng nhập thất bại khi tài khoản bị khóa (`BANNED`) | Tài khoản `banned_user` bị khóa | 1. Nhập thông tin tài khoản bị khóa<br>2. Nhấn "Đăng nhập" | User: `banned_user`<br>Pass: `pass123` | Báo lỗi "Tài khoản của bạn đã bị khóa", không cấp JWT token. | Decision Table |

---

## 🛒 PHẦN 2: PHÂN HỆ GIỎ HÀNG, COUPON & THANH TOÁN (CART, VOUCHER & CHECKOUT)

| Test Case ID | Feature | Mô tả Kịch bản Kiểm thử | Điều kiện tiền đề | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Kỹ thuật áp dụng |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_CART_001** | Giỏ hàng | Thêm sản phẩm vào giỏ hàng thành công | Đã đăng nhập tài khoản Khách hàng | 1. Vào trang Chi tiết sản phẩm ID 1<br>2. Chọn số lượng 2<br>3. Bấm "Thêm vào giỏ" | Product ID: `1`<br>Quantity: `2` | Giỏ hàng được cập nhật, tổng số lượng tăng thêm 2. HTTP 200 OK. | Normal Flow |
| **TC_CART_002** | Giỏ hàng | Thêm sản phẩm vượt quá số lượng tồn kho | Sản phẩm A chỉ còn tồn kho 5 sản phẩm | 1. Chọn số lượng 10<br>2. Bấm "Thêm vào giỏ" | Product ID: `A`<br>Quantity: `10` | Báo lỗi "Số lượng yêu cầu vượt quá tồn kho hiện có". | Giá trị biên (Boundary Value) |
| **TC_COUPON_001**| Voucher | Thu thập mã giảm giá thành công vào ví | Mã coupon `WELCOME10` đang hoạt động | 1. Truy cập trang `/vouchers`<br>2. Bấm "Thu thập" tại voucher WELCOME10 | Coupon Code: `WELCOME10` | Mã voucher được thêm vào ví cá nhân của người dùng. | State Transition |
| **TC_COUPON_002**| Voucher | Áp dụng mã giảm giá hợp lệ thành công | Đã thu thập mã `WELCOME10`, giỏ hàng có sản phẩm | 1. Vào trang Checkout<br>2. Chọn mã `WELCOME10` từ danh sách | Coupon Code: `WELCOME10` | Số tiền giảm giá được tính toán chính xác (-10%), tổng tiền thanh toán giảm tương ứng. | Normal Flow |
| **TC_CHECKOUT_001**| Checkout | Đặt hàng thành công bằng phương thức COD | Giỏ hàng có sản phẩm | 1. Nhập thông tin người nhận<br>2. Chọn phương thức COD<br>3. Bấm "Đặt hàng" | Receiver: "Nguyen Van A"<br>Phone: "0987654321"<br>Address: "Hanoi" | Đơn hàng tạo thành công với trạng thái `PENDING`, tồn kho sản phẩm tự động trừ đi. | Database Row Locking Test |
| **TC_CHECKOUT_002**| Checkout | Đặt hàng & Thanh toán qua VNPAY Sandbox | Giỏ hàng có sản phẩm | 1. Chọn phương thức VNPAY<br>2. Bấm "Thanh toán"<br>3. Nhập thẻ test NCB (`9704198526191432198`, OTP `123456`) | Card: `9704198526191432198`<br>OTP: `123456` | Điều hướng thành công sang VNPAY, thanh toán thành công và trả về trang xác nhận đơn hàng `PAID`. | Integration & E2E Testing |

---

## 👑 PHẦN 3: PHÂN HỆ QUẢN TRỊ VIÊN & THÙNG RÁC (ADMIN & RECYCLE BIN)

| Test Case ID | Feature | Mô tả Kịch bản Kiểm thử | Điều kiện tiền đề | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Kỹ thuật áp dụng |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_ADMIN_001** | Admin CRUD | Thêm mới sản phẩm thành công | Đăng nhập tài khoản `admin` | 1. Truy cập Admin Dashboard $\rightarrow$ Sản phẩm<br>2. Bấm "Thêm sản phẩm mới"<br>3. Điền thông tin & Lưu | Name: "Test Phone X"<br>Price: 15000000<br>Stock: 50 | Sản phẩm hiển thị trong danh sách Admin và trang khách hàng. | CRUD Normal Flow |
| **TC_ADMIN_002** | Admin Order| Cập nhật trạng thái đơn hàng từ `PENDING` $\rightarrow$ `CONFIRMED` | Có đơn hàng đang ở trạng thái `PENDING` | 1. Vào trang Quản lý đơn hàng<br>2. Chọn đơn hàng ID 1<br>3. Đổi trạng thái sang `CONFIRMED` | Order ID: `1`<br>Status: `CONFIRMED` | Trạng thái đơn hàng cập nhật thành công, phát sóng sự kiện qua WebSocket. | State Transition |
| **TC_ADMIN_003** | Admin Order| Hủy đơn hàng và kiểm tra tự động hoàn tồn kho | Đơn hàng đang ở trạng thái `PENDING` | 1. Chọn đơn hàng ID 1<br>2. Đổi trạng thái sang `CANCELLED` | Order ID: `1`<br>Status: `CANCELLED` | Đơn hàng đổi thành `CANCELLED`, số lượng tồn kho của các sản phẩm trong đơn được cộng hoàn lại tự động. | Business Rule Testing |
| **TC_ADMIN_004** | Recycle Bin | Xóa mềm sản phẩm và Khôi phục dữ liệu từ Thùng rác | Sản phẩm A tồn tại trong DB | 1. Xóa sản phẩm A<br>2. Vào trang Thùng rác (Recycle Bin)<br>3. Bấm "Khôi phục" (Restore) | Entity: `Product`<br>Item: `Product A` | Sản phẩm A được xóa mềm chuyển vào bảng `recycle_bin`, sau khi khôi phục dữ liệu khôi phục nguyên trạng. | Soft Delete & Recovery Test |

Mã TC Phân hệ / Màn hình Kịch bản kiểm thử (Test Scenario) Tiền điều kiện (Prerequisites) Các bước thực hiện (Test Steps) Dữ liệu kiểm thử (Test Data) Kết quả mong đợi (Expected Result) Trạng thái Ghi chú (Notes)
TC_UI_001 Đăng ký (Register) Hiển thị thông báo lỗi validate form khi để trống trường Đang ở trang Đăng ký "1. Không nhập gì
2. Bấm nút 'Đăng ký'" Không có "Hiển thị viền đỏ quanh các ô nhập liệu.
Hiển thị thông báo lỗi ngay dưới từng ô: 'Tên đăng nhập không được trống', 'Mật khẩu là bắt buộc' v.v." NOT RUN Xác thực tức thời (Real-time client-side validation).
TC_UI_002 Đăng ký (Register) Kiểm tra độ mạnh của mật khẩu (Password Strength) Đang ở trang Đăng ký "1. Nhập username, email đúng định dạng
2. Nhập mật khẩu quá đơn giản (ví dụ: '123' hoặc 'abc')
3. Bấm Đăng ký" Password: '123' Hệ thống hiển thị cảnh báo mật khẩu yếu: 'Mật khẩu phải từ 8 ký tự trở lên, bao gồm chữ hoa, chữ thường và chữ số'. Nút Đăng ký vẫn bị vô hiệu hóa. NOT RUN Đảm bảo tính bảo mật mật khẩu ở Frontend.
TC_UI_003 Đăng nhập (Login) Kiểm tra hiển thị lỗi khi đăng nhập sai thông tin Đang ở trang Đăng nhập "1. Nhập username đúng
2. Nhập password sai
3. Bấm nút 'Đăng nhập'" "Username: 'customer'
Password: 'wrong_password'" "Hiển thị thông báo Toast màu đỏ/cảnh báo đẹp mắt góc màn hình: 'Tên đăng nhập hoặc mật khẩu không chính xác'.
Trạng thái loading kết thúc, nút Đăng nhập hiển thị lại bình thường." NOT RUN Kiểm tra UX của Notification/Toast.
TC_UI_004 Đăng nhập (Login) Đăng nhập thành công và chuyển hướng thông minh "Tài khoản 'customer' có sẵn.
Đang ở trang Đăng nhập sau khi click vào giỏ hàng và bị bắt đăng nhập." "1. Điền thông tin đăng nhập đúng
2. Bấm nút 'Đăng nhập'" "Username: 'customer'
Password: 'customer123'" "Đăng nhập thành công.
Hệ thống tự động chuyển hướng người dùng quay lại màn hình giỏ hàng/thanh toán (nơi trước đó người dùng bị bắt đăng nhập) thay vì luôn quay về trang chủ." NOT RUN Trải nghiệm UX chuyển hướng thông minh (Redirect URL parameter).
TC_UI_005 Đăng nhập - Session Duy trì trạng thái đăng nhập sau khi Refresh trang (Reload Page) Đã đăng nhập thành công và đang ở Trang chủ. 1. Nhấn nút F5 (Refresh) trình duyệt F5 Refresh "Trạng thái đăng nhập được duy trì.
Header vẫn hiển thị avatar và tên user.
Giỏ hàng không bị mất hoặc bị reset về 0 (được phục hồi từ API/localStorage)." NOT RUN Kiểm tra tính bền vững của Client State (State persistence).
TC_UI_006 Đăng xuất (Logout) Đăng xuất khỏi hệ thống và xóa sạch phiên làm việc User đã đăng nhập. "1. Bấm nút 'Đăng xuất' trên Header
2. Bấm nút quay lại (Back) của trình duyệt" Nhấn nút Back trình duyệt "Hệ thống đăng xuất thành công, chuyển về trang chủ.
Khi bấm nút Back trên trình duyệt, không được hiển thị lại các trang bảo mật thông tin cá nhân (như Profile, Lịch sử đơn hàng) mà phải bắt đăng nhập lại." NOT RUN Bảo mật trình duyệt sau khi đăng xuất.
TC_UI_007 Danh sách sản phẩm Lọc sản phẩm theo nhiều danh mục cùng lúc (Multi-select) Đang ở trang danh sách sản phẩm. 1. Tích chọn đồng thời 2 danh mục trên Sidebar Filter (ví dụ: 'Điện thoại' và 'Phụ kiện') Tích chọn 'Điện thoại' & 'Phụ kiện' "Danh sách sản phẩm hiển thị các sản phẩm thuộc cả 2 nhóm này.
Số lượng sản phẩm tìm thấy cập nhật đúng trên tiêu đề (ví dụ: 'Tìm thấy 12 sản phẩm')." NOT RUN Kiểm tra component FilterSidebar.
TC_UI_008 Danh sách sản phẩm Lọc sản phẩm bằng thanh kéo Khoảng giá (Price Slider Boundary) Đang ở trang danh sách sản phẩm. "1. Kéo mốc Min về 2.000.000đ và mốc Max về 15.000.000đ
2. Nhấn Áp dụng" Khoảng giá: 2Mđ - 15Mđ "Tất cả sản phẩm hiển thị trên danh sách đều có giá nằm trong đoạn [2 triệu, 15 triệu].
Các sản phẩm ngoài khoảng bị lọc bỏ lập tức." NOT RUN Kiểm tra tính năng Price Slider lọc biên.
TC_UI_009 Tìm kiếm sản phẩm Tìm kiếm với các ký tự đặc biệt hoặc câu lệnh SQL (Sanitization Check) Đang ở Trang chủ hoặc trang danh sách. "1. Nhập vào ô tìm kiếm các ký tự đặc biệt: %,_, ', "", <script>
2. Nhấn nút tìm kiếm" Từ khóa: % hoặc <script> "Hệ thống xử lý bình thường, hiển thị trang 'Không tìm thấy sản phẩm' hoặc xử lý escape chuỗi.
Không để xảy ra lỗi giao diện trắng trang (Crash UI) hoặc lộ lỗi code backend." NOT RUN Kiểm tra tính ổn định của ô Search trên Header.
TC_UI_010 Chi tiết sản phẩm Đổi ảnh lớn khi click ảnh thu nhỏ và zoom ảnh chính Đang ở trang chi tiết sản phẩm. "1. Click lần lượt vào các ảnh thumbnail bên dưới ảnh chính
2. Rê chuột (Hover) lên ảnh chính" Click thumbnails & Hover "Ảnh chính thay đổi mượt mà tương ứng với thumbnail được click.
Khi rê chuột lên ảnh chính, xuất hiện khung zoom chi tiết phóng to ảnh sản phẩm (nếu có tính năng zoom)." NOT RUN Kiểm tra component ProductImageGallery.
TC_UI_011 Điều hướng (Navigation) Quay lại trang danh sách sản phẩm và giữ nguyên bộ lọc (State Preservation) Đang ở trang danh sách sản phẩm, đã lọc theo danh mục 'Laptop' và sắp xếp 'Giá tăng dần'. "1. Click vào 1 sản phẩm để xem chi tiết
2. Nhấn nút Back trên trình duyệt hoặc nút 'Quay lại danh sách' trên trang" Click Back "Hệ thống quay lại trang danh sách sản phẩm.
Bộ lọc 'Laptop' và sắp xếp 'Giá tăng dần' vẫn được giữ nguyên trạng thái cũ thay vì bị reset về mặc định." NOT RUN Trải nghiệm UX giữ trạng thái bộ lọc khi quay lại (State preservation).
TC_UI_012 Giỏ hàng (Drawer) Đóng/Mở CartDrawer từ cạnh phải màn hình mượt mà Đang ở trang chủ. "1. Bấm vào icon Giỏ hàng trên Header để mở CartDrawer
2. Bấm vào nút 'X' hoặc click ra vùng tối ngoài màn hình (overlay) để đóng" Click mở / đóng "CartDrawer hiển thị trượt từ cạnh phải màn hình ra với hiệu ứng animation mượt mà (không giật lag).
Khi đóng, Drawer trượt ẩn đi và overlay tối màu biến mất." NOT RUN Hiệu ứng CSS transition / Animation của CartDrawer.
TC_UI_013 Giỏ hàng (Badge) Cập nhật Badge số lượng sản phẩm trên Icon giỏ hàng lập tức Đang xem danh sách sản phẩm. "1. Nhấn nút 'Thêm vào giỏ' tại một thẻ sản phẩm
2. Quan sát icon giỏ hàng trên Header" Click thêm sản phẩm "Số badge (số nhỏ màu đỏ hiển thị số lượng sản phẩm) trên icon giỏ hàng lập tức tăng lên đúng bằng số lượng sản phẩm vừa thêm.
Có hiệu ứng rung nhẹ (micro-animation) để thu hút sự chú ý của người dùng." NOT RUN Micro-interaction & Zustand state reactivity.
TC_UI_014 Giỏ hàng - Biên Chặn thêm sản phẩm vượt quá số lượng tồn kho hiển thị Sản phẩm A trong kho chỉ còn đúng 2 cái. Giao diện chi tiết sản phẩm hiển thị 'Còn lại: 2'. "1. Nhập vào ô số lượng số 3
2. Nhấn 'Thêm vào giỏ'
3. Hoặc nhấn nút '+' trong giỏ hàng quá 2 lần" Nhập số lượng = 3 hoặc tăng quá 2 Nút '+' hoặc nút 'Thêm vào giỏ' bị disable (vô hiệu hóa) hoặc hiển thị toast cảnh báo: 'Rất tiếc, số lượng sản phẩm trong kho không đủ'. Không cho phép tăng số lượng vượt quá 2. NOT RUN Kiểm thử biên số lượng ở Frontend.
TC_UI_015 Giỏ hàng - Tốc độ Nhấp chuột liên tục nút tăng số lượng (Spam click nút +/-) Đang mở giỏ hàng và có sản phẩm. 1. Nhấp chuột liên tục cực nhanh (spam click) vào nút '+' tăng số lượng sản phẩm. Spam click nút '+' 10 lần liên tục "Hệ thống xử lý debounce/throttle hợp lý.
Giao diện hiển thị trạng thái loading nhỏ (spinner) tại hàng sản phẩm đó.
Tổng tiền cập nhật chính xác sau khi kết thúc lượt click cuối cùng, không bị hiển thị sai số tiền hoặc bị lỗi trùng lặp request lên server." NOT RUN Xử lý tương tác bất đồng bộ tốc độ cao (Race conditions/Spam click).
TC_UI_016 Giỏ hàng - Xóa Modal xác nhận khi xóa sản phẩm khỏi giỏ hàng Đang mở giỏ hàng. 1. Bấm nút 'Xóa' (biểu tượng thùng rác) bên cạnh sản phẩm Click xóa "Hiển thị một modal xác nhận nhỏ: 'Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng không?' thay vì xóa ngay lập tức tránh việc người dùng bấm nhầm.
Nếu chọn 'Có', sản phẩm biến mất và tổng tiền cập nhật." NOT RUN Trải nghiệm UX cảnh báo trước khi xóa dữ liệu.
TC_UI_017 Giỏ hàng - Voucher Phản hồi trực quan của ô nhập mã giảm giá (Coupon Input Feedback) Đang ở trang giỏ hàng. "1. Nhập mã voucher sai định dạng
2. Nhấn Áp dụng
3. Nhập mã voucher đúng
4. Nhấn Áp dụng" Mã sai: 'XYZ' | Mã đúng: 'WELCOME10' "Khi nhập sai: Ô nhập viền đỏ, hiển thị text báo lỗi màu đỏ 'Mã giảm giá không hợp lệ'.
Khi nhập đúng: Ô nhập hiển thị viền xanh lá, hiển thị text báo thành công 'Áp dụng mã WELCOME10 thành công (-10%)'." NOT RUN Kiểm tra component CouponInput.
TC_UI_018 Thanh toán Nhớ thông tin đã điền khi tải lại trang Checkout (Page Reload) Đang điền thông tin giao hàng tại trang Thanh toán. "1. Điền Họ tên và SĐT nhận hàng
2. Nhấn F5 để tải lại trang" Điền thông tin và F5 Các trường Họ tên và SĐT đã điền trước đó được lưu trữ tạm thời (ví dụ trong LocalState hoặc LocalStorage) và tự động điền lại vào form sau khi trang tải xong, giúp khách hàng đỡ phải nhập lại từ đầu. NOT RUN Nâng cao UX tránh mất mát thông tin khi tải lại trang.
TC_UI_019 Thanh toán Tự động cuộn màn hình tới vị trí lỗi đầu tiên khi validate thất bại Trang Checkout dài có nhiều trường nhập liệu kéo dài qua màn hình chính. "1. Bỏ trống trường 'Số điện thoại' ở phía trên nhưng điền đầy đủ thông tin bên dưới
2. Cuộn xuống cuối trang và bấm 'Đặt hàng'" Bấm đặt hàng khi thiếu trường phía trên Màn hình tự động cuộn ngược lên trên (Smooth Scroll) tới ô 'Số điện thoại' đang bị lỗi và highlight viền đỏ để người dùng nhận diện lỗi ngay lập tức. NOT RUN Trải nghiệm UX tự động scroll to error.
TC_UI_020 Thanh toán Mất kết nối mạng đột ngột khi bấm Đặt hàng (Network Offline Check) Đang ở trang Checkout chuẩn bị đặt hàng. "1. Ngắt kết nối mạng (hoặc chuyển sang chế độ Offline trên DevTools)
2. Nhấn nút 'Đặt hàng'" Chế độ Offline mạng Nút đặt hàng chuyển sang hiển thị lỗi mạng hoặc xuất hiện Toast màu đỏ thông báo: 'Không có kết nối internet. Vui lòng kiểm tra lại đường truyền mạng của bạn'. Không làm crash ứng dụng. NOT RUN Xử lý lỗi mạng đột ngột (Offline mode/Network resilient).
TC_UI_021 Thanh toán Vô hiệu hóa nút Đặt hàng sau khi click lần đầu (Double Click Protection) Đang ở trang Checkout. "1. Nhấn nút 'Đặt hàng'
2. Quan sát trạng thái nút đặt hàng" Click Đặt hàng "Nút 'Đặt hàng' ngay lập tức bị vô hiệu hóa (disabled), hiển thị text 'Đang xử lý...' cùng icon xoay loading.
Người dùng không thể click tiếp lần 2 trong khi request đang gửi đi, ngăn chặn tạo 2 đơn hàng trùng lặp." NOT RUN Chống double-click ở giao diện Frontend.
TC_UI_022 Thanh toán - Hoàn thành Trang thông báo Đặt hàng thành công hiển thị thông tin rõ ràng Vừa đặt đơn hàng thành công. 1. Quan sát màn hình xác nhận đơn hàng thành công Không có "Hiển thị ảnh minh hoạ thành công, hiển thị Mã đơn hàng rõ ràng, hướng dẫn các bước tiếp theo.
Có nút 'Tiếp tục mua sắm' (chuyển về Trang chủ) và 'Xem đơn hàng của tôi' (chuyển về danh sách đơn hàng)." NOT RUN Giao diện cảm ơn & hướng dẫn sau mua hàng.
TC_UI_023 Đơn hàng của tôi Hiển thị đúng trạng thái đơn hàng trên Stepper trực quan Đang xem đơn hàng có trạng thái là CONFIRMED (Đã xác nhận). "1. Truy cập trang đơn hàng cá nhân
2. Quan sát stepper trạng thái đơn" Đơn hàng CONFIRMED "OrderStatusStepper hiển thị trực quan các bước: Chờ xác nhận -> Đã xác nhận -> Đang giao -> Đã giao.
Bước 1 và Bước 2 sáng màu xanh lá hiển thị đã hoàn thành. Bước 3 và 4 ở trạng thái mờ (chưa tới)." NOT RUN Kiểm tra component OrderStatusStepper.
TC_UI_024 Admin - Bảo mật Chặn truy cập trang Admin bằng URL trực tiếp đối với khách thường Đang đăng nhập bằng tài khoản khách hàng thường. "1. Nhập trực tiếp đường dẫn `/admin` hoặc `/admin/products` lên thanh địa chỉ trình duyệt
2. Nhấn Enter" Gõ URL /admin Hệ thống chặn truy cập, hiển thị trang lỗi 403 Forbidden hoặc tự động redirect về trang chủ kèm Toast cảnh báo: 'Bạn không có quyền truy cập vào trang quản trị'. NOT RUN Kiểm tra bảo mật Route (Protected Routes) của React Router v6.
TC_UI_025 Admin - CRUD Admin thêm sản phẩm mới - Tải lên ảnh quá dung lượng cho phép Đang ở trang thêm sản phẩm admin. "1. Tại trường ảnh sản phẩm, upload file hình ảnh có dung lượng lớn hơn 5MB (ví dụ: 10MB)
2. Hoặc upload file không phải là hình ảnh (ví dụ: file .exe, .zip)" File hình ảnh 10MB hoặc file .zip "Hệ thống chặn tải lên ở Client.
Hiển thị cảnh báo lỗi màu đỏ ngay lập tức: 'Dung lượng ảnh tối đa cho phép là 5MB' hoặc 'Định dạng file không được hỗ trợ (Chỉ cho phép JPG, PNG)'. Nút lưu bị khoá." NOT RUN Xác thực tệp tải lên tại giao diện Admin.
TC_UI_026 Admin - CRUD Admin thêm sản phẩm mới - Xem trước hình ảnh đã chọn (Image Preview) Đang ở trang thêm sản phẩm admin. "1. Nhấn nút chọn file ảnh tải lên từ máy tính
2. Chọn 1 file ảnh hợp lệ" Chọn ảnh 'iphone.jpg' Giao diện lập tức hiển thị ảnh thu nhỏ (preview) của file ảnh vừa chọn để Admin xác nhận hình ảnh trước khi nhấn nút lưu sản phẩm chính thức lên database. NOT RUN Tính năng Image Preview trước khi upload.
TC_UI_027 Admin - CRUD Admin sửa sản phẩm - Hiển thị đầy đủ thông tin cũ trên Form sửa Đã có sản phẩm tồn tại. "1. Bấm nút 'Sửa' (Edit) sản phẩm 'Sofa Da'
2. Quan sát các ô nhập liệu của form sửa" Sửa sản phẩm Sofa Da "Form sửa sản phẩm hiện lên và tự động điền đầy đủ (pre-fill) thông tin hiện tại của sản phẩm đó: Tên sản phẩm, giá bán cũ, mô tả cũ, hình ảnh cũ hiển thị ở ô preview.
Admin không phải nhập lại từ đầu." NOT RUN Kiểm tra prepopulated values trong React Hook Form.
TC_UI_028 Admin - CRUD Admin xóa sản phẩm - Cảnh báo ràng buộc đơn hàng Sản phẩm A đang có trong một số đơn hàng của khách hàng đang chờ xử lý. "1. Tại danh sách sản phẩm admin, chọn xóa sản phẩm A
2. Quan sát thông điệp modal cảnh báo hiện ra" Xóa sản phẩm có đơn hàng active Modal cảnh báo hiện thông điệp chi tiết: 'Sản phẩm này đang tồn tại trong các đơn hàng chưa hoàn thành. Việc xóa sản phẩm có thể ảnh hưởng tới lịch sử mua hàng. Bạn vẫn muốn tiếp tục?' để Admin lưu ý hậu quả. NOT RUN Cảnh báo bảo toàn tham chiếu dữ liệu.
TC_UI_029 Admin - Orders Admin cập nhật trạng thái đơn hàng của khách "Có đơn hàng của khách đang ở trạng thái 'PENDING'.
Đang ở giao diện quản lý đơn hàng admin." "1. Click chọn cập nhật trạng thái đơn sang 'CONFIRMED'
2. Nhấn lưu
3. Đăng nhập tài khoản khách hàng, vào lịch sử đơn" Đổi PENDING -> CONFIRMED "Admin cập nhật trạng thái đơn thành công, hiển thị Toast xanh lá.
Phía khách hàng lập tức nhìn thấy trạng thái đơn hàng chuyển sang 'Đã xác nhận' trên stepper của họ." NOT RUN Luồng đồng bộ dữ liệu hai phía khách hàng - quản trị.
TC_UI_030 Đồng bộ - Browser Tabs Đồng bộ giỏ hàng thời gian thực giữa các Tabs trình duyệt Người dùng đăng nhập tài khoản khách hàng ở cả 2 Tab trình duyệt (Tab A và Tab B) cùng mở AstraShop. "1. Tại Tab A, bấm thêm 1 sản phẩm vào giỏ hàng
2. Chuyển sang Tab B và quan sát icon giỏ hàng và CartDrawer (không reload Tab B)" Thêm sản phẩm tại Tab A Tab B tự động cập nhật số lượng badge giỏ hàng và danh sách sản phẩm trong giỏ hàng tương ứng mà người dùng không cần phải bấm F5 tải lại trang Tab B. NOT RUN Kiểm tra đồng bộ State qua Storage Event hoặc state sync (Zustand persist middleware / Broadcast Channel).
TC_UI_031 Giỏ hàng - Hết hàng đột ngột Xử lý khi sản phẩm trong giỏ hàng bị hết hàng đột ngột trước khi bấm mua "Người dùng thêm sản phẩm A (số lượng 1) vào giỏ hàng.
Ngay sau đó, Admin cập nhật số lượng tồn kho sản phẩm A về 0." "1. Mở trang Giỏ hàng hoặc trang Thanh toán (sản phẩm A vẫn nằm trong giỏ từ trước)
2. Quan sát giao diện hàng sản phẩm A và nút đặt hàng" Sản phẩm A hết hàng trong kho "Hàng sản phẩm A trong giỏ hiển thị nhãn màu đỏ 'Hết hàng'.
Nút 'Đặt hàng' bị vô hiệu hóa hoặc hệ thống hiển thị thông điệp yêu cầu loại bỏ sản phẩm hết hàng khỏi giỏ trước khi thực hiện thanh toán." NOT RUN Xử lý kiểm tra tồn kho thời gian thực trước khi checkout.
 Mã TC Phân hệ / Chức năng Kịch bản kiểm thử (Test Scenario) Tiền điều kiện (Prerequisites) Các bước thực hiện (Test Steps) Dữ liệu kiểm thử (Test Data) Kết quả mong đợi (Expected Result) Trạng thái Ghi chú (Notes)
 TC_API_001 Auth - Đăng ký Đăng ký tài khoản khách hàng (Success) Username và Email chưa từng đăng ký trên hệ thống. "1. Gửi request POST tới /api/auth/register
 2. Body chứa đầy đủ thông tin hợp lệ" "{
   ""username"": ""tester_qa_01"",
   ""email"": ""<tester_qa_01@gmail.com>"",
   ""password"": ""Password123!"",
   ""fullName"": ""QA Tester 01"",
   ""phone"": ""0981234567"",
   ""address"": ""456 Đường CMT8, TP.HCM""
 }" "HTTP Status: 200 OK hoặc 201 Created
 Response JSON trả về thông điệp thành công và thông tin user vừa tạo (không bao gồm password). Dữ liệu được ghi nhận vào database." NOT RUN Kiểm thử luồng đăng ký cơ bản.
 TC_API_002 Auth - Đăng nhập Đăng nhập bằng tài khoản vừa tạo để lấy Token JWT (Success) Tài khoản 'tester_qa_01' đã được đăng ký thành công. "1. Gửi request POST tới /api/auth/login
 2. Body chứa thông tin đăng nhập đúng" "{
   ""usernameOrEmail"": ""tester_qa_01"",
   ""password"": ""Password123!""
 }" "HTTP Status: 200 OK
 Trả về Token JWT và Refresh Token. Token chứa các claims đúng (sub, roles, exp)." NOT RUN Token này được lưu trữ để thực hiện các test case sau.
 TC_API_003 Auth - Đăng ký Đăng ký tài khoản khi thiếu các trường bắt buộc (Validation Fail) Không có "1. Gửi request POST tới /api/auth/register
 2. Body để trống các trường bắt buộc: username, email, password" "{
   ""username"": """",
   ""email"": """",
   ""password"": """",
   ""fullName"": ""Tester No Fields"",
   ""phone"": """",
   ""address"": """"
 }" "HTTP Status: 400 Bad Request
 Response chứa chi tiết lỗi validation cụ thể cho từng trường (ví dụ: 'Username không được để trống', 'Email không hợp lệ')." NOT RUN Kiểm tra ràng buộc dữ liệu tại tầng DTO (Bean Validation).
 TC_API_004 Auth - Đăng ký Đăng ký với username đã tồn tại (Duplicate Fail) Tài khoản 'tester_qa_01' đã tồn tại. "1. Gửi request POST tới /api/auth/register
 2. Body sử dụng username 'tester_qa_01' nhưng email mới" "{
   ""username"": ""tester_qa_01"",
   ""email"": ""<tester_qa_new@gmail.com>"",
   ""password"": ""Password123!"",
   ""fullName"": ""QA Tester Trùng"",
   ""phone"": ""0981234567""
 }" "HTTP Status: 400 Bad Request
 Response trả về lỗi nghiệp vụ rõ ràng, ví dụ: 'Username đã tồn tại'. CSDL không bị ghi đè." NOT RUN Kiểm tra xử lý trùng lặp khoá chính.
 TC_API_005 Auth - Đăng ký Đăng ký với email đã tồn tại (Duplicate Fail) Tài khoản với email '<tester_qa_01@gmail.com>' đã tồn tại. "1. Gửi request POST tới /api/auth/register
 2. Body sử dụng email '<tester_qa_01@gmail.com>' nhưng username mới" "{
   ""username"": ""tester_qa_unique"",
   ""email"": ""<tester_qa_01@gmail.com>"",
   ""password"": ""Password123!"",
   ""fullName"": ""QA Tester Trùng Email""
 }" "HTTP Status: 400 Bad Request
 Response trả về lỗi: 'Email đã được sử dụng'." NOT RUN Đảm bảo tính duy nhất của Email trên hệ thống.
 TC_API_006 Auth - Đăng ký Đăng ký với định dạng Email sai quy chuẩn (Regex Validation) Không có "1. Gửi request POST tới /api/auth/register
 2. Gửi email thiếu ký tự '@' hoặc sai định dạng" "{
   ""username"": ""tester_email_fail"",
   ""email"": ""tester_invalid_email.com"",
   ""password"": ""Password123!"",
   ""fullName"": ""QA Email Fail""
 }" "HTTP Status: 400 Bad Request
 Response thông báo lỗi validate: 'Email không hợp lệ'." NOT RUN Kiểm tra bộ lọc Regex định dạng email.
 TC_API_007 Auth - Đăng ký Đăng ký với định dạng Số điện thoại sai quy chuẩn (Regex Validation) Không có "1. Gửi request POST tới /api/auth/register
 2. Gửi số điện thoại ít hơn 10 số hoặc chứa chữ cái" "{
   ""username"": ""tester_phone_fail"",
   ""email"": ""<tester_phone@gmail.com>"",
   ""password"": ""Password123!"",
   ""fullName"": ""QA Phone Fail"",
   ""phone"": ""098123abc""
 }" "HTTP Status: 400 Bad Request
 Response trả về lỗi validation: 'Số điện thoại phải bao gồm 10 chữ số'." NOT RUN Kiểm tra validation định dạng SĐT.
 TC_API_008 Auth - Đăng nhập Đăng nhập với mật khẩu sai (Security Fail) Tài khoản 'tester_qa_01' đã tồn tại. "1. Gửi request POST tới /api/auth/login
 2. Body điền username đúng nhưng password sai" "{
   ""usernameOrEmail"": ""tester_qa_01"",
   ""password"": ""WrongPassword123""
 }" "HTTP Status: 400 Bad Request hoặc 401 Unauthorized
 Response trả về lỗi đăng nhập sai thông tin. Không lộ lý do cụ thể do sai pass hay sai user để bảo mật thông tin." NOT RUN Kiểm tra xử lý đăng nhập thất bại.
 TC_API_009 Auth - Đăng nhập Đăng nhập với tài khoản không tồn tại (Security Fail) Tài khoản 'non_existent_user' chưa từng được đăng ký. "1. Gửi request POST tới /api/auth/login
 2. Body điền username không tồn tại" "{
   ""usernameOrEmail"": ""non_existent_user"",
   ""password"": ""Password123!""
 }" "HTTP Status: 400 Bad Request hoặc 401 Unauthorized
 Thông báo lỗi sai thông tin đăng nhập." NOT RUN Đảm bảo không bị khai thác thông tin tài khoản.
 TC_API_010 An toàn thông tin Truy cập tài nguyên cần bảo mật mà không gửi kèm Token (Auth Fail) Không có "1. Gửi request GET tới /api/cart
 2. Không đính kèm header Authorization" Headers không có Authorization "HTTP Status: 401 Unauthorized hoặc 403 Forbidden
 Hệ thống từ chối truy cập và trả về cấu trúc lỗi JSON tiêu chuẩn." NOT RUN Bảo mật tài nguyên giỏ hàng riêng tư.
 TC_API_011 An toàn thông tin Truy cập với Token JWT đã hết hạn hoặc không hợp lệ (Session Fail) Không có "1. Gửi request GET tới /api/cart
 2. Đính kèm header Authorization chứa token giả lập hoặc đã hết hạn" Authorization: Bearer invalid_jwt_token_here "HTTP Status: 401 Unauthorized hoặc 403 Forbidden
 Từ chối truy cập vì token không vượt qua vòng verify chữ ký số JWT." NOT RUN Xác thực tính hợp lệ của token JWT.
 TC_API_012 Phân quyền (RBAC) Tài khoản CUSTOMER cố gắng truy cập API của ADMIN (Role Fail) Đã đăng nhập tài khoản thường 'tester_qa_01' và lấy token. "1. Gửi request GET tới /api/admin/dashboard hoặc POST tới /api/admin/products
 2. Đính kèm header Authorization: Bearer {customer_token}" Authorization: Bearer {token_cua_tester_qa_01} "HTTP Status: 403 Forbidden
 Từ chối quyền truy cập do tài khoản không có quyền ROLE_ADMIN." NOT RUN Đảm bảo phân quyền RBAC hoạt động chính xác.
 TC_API_013 Catalog - Sản phẩm Lấy danh sách sản phẩm có Phân trang và Sắp xếp (Success) CSDL đã được seed dữ liệu sản phẩm. "1. Gửi request GET tới /api/products
 2. Gửi các query parameters: page=0, size=5, sortBy=price, direction=desc" Query params: ?page=0&size=5&sortBy=price&direction=desc "HTTP Status: 200 OK
 Trả về danh sách 5 sản phẩm đầu tiên có giá từ cao xuống thấp. JSON chứa metadata phân trang: totalElements, totalPages, isLast." NOT RUN Kiểm tra tính năng phân trang tại backend.
 TC_API_014 Catalog - Sản phẩm Lấy danh sách sản phẩm theo Danh mục (Success) Có danh mục ID = 1 và chứa sản phẩm. "1. Gửi request GET tới /api/products
 2. Gửi query param: categoryId=1" Query params: ?categoryId=1 "HTTP Status: 200 OK
 Trả về danh sách sản phẩm thuộc danh mục ID = 1." NOT RUN Lọc sản phẩm theo danh mục ở Backend.
 TC_API_015 Catalog - Sản phẩm Xem chi tiết sản phẩm bằng ID hợp lệ (Success) Sản phẩm ID = 1 tồn tại. 1. Gửi request GET tới /api/products/1 Không có "HTTP Status: 200 OK
 Trả về đầy đủ thông tin chi tiết sản phẩm bao gồm tên, giá, số lượng tồn kho, danh mục, list hình ảnh phụ." NOT RUN API xem chi tiết sản phẩm.
 TC_API_016 Catalog - Sản phẩm Xem chi tiết sản phẩm với ID không tồn tại (Fail) Không tồn tại sản phẩm ID = 99999. 1. Gửi request GET tới /api/products/99999 Không có "HTTP Status: 404 Not Found
 Trả về thông báo lỗi: 'Không tìm thấy sản phẩm có ID 99999'." NOT RUN Kiểm tra xử lý Exception ResourceNotFound.
 TC_API_017 Catalog - Sản phẩm Xem chi tiết sản phẩm với ID sai định dạng (Fail) Không có 1. Gửi request GET tới /api/products/abc Không có "HTTP Status: 400 Bad Request
 Trả về lỗi định dạng dữ liệu (MethodArgumentTypeMismatchException)." NOT RUN Kiểm tra xử lý lỗi ép kiểu dữ liệu URL.
 TC_API_018 Giỏ hàng - Cart Thêm sản phẩm vào giỏ hàng thành công (Success) "Đã đăng nhập (Bearer Token)
 Sản phẩm ID = 1 còn hàng trong kho." "1. Gửi request POST tới /api/cart/add
 2. Header Authorization: Bearer {token}
 3. Body JSON chứa productId=1 và quantity=2" "{
   ""productId"": 1,
   ""quantity"": 2
 }" "HTTP Status: 200 OK
 Giỏ hàng được cập nhật. Trả về thông tin giỏ hàng mới bao gồm sản phẩm ID=1 với số lượng là 2 và tổng tiền được tính đúng." NOT RUN Thêm giỏ hàng tiêu chuẩn.
 TC_API_019 Giỏ hàng - Cart Thêm vào giỏ hàng với số lượng âm (Fail) Đã đăng nhập (Bearer Token) "1. Gửi request POST tới /api/cart/add
 2. Body chứa quantity là số âm (ví dụ: -3)" "{
   ""productId"": 1,
   ""quantity"": -3
 }" "HTTP Status: 400 Bad Request
 Thông báo lỗi validate: 'Số lượng thêm vào giỏ hàng phải lớn hơn 0'." NOT RUN Kiểm tra Bean Validation kiểm soát số lượng giỏ hàng.
 TC_API_020 Giỏ hàng - Cart Thêm vào giỏ hàng với số lượng lớn hơn số lượng tồn kho (Fail) "Đã đăng nhập (Bearer Token)
 Sản phẩm ID = 1 chỉ còn tồn kho 5 sản phẩm." "1. Gửi request POST tới /api/cart/add
 2. Body chứa quantity = 10" "{
   ""productId"": 1,
   ""quantity"": 10
 }" "HTTP Status: 400 Bad Request
 Thông báo lỗi nghiệp vụ rõ ràng: 'Không thể thêm sản phẩm vượt quá số lượng tồn kho còn lại (Tồn kho: 5)'." NOT RUN Kiểm thử ràng buộc logic tồn kho khi thêm giỏ hàng.
 TC_API_021 Voucher - Coupon Áp dụng mã giảm giá hợp lệ vào giỏ hàng (Success) "Đã đăng nhập (Bearer Token)
 Giỏ hàng đang có sản phẩm (tổng tiền 500k)
 Mã WELCOME10 còn hạn và chưa sử dụng." "1. Gửi request POST tới /api/coupons/apply
 2. Body JSON chứa coupon code hợp lệ" "{
   ""code"": ""WELCOME10""
 }" "HTTP Status: 200 OK
 Trả về thông tin giỏ hàng mới có giảm giá 10% (giảm 50k, tổng tiền cần thanh toán còn 450k)." NOT RUN Mã giảm giá WELCOME10 giảm 10%.
 TC_API_022 Voucher - Coupon Áp dụng mã giảm giá đã hết hạn sử dụng (Fail) "Đã đăng nhập (Bearer Token)
 Giỏ hàng đang có sản phẩm
 Mã EXPIRED50 đã hết hạn." "1. Gửi request POST tới /api/coupons/apply
 2. Body chứa mã đã hết hạn" "{
   ""code"": ""EXPIRED50""
 }" "HTTP Status: 400 Bad Request
 Response trả về lỗi: 'Mã giảm giá đã hết hạn sử dụng'. Tổng tiền thanh toán không đổi." NOT RUN Kiểm thử ràng buộc thời gian hiệu lực coupon.
 TC_API_023 Voucher - Coupon Áp dụng mã giảm giá không tồn tại trên hệ thống (Fail) "Đã đăng nhập (Bearer Token)
 Giỏ hàng đang có sản phẩm." "1. Gửi request POST tới /api/coupons/apply
 2. Body chứa mã coupon giả" "{
   ""code"": ""FAKECOUPON""
 }" "HTTP Status: 400 Bad Request hoặc 404 Not Found
 Thông báo lỗi: 'Mã giảm giá không tồn tại'." NOT RUN Kiểm tra xử lý lỗi coupon không tồn tại.
 TC_API_024 Voucher - Coupon Áp dụng mã giảm giá khi giỏ hàng trống (Fail) "Đã đăng nhập (Bearer Token)
 Giỏ hàng trống rỗng." "1. Gửi request POST tới /api/coupons/apply
 2. Gửi mã coupon WELCOME10" "{
   ""code"": ""WELCOME10""
 }" "HTTP Status: 400 Bad Request
 Response báo lỗi: 'Giỏ hàng trống, không thể áp dụng mã giảm giá'." NOT RUN Ràng buộc logic giỏ hàng trống.
 TC_API_025 Đơn hàng - Order Đặt hàng thành công với thông tin nhận hàng hợp lệ (Success) "Đã đăng nhập (Bearer Token)
 Giỏ hàng đang có sản phẩm." "1. Gửi request POST tới /api/orders
 2. Body chứa đầy đủ thông tin giao hàng" "{
   ""couponCode"": ""WELCOME10"",
   ""shippingName"": ""Nguyễn Văn Tester"",
   ""shippingAddress"": ""123 Đường Láng, Đống Đa, Hà Nội"",
   ""shippingPhone"": ""0981112222"",
   ""note"": ""Giao giờ hành chính""
 }" "HTTP Status: 200 OK (hoặc 201 Created)
 Đơn hàng được tạo thành công với trạng thái PENDING.
 Giỏ hàng được làm rỗng.
 Số lượng tồn kho sản phẩm tương ứng giảm đi đúng bằng số lượng đặt." NOT RUN Kiểm tra luồng đặt hàng hoàn chỉnh.
 TC_API_026 Đơn hàng - Order Đặt hàng khi thiếu thông tin giao hàng bắt buộc (Fail) "Đã đăng nhập (Bearer Token)
 Giỏ hàng đang có sản phẩm." "1. Gửi request POST tới /api/orders
 2. Body thiếu địa chỉ hoặc SĐT nhận hàng" "{
   ""couponCode"": """",
   ""shippingName"": ""Nguyễn Văn A"",
   ""shippingAddress"": """",
   ""shippingPhone"": """",
   ""note"": """"
 }" "HTTP Status: 400 Bad Request
 Thông báo lỗi validate: 'Địa chỉ giao hàng không được để trống' và 'Số điện thoại không được để trống'." NOT RUN Bean Validation cho các trường giao hàng.
 TC_API_027 Đơn hàng - Order Đặt hàng khi giỏ hàng trống (Fail) "Đã đăng nhập (Bearer Token)
 Giỏ hàng trống." "1. Gửi request POST tới /api/orders
 2. Body điền đủ thông tin giao nhận" "{
   ""couponCode"": """",
   ""shippingName"": ""Người Nhận"",
   ""shippingAddress"": ""Hà Nội"",
   ""shippingPhone"": ""0987654321""
 }" "HTTP Status: 400 Bad Request
 Thông báo lỗi: 'Không thể đặt hàng do giỏ hàng của bạn đang trống'." NOT RUN Chặn tạo đơn hàng ảo rỗng.
 TC_API_028 Đơn hàng - An toàn Đặt hàng liên tiếp nhiều lần (Idempotency / Double Submit Check) "Đã đăng nhập (Bearer Token)
 Giỏ hàng đang có sản phẩm." 1. Gửi đồng thời hoặc liên tiếp cực nhanh 2 request tạo đơn hàng (POST /api/orders) với cùng một token và cùng giỏ hàng. Gửi 2 request trùng lặp trong thời gian < 100ms "Chỉ có 1 request đầu tiên thành công và tạo ra 1 đơn hàng duy nhất.
 Request thứ 2 bị từ chối với lỗi 400 Bad Request (hoặc 409 Conflict) do giỏ hàng đã bị xóa sau đơn hàng đầu tiên." NOT RUN Tránh lỗi double-charge và trùng lặp đơn hàng trên mạng chậm.
 TC_API_029 Đánh giá - Review Gửi đánh giá sản phẩm đã mua thành công (Success) "Đã đăng nhập.
 Đã mua sản phẩm ID = 1 và đơn hàng chuyển sang trạng thái thành công (DELIVERED)." "1. Gửi request POST tới /api/reviews
 2. Body chứa productId=1, rating=5, comment='Rất tốt'" "{
   ""productId"": 1,
   ""rating"": 5,
   ""comment"": ""Sản phẩm dùng rất tốt, đáng tiền!""
 }" "HTTP Status: 200 OK
 Đánh giá được lưu thành công. Điểm đánh giá trung bình của sản phẩm cập nhật." NOT RUN Luồng đánh giá tiêu chuẩn.
 TC_API_030 Đánh giá - Review Gửi đánh giá sản phẩm chưa mua hoặc chưa nhận hàng (Fail) "Đã đăng nhập.
 Sản phẩm ID = 2 chưa từng được mua hoặc đơn hàng chưa được giao thành công." "1. Gửi request POST tới /api/reviews
 2. Body gửi đánh giá cho sản phẩm ID = 2" "{
   ""productId"": 2,
   ""rating"": 4,
   ""comment"": ""Mới xem qua chưa mua nhưng vote 4 sao""
 }" "HTTP Status: 400 Bad Request
 Response thông báo lỗi nghiệp vụ rõ ràng: 'Bạn không thể đánh giá sản phẩm chưa mua hoặc chưa giao thành công'." NOT RUN Ràng buộc nghiệp vụ chỉ cho phép người mua đánh giá.
 TC_API_031 Đánh giá - Review Gửi đánh giá với số sao (rating) nằm ngoài khoảng 1-5 (Boundary Fail) Đã đăng nhập và đã mua sản phẩm ID = 1. "1. Gửi request POST tới /api/reviews
 2. Body gửi rating là 6 hoặc 0" "{
   ""productId"": 1,
   ""rating"": 6,
   ""comment"": ""Cực tốt""
 }" "HTTP Status: 400 Bad Request
 Thông báo lỗi validate: 'Điểm đánh giá phải nằm trong khoảng từ 1 đến 5'." NOT RUN Kiểm thử biên điểm đánh giá.
 TC_API_032 An toàn - Bảo mật SQL Injection tại ô tìm kiếm hoặc đăng nhập (Attack Check) Không có "1. Gửi request GET tới /api/products với query search chứa mã SQL độc hại
 2. Hoặc gửi request POST đăng nhập chứa câu lệnh SQL Bypass" "Username: admin' OR '1'='1
 Search Query: ?search=abc' UNION SELECT NULL, username, password FROM users--" "Hệ thống không bị sập (Internal Server Error).
 Không trả về bất kỳ lỗi SQL nào hiển thị cấu trúc database.
 Không bypass được đăng nhập (trả về lỗi xác thực thông thường)." NOT RUN Kiểm thử khả năng chống SQL Injection của Spring Data JPA / Hibernate.
 TC_API_033 An toàn - Bảo mật Cross-Site Scripting (XSS) payload trong nội dung bình luận (Attack Check) Đã đăng nhập và đủ điều kiện đánh giá sản phẩm ID = 1. "1. Gửi request POST tới /api/reviews
 2. Nội dung comment chứa mã script JavaScript độc hại" "{
   ""productId"": 1,
   ""rating"": 5,
   ""comment"": ""<script>alert('xss');</script>""
 }" "Hệ thống lưu trữ thành công nhưng mã HTML/JS phải được mã hóa dạng entities trước khi lưu hoặc lọc bỏ script (Sanitize).
 Khi lấy dữ liệu review ra hiển thị, trình duyệt hiển thị nguyên văn chuỗi văn bản chứ không thực thi mã alert." NOT RUN Chống tấn công XSS chèn mã độc vào cơ sở dữ liệu.
 TC_API_034 An toàn - IDOR Xem giỏ hàng hoặc chi tiết đơn hàng của tài khoản khác bằng cách đổi ID (IDOR Check) Có tài khoản A (đơn hàng ID = 10) và tài khoản B (đang đăng nhập bằng Token B). "1. Sử dụng Token của tài khoản B
 2. Gửi request GET tới /api/orders/10 (Đơn hàng của A)" "Header Authorization: Bearer {token_B}
 URL endpoint: /api/orders/10" "HTTP Status: 403 Forbidden hoặc 404 Not Found
 Tuyệt đối không trả về thông tin đơn hàng của tài khoản A cho tài khoản B." NOT RUN Kiểm thử lỗ hổng phân quyền ngang (Insecure Direct Object Reference).
