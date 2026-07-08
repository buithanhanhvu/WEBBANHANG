-- Chèn thêm 12 sản phẩm cao cấp mới để làm phong phú cửa hàng (IDs từ 27 đến 38)
INSERT INTO products(id, name, description, price, stock, image_url, category_id, featured, discount_percent, brand) VALUES
(27, 'Google Pixel 8 Pro', 'Điện thoại thuần Google, camera AI đỉnh cao, màn hình 120Hz.', 18990000.00, 15, 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=900', 1, TRUE, 10, 'Google'),
(28, 'OnePlus 12', 'Flagship Killer hiệu năng mạnh mẽ, sạc siêu nhanh 100W.', 15490000.00, 12, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900', 1, FALSE, 5, 'OnePlus'),
(29, 'ASUS Zenbook 14 OLED', 'Laptop văn phòng mỏng nhẹ sang trọng, màn hình OLED rực rỡ.', 24990000.00, 10, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900', 2, TRUE, 8, 'ASUS'),
(30, 'Acer Swift Go 14', 'Laptop học sinh sinh viên giá tốt, CPU Intel thế hệ mới.', 17990000.00, 15, 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=900', 2, FALSE, 12, 'Acer'),
(31, 'Lò vi sóng Sharp', 'Lò vi sóng có nướng, điều khiển cơ bền bỉ và dễ sử dụng.', 2890000.00, 30, 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900', 3, FALSE, 15, 'Sharp'),
(32, 'Máy lọc nước Karofi', 'Hệ thống lọc 10 cấp, cung cấp nước khoáng tinh khiết tại vòi.', 5490000.00, 20, 'https://images.unsplash.com/photo-1576082900999-1ee07d7213bf?w=900', 3, TRUE, 10, 'Karofi'),
(33, 'Chuột Razer DeathAdder V3', 'Chuột gaming công thái học siêu nhẹ dành cho game thủ chuyên nghiệp.', 1690000.00, 40, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=900', 4, TRUE, 5, 'Razer'),
(34, 'Bàn phím cơ ASUS ROG Strix', 'Bàn phím cơ gaming có đèn LED Aura Sync, Switch độc quyền gõ êm.', 3290000.00, 25, 'https://images.unsplash.com/photo-1601445638532-3c6f6c3aa1d6?w=900', 4, FALSE, 10, 'ASUS'),
(35, 'Loa không dây JBL Charge 5', 'Âm thanh JBL Original Pro Sound mạnh mẽ, chống nước kháng bụi IP67.', 3990000.00, 35, 'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=900', 5, TRUE, 15, 'JBL'),
(36, 'Tai nghe Apple AirPods Pro 2', 'Chống ồn chủ động tốt hơn gấp 2 lần, hộp sạc MagSafe có loa tìm kiếm.', 5990000.00, 50, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900', 5, TRUE, 8, 'Apple'),
(37, 'Samsung Galaxy Watch 6', 'Đồng hồ thông minh theo dõi sức khỏe, đo điện tâm đồ và huyết áp.', 6990000.00, 25, 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=900', 6, TRUE, 12, 'Samsung'),
(38, 'Xiaomi Redmi Watch 4', 'Đồng hồ giá rẻ, màn hình lớn, pin sử dụng lên tới 20 ngày.', 2290000.00, 60, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900', 6, FALSE, 10, 'Xiaomi');

-- Chèn thêm đánh giá mẫu cho sản phẩm mới
INSERT INTO reviews(id, user_id, product_id, rating, comment, created_at) VALUES
(21, 2, 27, 5, 'Camera chụp ảnh zoom xa nét căng, hệ điều hành mượt mà không ứng dụng rác.', NOW()),
(22, 2, 29, 4, 'Màn hình OLED quá đẹp, xem phim cực kỳ đã mắt. Máy nhẹ, pin dùng được khoảng 6 tiếng.', NOW()),
(23, 2, 33, 5, 'Chuột siêu nhẹ, cầm ôm tay, cảm biến nhạy chiến game FPS cực đỉnh.', NOW()),
(24, 2, 35, 5, 'Bass đập rất chắc, pin trâu mang đi du lịch dã ngoại ngoài trời cực kỳ phù hợp.', NOW()),
(25, 2, 36, 5, 'Chống ồn chủ động xuất sắc, đeo lâu không bị đau tai như các loại khác.', NOW());

-- Chèn thêm một số đơn hàng mẫu để làm phong phú dữ liệu Dashboard thống kê
INSERT INTO orders(id, user_id, coupon_id, total_amount, discount_amount, status, shipping_name, shipping_address, shipping_phone, note, created_at) VALUES
(3, 2, NULL, 5690500.00, 0.00, 'DELIVERED', 'Khách hàng mẫu', 'Hà Nội', '0911111111', 'Giao hàng nhanh giúp em.', '2026-07-01 10:30:00'),
(4, 2, NULL, 15490000.00, 0.00, 'SHIPPING', 'Khách hàng mẫu', 'Đà Nẵng', '0911111111', 'Gọi điện trước khi giao.', '2026-07-05 15:20:00'),
(5, 2, 4, 3790500.00, 199500.00, 'CONFIRMED', 'Khách hàng mẫu', 'Hồ Chí Minh', '0911111111', 'Giao trong giờ hành chính.', '2026-07-06 09:00:00');

-- Chèn chi tiết mặt hàng cho các đơn hàng mẫu trên
INSERT INTO order_items(id, order_id, product_id, product_name, quantity, price) VALUES
(3, 3, 36, 'Tai nghe Apple AirPods Pro 2', 1, 5990000.00),
(4, 4, 28, 'OnePlus 12', 1, 15490000.00),
(5, 5, 35, 'Loa không dây JBL Charge 5', 1, 3990000.00);
