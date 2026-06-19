 đây là phần thầy yêu cầu :6. Xây dựng Fullstack cho Hệ thống Thương mại Điện tử Mini

1. Giới thiệu đề tài
Đề tài tập trung vào hệ thống bán hàng trực tuyến quy mô nhỏ với đầy đủ thành phần: danh mục sản phẩm, tồn kho, giỏ hàng, đơn hàng, coupon và đánh giá.
2. Phần Backend (Spring Boot 4)
Yêu cầu kỹ thuật: Spring Boot 4, Spring Web, Spring Security, Spring Data JPA, PostgreSQL , mysql, Flyway, Bean Validation, Swagger/OpenAPI, JUnit/MockMvc. Xác thực JWT + Refresh Token, phân quyền RBAC, phân trang/lọc/sắp xếp, xử lý lỗi tập trung.
Sinh viên cần thiết kế đầy đủ các nhóm API nghiệp vụ, lược đồ CSDL chuẩn hóa, bộ test API tối thiểu 8 trường hợp kiểm thử chính và tài liệu Swagger/OpenAPI. Chi tiết yêu cầu backend theo từng đề tài tham chiếu tài liệu gốc.
3. Phần Frontend (React 18 + TypeScript)
3.1 Mô tả giao diện
Giao diện mua sắm thân thiện với UX tốt: duyệt sản phẩm theo danh mục, tìm kiếm, lọc, thêm vào giỏ hàng và thanh toán. Quản trị viên có dashboard quản lý sản phẩm, đơn hàng và coupon.
3.2 Công nghệ Frontend
React 18 + TypeScript, Vite, TailwindCSS, React Query, React Router v6, Axios, Zustand (cart state), React Hook Form.
3.3 Các trang và màn hình cần xây dựng
• Trang chủ – Banner quảng cáo, danh mục nổi bật, sản phẩm bán chạy
• Trang danh sách sản phẩm – Lọc theo danh mục, giá, thương hiệu; sắp xếp; phân trang
• Trang chi tiết sản phẩm – Ảnh sản phẩm, mô tả, đánh giá, nút thêm giỏ hàng
• Trang giỏ hàng – Danh sách sản phẩm, chỉnh số lượng, xóa, nhập mã coupon, tổng tiền
• Trang thanh toán – Form địa chỉ, xác nhận đơn hàng, thanh toán mô phỏng
• Trang đơn hàng của tôi – Lịch sử đơn, trạng thái, chi tiết đơn hàng
• Admin – CRUD sản phẩm, quản lý danh mục, coupon, đơn hàng và tồn kho
3.4 Các component chính cần hiện thực
• ProductCard – Thẻ sản phẩm với ảnh, giá, badge giảm giá và nút thêm giỏ nhanh
• FilterSidebar – Lọc theo danh mục, khoảng giá (slider), thương hiệu
• CartDrawer – Drawer giỏ hàng từ cạnh phải màn hình, cập nhật số lượng tức thì
• CouponInput – Ô nhập mã giảm giá với feedback hợp lệ/không hợp lệ
• OrderStatusStepper – Các bước trạng thái đơn hàng dạng stepper trực quan
• ProductImageGallery – Bộ ảnh sản phẩm có thumbnail click để đổi ảnh chính
3.5 Sản phẩm frontend bàn giao
• Mã nguồn frontend với cart state quản lý bằng Zustand
• Tích hợp đầy đủ API sản phẩm, giỏ hàng, đơn hàng và coupon
• Responsive và tương thích mobile
