-- Chèn thêm một số người dùng mẫu để đánh giá
INSERT INTO users(id, username, email, password_hash, role, full_name, phone, address, status) VALUES
(3, 'linh_dan', 'linhdan@gmail.com', '$2a$10$G3M2b.U54Ff1o45U.XF2P.gD8.Kq9O2jV79t3sZ738J4268P2X.Vq', 'CUSTOMER', 'Nguyễn Linh Đan', '0922222222', 'Đà Nẵng', 'ACTIVE'),
(4, 'minh_hoang', 'minhhoang@gmail.com', '$2a$10$G3M2b.U54Ff1o45U.XF2P.gD8.Kq9O2jV79t3sZ738J4268P2X.Vq', 'CUSTOMER', 'Trần Minh Hoàng', '0933333333', 'Hải Phòng', 'ACTIVE'),
(5, 'khanh_vy', 'khanhvy@gmail.com', '$2a$10$G3M2b.U54Ff1o45U.XF2P.gD8.Kq9O2jV79t3sZ738J4268P2X.Vq', 'CUSTOMER', 'Phạm Khánh Vy', '0944444444', 'Cần Thơ', 'ACTIVE');

-- Chèn Đánh giá mẫu cho các sản phẩm
INSERT INTO reviews(user_id, product_id, rating, comment) VALUES
-- Sản phẩm 1 (Astra Phone X)
(3, 1, 5, 'Điện thoại dùng rất mượt, pin trâu, chụp ảnh siêu sắc nét luôn! Rất đáng mua.'),
(4, 1, 4, 'Máy đẹp, đóng gói cẩn thận. Giao hàng hơi lâu chút nhưng bù lại chất lượng tuyệt vời.'),
-- Sản phẩm 2 (NovaBook Air 14)
(3, 2, 5, 'Màn hình đẹp xuất sắc, siêu mỏng nhẹ, bàn phím gõ êm ái thích hợp cho văn phòng.'),
(5, 2, 4, 'Hiệu năng máy khá ổn định, pin dùng thực tế tầm 6 tiếng liên tục. Máy mát và đẹp.'),
-- Sản phẩm 3 (Bếp điện MiniCook)
(4, 3, 5, 'Bếp nóng cực nhanh, thiết kế gọn gàng, điều khiển cảm ứng mượt mà, dễ lau chùi sau khi dùng.'),
-- Sản phẩm 4 (Tai nghe Pulse Buds)
(5, 4, 5, 'Âm bass nghe rất ấm và chắc tai, chống ồn chủ động (ANC) tốt vượt mong đợi trong tầm giá này.');

-- Chèn Đơn hàng mẫu đã giao (DELIVERED) cho khách hàng chính (customer - user_id=2)
-- để khách hàng này có quyền gửi đánh giá thực tế từ giao diện
INSERT INTO orders(id, user_id, total_amount, discount_amount, status, shipping_name, shipping_address, shipping_phone) VALUES
(1001, 2, 8091000.00, 0.00, 'DELIVERED', 'Khách hàng mẫu', 'Hà Nội', '0911111111'),
(1002, 2, 17470800.00, 0.00, 'DELIVERED', 'Khách hàng mẫu', 'Hà Nội', '0911111111');

-- Chi tiết sản phẩm trong đơn hàng
INSERT INTO order_items(order_id, product_id, product_name, quantity, price) VALUES
(1001, 1, 'Astra Phone X', 1, 8091000.00),
(1002, 2, 'NovaBook Air 14', 1, 17470800.00);
