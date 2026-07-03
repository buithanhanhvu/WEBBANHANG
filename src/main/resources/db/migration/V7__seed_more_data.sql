-- Chèn thêm danh mục mới
INSERT INTO categories(id, name, description) VALUES
(4, 'Phụ kiện', 'Phụ kiện công nghệ cao cấp'),
(5, 'Âm thanh', 'Tai nghe, loa và thiết bị âm thanh'),
(6, 'Đồng hồ', 'Đồng hồ thông minh và vòng đeo tay');

-- Chèn thêm mã giảm giá mới
INSERT INTO coupons(id, code, discount_percent, active, start_date, end_date, max_uses, used_count) VALUES
(3, 'ASTRA50', 50, TRUE, '2026-01-01', '2026-12-31', 100, 0),
(4, 'FREESHIP', 5, TRUE, '2026-01-01', '2026-12-31', 200, 0),
(5, 'TECH30', 30, TRUE, '2026-01-01', '2026-12-31', 50, 0),
(6, 'SUMMERSALE', 15, TRUE, '2026-01-01', '2026-12-31', 150, 0);

-- Chèn thêm 20 sản phẩm mới
INSERT INTO products(id, name, description, price, stock, image_url, category_id, featured, discount_percent, brand) VALUES
(7, 'iPhone 15 Pro Max', 'Màn hình Super Retina XDR, chip A17 Pro.', 29990000.00, 25, 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=900', 1, TRUE, 5, 'Apple'),
(8, 'Samsung Galaxy S24 Ultra', 'Bút S Pen quyền năng, camera AI 200MP.', 26990000.00, 30, 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=900', 1, TRUE, 8, 'Samsung'),
(9, 'Xiaomi 14 Ultra', 'Ống kính Leica thế hệ mới, chip Snapdragon 8 Gen 3.', 21990000.00, 15, 'https://images.unsplash.com/photo-1565630916779-e303be97b6f5?w=900', 1, FALSE, 10, 'Xiaomi'),
(10, 'ASUS ROG Ally', 'Máy chơi game cầm tay chạy Windows 11.', 16490000.00, 20, 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=900', 1, TRUE, 12, 'ASUS'),
(11, 'MacBook Pro M3 Pro', 'Chip M3 Pro, RAM 18GB, SSD 512GB.', 49990000.00, 12, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900', 2, TRUE, 5, 'Apple'),
(12, 'Dell XPS 13 Plus', 'Thiết kế tràn viền thời thượng, CPU Core i7.', 39990000.00, 8, 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=900', 2, FALSE, 10, 'Dell'),
(13, 'HP Spectre x360 14', 'Laptop xoay gập 2 in 1 màn hình OLED cảm ứng.', 34990000.00, 10, 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=900', 2, TRUE, 7, 'HP'),
(14, 'Lenovo ThinkPad X1 Carbon', 'Laptop doanh nhân siêu bền bỉ và mỏng nhẹ.', 42990000.00, 15, 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=900', 2, FALSE, 6, 'Lenovo'),
(15, 'Nồi chiên không dầu Philips', 'Công nghệ Rapid Air giảm 90% lượng mỡ thừa.', 3490000.00, 40, 'https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?w=900', 3, TRUE, 15, 'Philips'),
(16, 'Robot hút bụi Roborock S8', 'Lực hút 6000Pa, né tránh chướng ngại vật thông minh.', 12990000.00, 18, 'https://images.unsplash.com/photo-1576082900999-1ee07d7213bf?w=900', 3, FALSE, 10, 'Roborock'),
(17, 'Máy pha cà phê Delonghi', 'Áp suất 15 bar, tự động đánh bọt sữa mịn màng.', 8990000.00, 22, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=900', 3, TRUE, 5, 'Delonghi'),
(18, 'Quạt lọc không khí Dyson', 'Lọc 99.95% bụi siêu mịn PM0.1, làm mát thông minh.', 15990000.00, 14, 'https://images.unsplash.com/photo-1595708684082-a173bb3a06c5?w=900', 3, FALSE, 8, 'Dyson'),
(19, 'Cáp sạc Anker PowerLine III', 'Cáp USB-C to Lightning siêu bền, sạc nhanh PD.', 290000.00, 150, 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=900', 4, FALSE, 0, 'Anker'),
(20, 'Sạc dự phòng Anker Prime 20000', 'Công suất sạc 200W, màn hình LCD thông minh.', 1890000.00, 90, 'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?w=900', 4, TRUE, 15, 'Anker'),
(21, 'Chuột Logitech MX Master 3S', 'Cảm biến 8000 DPI, cuộn nhanh MagSpeed siêu êm.', 2490000.00, 75, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=900', 4, TRUE, 10, 'Logitech'),
(22, 'Bàn phím cơ Keychron K2 V2', 'Kết nối Bluetooth/Wired, đèn LED RGB, gõ cực đã.', 1990000.00, 50, 'https://images.unsplash.com/photo-1601445638532-3c6f6c3aa1d6?w=900', 4, FALSE, 8, 'Keychron'),
(23, 'Loa Marshall Emberton II', 'Âm thanh đa hướng trung thực, pin trâu 30 giờ.', 3890000.00, 35, 'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=900', 5, TRUE, 5, 'Marshall'),
(24, 'Tai nghe Sony WH-1000XM5', 'Chống ồn đỉnh cao, thời lượng pin 30 giờ.', 6490000.00, 28, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900', 5, TRUE, 12, 'Sony'),
(25, 'Apple Watch Ultra 2', 'Màn hình sáng nhất của Apple, GPS tần số kép.', 19990000.00, 20, 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=900', 6, TRUE, 5, 'Apple'),
(26, 'Garmin Fenix 7 Pro', 'Đồng hồ thể thao chuyên nghiệp, pin năng lượng mặt trời.', 17490000.00, 15, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900', 6, FALSE, 10, 'Garmin');
