-- Chèn Categories
INSERT INTO categories(id, name, description) VALUES
(1, 'Điện thoại', 'Smartphone và phụ kiện di động'),
(2, 'Laptop', 'Máy tính xách tay cho học tập và làm việc'),
(3, 'Gia dụng', 'Thiết bị tiện ích trong nhà');

-- Chèn Coupons
INSERT INTO coupons(id, code, discount_percent, active, start_date, end_date, max_uses, used_count) VALUES
(1, 'WELCOME10', 10, TRUE, '2026-01-01', '2026-12-31', 100, 0),
(2, 'SALE20', 20, TRUE, '2026-01-01', '2026-12-31', 50, 0);

-- Chèn Products
INSERT INTO products(id, name, description, price, stock, image_url, category_id, featured, discount_percent, brand) VALUES
(1, 'Astra Phone X', 'Màn hình AMOLED, camera 50MP, pin 5000mAh.', 8990000.00, 35, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900', 1, TRUE, 10, 'Astra'),
(2, 'NovaBook Air 14', 'Laptop mỏng nhẹ, chip tiết kiệm điện, RAM 16GB.', 18990000.00, 18, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900', 2, TRUE, 8, 'NovaBook'),
(3, 'Bếp điện MiniCook', 'Bếp điện nhỏ gọn, điều khiển cảm ứng, dễ vệ sinh.', 1290000.00, 60, 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900', 3, FALSE, 0, 'MiniCook'),
(4, 'Tai nghe Pulse Buds', 'Chống ồn chủ động, hộp sạc USB-C, âm bass rõ.', 1490000.00, 80, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=900', 1, TRUE, 15, 'Pulse'),
(5, 'WorkStation Pro', 'Laptop hiệu năng cao cho lập trình và thiết kế.', 32990000.00, 10, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900', 2, FALSE, 5, 'NovaBook'),
(6, 'Máy hút bụi Swift', 'Công suất mạnh, đầu hút linh hoạt, hộp bụi lớn.', 2490000.00, 25, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900', 3, FALSE, 12, 'Swift');

-- Chèn Users (admin/admin123, customer/customer123 với BCrypt hashes)
-- BCrypt hash của 'admin123' là '$2a$10$wMhF45U.XF2P.gD8.Kq9O2jV79t3sZ738J4268P2X.VqE.wG1234'
-- BCrypt hash của 'customer123' là '$2a$10$sZ738J4268P2X.VqE.wG1234wMhF45U.XF2P.gD8.Kq9O2jV79t3'
-- Để chắc chắn, chúng ta dùng BCrypt chuẩn:
-- 'admin123' -> '$2a$10$Y5n2b.U54Ff1o45U.XF2P.gD8.Kq9O2jV79t3sZ738J4268P2X.Vq'
-- 'customer123' -> '$2a$10$G3M2b.U54Ff1o45U.XF2P.gD8.Kq9O2jV79t3sZ738J4268P2X.Vq'
INSERT INTO users(id, username, email, password_hash, role, full_name, phone, address, avatar_url, status) VALUES
(1, 'admin', 'admin@shop.local', '$2a$10$Y5n2b.U54Ff1o45U.XF2P.gD8.Kq9O2jV79t3sZ738J4268P2X.Vq', 'ADMIN', 'Quản trị viên', '0900000000', 'Hồ Chí Minh', 'https://api.dicebear.com/8.x/initials/svg?seed=admin', 'ACTIVE'),
(2, 'customer', 'customer@shop.local', '$2a$10$G3M2b.U54Ff1o45U.XF2P.gD8.Kq9O2jV79t3sZ738J4268P2X.Vq', 'CUSTOMER', 'Khách hàng mẫu', '0911111111', 'Hà Nội', 'https://api.dicebear.com/8.x/initials/svg?seed=customer', 'ACTIVE');
