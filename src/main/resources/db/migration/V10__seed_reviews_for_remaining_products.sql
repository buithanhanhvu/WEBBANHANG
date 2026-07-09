-- V10__seed_reviews_for_remaining_products.sql
-- Seed reviews and comments for remaining products to make the store look populated and lively

INSERT INTO reviews(user_id, product_id, rating, comment, created_at) VALUES
-- Product 5: WorkStation Pro (Laptop)
(3, 5, 5, 'Laptop cấu hình cực mạnh, mình dùng lập trình Docker và chạy máy ảo siêu mượt mà. Phím gõ rất đầm tay.', NOW()),
(4, 5, 4, 'Máy build chắc chắn, tản nhiệt tốt khi render video. Hơi nặng một chút nhưng hiệu năng bù lại tất cả.', NOW()),

-- Product 6: Máy hút bụi Swift (Gia dụng)
(3, 6, 4, 'Hút bụi khá sạch, đầu hút linh hoạt luồn lách gầm giường tủ dễ dàng. Tiếng ồn ở mức chấp nhận được.', NOW()),
(5, 6, 5, 'Rất tiện lợi để dọn dẹp nhà cửa nhanh. Lực hút mạnh, hộp chứa bụi dễ tháo ra đổ và vệ sinh.', NOW()),

-- Product 7: iPhone 15 Pro Max
(2, 7, 5, 'Thiết kế khung titan sang trọng, nhẹ hơn hẳn đời trước. Camera zoom 5x chụp ảnh cực đỉnh, pin trâu.', NOW()),
(3, 7, 5, 'Hàng chính hãng đóng gói siêu cẩn thận. Giao nhanh 2 tiếng. Dùng 3 tháng rồi vẫn cực kỳ hài lòng.', NOW()),
(4, 7, 4, 'Màn hình hiển thị xuất sắc nhưng viền camera hơi dễ trầy xước, các bạn nên mua ốp bảo vệ cụm camera.', NOW()),

-- Product 8: Samsung Galaxy S24 Ultra
(2, 8, 5, 'Bút S Pen viết vẽ rất nhạy, tính năng AI dịch thuật trực tiếp cực kỳ hữu ích khi làm việc với đối tác.', NOW()),
(4, 8, 5, 'Màn hình phẳng dùng sướng hơn màn cong đời cũ nhiều. Chụp zoom 100x sắc nét kinh ngạc.', NOW()),
(5, 8, 4, 'Máy thiết kế vuông vức cầm hơi cấn tay một chút. Còn lại hiệu năng, pin và camera đều hoàn hảo.', NOW()),

-- Product 9: Xiaomi 14 Ultra
(3, 9, 5, 'Ống kính Leica chụp ảnh có chiều sâu nghệ thuật. Màu sắc ảnh chân thực, cấu hình Snapdragon 8 Gen 3 siêu mạnh.', NOW()),
(5, 9, 4, 'Chụp ảnh vô địch trong tầm giá. Tuy nhiên máy chạy tác vụ nặng hơi ấm nhẹ ở cụm camera sau.', NOW()),

-- Product 10: ASUS ROG Ally
(2, 10, 5, 'Chơi game AAA di động cực đã. Màn hình 120Hz mượt mà, hệ thống tản nhiệt hoạt động rất êm ái.', NOW()),
(3, 10, 4, 'Máy cầm nhẹ tay, phím bấm nhạy. Pin hơi hẻo khi chơi game nặng, nên cắm sạc khi chơi để đạt hiệu năng tối đa.', NOW()),

-- Product 11: MacBook Pro M3 Pro
(2, 11, 5, 'Màu Space Black siêu đẹp và ít bám vân tay. Hiệu năng chip M3 Pro cân mọi tác vụ lập trình và đồ họa.', NOW()),
(4, 11, 5, 'Màn hình Liquid Retina XDR hiển thị tuyệt vời. Thời lượng pin cực trâu dùng cả ngày không cần cắm sạc.', NOW()),

-- Product 12: Dell XPS 13 Plus
(3, 12, 4, 'Thiết kế tương lai vô cùng tối giản và sang trọng. Hàng phím chức năng cảm ứng dùng rất lạ mắt.', NOW()),
(5, 12, 4, 'Touchpad ẩn rất độc đáo. Máy mỏng nhẹ tiện di chuyển, bàn phím gõ êm nhưng hành trình hơi nông.', NOW()),

-- Product 13: HP Spectre x360 14
(2, 13, 5, 'Bản lề xoay gập 360 độ linh hoạt kèm bút cảm ứng vẽ rất sướng. Màn hình OLED hiển thị màu sắc rực rỡ.', NOW()),
(4, 13, 5, 'Thiết kế cắt vát kim cương cực kỳ sang trọng và tinh tế. Phù hợp cho doanh nhân cần di chuyển nhiều.', NOW()),

-- Product 14: Lenovo ThinkPad X1 Carbon
(3, 14, 5, 'Bàn phím huyền thoại gõ êm nhất thế giới. Trọng lượng siêu nhẹ dưới 1.1kg tiện lợi mang đi công tác.', NOW()),
(5, 14, 5, 'Máy siêu bền, bảo mật vân tay và nhận diện khuôn mặt cực nhạy. Đúng chất dòng máy doanh nghiệp.', NOW()),

-- Product 15: Nồi chiên không dầu Philips
(2, 15, 5, 'Nồi chiên nhanh, khoai tây hay gà chiên ra đều giòn ngoài mềm trong mà không cần dầu mỡ. Rất tốt cho sức khỏe.', NOW()),
(4, 15, 4, 'Dung tích lớn thoải mái chiên cả con gà. Lớp chống dính tốt, dễ dàng tháo rời khay để rửa sạch.', NOW()),

-- Product 16: Robot hút bụi Roborock S8
(3, 16, 5, 'Robot tránh chướng ngại vật cực tốt, không bị kẹt dây điện như máy cũ. Lực hút mạnh hút sạch lông thú cưng.', NOW()),
(5, 16, 5, 'App điều khiển tiếng Việt trực quan, vẽ bản đồ nhà 3D rất chuẩn. Lau nhà sạch sẽ, tự động giặt giẻ tiện lợi.', NOW()),

-- Product 17: Máy pha cà phê Delonghi
(2, 17, 5, 'Pha espresso cực kỳ thơm ngon, lớp crema dày mịn chuẩn vị cafe Ý. Vòi đánh sữa tạo bọt cappucino rất dễ.', NOW()),
(4, 17, 4, 'Máy khởi động nhanh, áp suất ổn định. Phù hợp sử dụng cho gia đình hoặc văn phòng nhỏ.', NOW()),

-- Product 18: Quạt lọc không khí Dyson
(3, 18, 5, 'Lọc không khí cực sạch, chạy siêu êm về đêm không nghe thấy tiếng động. Thiết kế không cánh an toàn cho trẻ nhỏ.', NOW()),
(5, 18, 4, 'Máy lọc bụi mịn tốt, app báo chỉ số chất lượng không khí chi tiết. Tuy nhiên giá thành hơi cao.', NOW()),

-- Product 19: Cáp sạc Anker PowerLine III
(2, 19, 5, 'Cáp sạc bọc dù siêu bền, uốn cong thoải mái không lo gãy gập. Sạc nhanh ổn định cho iPhone.', NOW()),
(4, 19, 5, 'Chất lượng Anker thì không phải bàn cãi rồi. Độ bền cực cao, dùng hơn năm vẫn như mới.', NOW()),

-- Product 20: Sạc dự phòng Anker Prime 20000
(3, 20, 5, 'Công suất sạc 200W sạc được cho cả Macbook. Màn hình hiển thị công suất sạc vào và ra trực quan cực xịn.', NOW()),
(5, 20, 5, 'Dung lượng lớn 20000mAh thoải mái dùng cho chuyến đi 2 ngày. Sạc nhanh đầy pin dự phòng chỉ trong 1 tiếng.', NOW()),

-- Product 21: Chuột Logitech MX Master 3S
(2, 21, 5, 'Nút cuộn MagSpeed siêu tốc cực kỳ thích hợp cho lập trình viên và dân văn phòng làm việc với Excel lớn.', NOW()),
(3, 21, 5, 'Thiết kế công thái học cầm ôm tay chống mỏi cổ tay rất tốt. Click chuột cực kỳ êm không tiếng động.', NOW()),

-- Product 22: Bàn phím cơ Keychron K2 V2
(4, 22, 5, 'Switch gõ nảy và êm, kết nối bluetooth với Macbook cực nhanh và ổn định. Đèn LED RGB sáng đẹp.', NOW()),
(5, 22, 4, 'Layout 84 phím gọn gàng tiện mang đi cafe. Keycap zin hơi bám mồ hôi nhẹ nhưng thay thế dễ dàng.', NOW()),

-- Product 23: Loa Marshall Emberton II
(3, 23, 5, 'Thiết kế retro cổ điển đặc trưng Marshall. Âm thanh đa hướng vang và ấm, chống nước mang đi bể bơi thoải mái.', NOW()),
(4, 23, 5, 'Nghe nhạc ballad hay acoustic cực kỳ đỉnh. Thời lượng pin 30 tiếng dùng mãi không hết pin.', NOW()),

-- Product 24: Tai nghe Sony WH-1000XM5
(2, 24, 5, 'Chống ồn ANC đỉnh cao nhất hiện nay, đeo lên là không gian hoàn toàn yên tĩnh. Chất âm Sony bass ấm.', NOW()),
(5, 24, 5, 'Đệm tai êm ái đeo lâu không bị nóng hay đau tai. Tính năng tự dừng nhạc khi bắt đầu nói chuyện rất thông minh.', NOW()),

-- Product 25: Apple Watch Ultra 2
(3, 25, 5, 'Màn hình siêu sáng dưới nắng gắt. Vỏ titan và kính sapphire chống trầy cực tốt khi va đập dã ngoại.', NOW()),
(4, 25, 5, 'GPS tần số kép cực kỳ chính xác khi chạy bộ hay leo núi. Pin dùng được 3 ngày thoải mái hơn bản thường.', NOW()),

-- Product 26: Garmin Fenix 7 Pro
(2, 26, 5, 'Đồng hồ thể thao chuyên nghiệp hàng đầu. Đo các chỉ số sức khỏe, giấc ngủ và thể lực cực kỳ chi tiết.', NOW()),
(5, 26, 5, 'Pin sạc năng lượng mặt trời dùng thoải mái 2-3 tuần không lo hết pin. Bản đồ offline rất chi tiết.', NOW()),

-- Product 27: Google Pixel 8 Pro
(3, 27, 5, 'Hệ điều hành Android gốc siêu mượt. Các tính năng AI chỉnh sửa ảnh thông minh cực kỳ ảo diệu.', NOW()),
(4, 27, 4, 'Máy ảnh chụp da người rất tự nhiên. Pin ở mức khá, dùng trọn vẹn 1 ngày thoải mái.', NOW()),

-- Product 28: OnePlus 12
(3, 28, 5, 'Màn hình độ sáng siêu cao, màu sắc rực rỡ. Sạc 100W đầy pin chỉ trong 26 phút cực kỳ ấn tượng.', NOW()),
(5, 28, 5, 'Cấu hình khủng long chơi game nặng liên tục vẫn mát mẻ nhờ tản nhiệt buồng hơi lớn.', NOW()),

-- Product 29: ASUS Zenbook 14 OLED
(4, 29, 5, 'Trọng lượng siêu nhẹ chỉ 1.2kg, vỏ nhôm nguyên khối sang trọng. Màn hình OLED 120Hz siêu mượt.', NOW()),
(5, 29, 5, 'Bàn phím gõ êm, touchpad tích hợp bàn phím số NumberPad rất tiện lợi khi nhập liệu số.', NOW()),

-- Product 30: Acer Swift Go 14
(2, 30, 4, 'Laptop mỏng nhẹ thời trang, cấu hình tốt trong tầm giá cho học sinh sinh viên học tập và giải trí.', NOW()),
(3, 30, 4, 'Màn hình IPS độ phân giải cao sắc nét, viền mỏng đẹp. Loa ngoài nghe nhạc to rõ ràng.', NOW()),

-- Product 31: Lò vi sóng Sharp
(4, 31, 5, 'Lò cơ bền bỉ, dễ sử dụng cho cả người lớn tuổi. Hâm nóng và rã đông thức ăn nhanh chóng đều đặn.', NOW()),
(5, 31, 5, 'Thương hiệu Sharp bền bỉ dùng mấy năm vẫn chạy tốt. Khoang lò rộng rãi dễ vệ sinh lau chùi.', NOW()),

-- Product 32: Máy lọc nước Karofi
(3, 32, 5, 'Nước lọc ra uống trực tiếp ngọt mát tự nhiên. Máy chạy êm, thiết kế mỏng gọn tiết kiệm diện tích bếp.', NOW()),
(4, 32, 5, 'Hệ thống 10 lõi lọc cung cấp đầy đủ khoáng chất có lợi. Dịch vụ lắp đặt nhanh chóng, nhiệt tình.', NOW()),

-- Product 33: Chuột Razer DeathAdder V3
(3, 33, 5, 'Form cầm công thái học huyền thoại cực kỳ ôm tay cho người tay to. Click quang học phản hồi siêu nhanh.', NOW()),
(5, 33, 5, 'Trọng lượng siêu nhẹ chỉ 59g giúp vẩy chuột trong CS2/Valorant nhẹ nhàng không bị mỏi tay.', NOW()),

-- Product 34: Bàn phím cơ ASUS ROG Strix
(2, 34, 5, 'Đèn LED RGB Aura Sync đồng bộ cực đẹp với case máy tính. Switch ROG độc quyền gõ cực êm và đầm tay.', NOW()),
(3, 34, 5, 'Thiết kế đậm chất gaming hầm hố. Bàn phím chắc chắn nặng tay, gõ không bị rung lắc.', NOW()),

-- Product 35: Loa không dây JBL Charge 5
(3, 35, 5, 'Dải bass dày đặc trưng JBL nghe nhạc quẩy cực sung. Chống nước IP67 mang đi tắm biển thoải mái.', NOW()),
(4, 35, 5, 'Tính năng PartyBoost kết nối nhiều loa với nhau tạo âm thanh vòm cực chất. Pin dùng cả ngày thoải mái.', NOW()),

-- Product 36: Tai nghe Apple AirPods Pro 2
(4, 36, 5, 'Kết nối liền mạch trong hệ sinh thái Apple. Tính năng thích ứng âm thanh hoạt động rất tự nhiên.', NOW()),
(5, 36, 5, 'Micro đàm thoại lọc gió tốt, gọi điện ngoài đường xe cộ ồn ào đầu dây bên kia vẫn nghe rõ.', NOW()),

-- Product 37: Samsung Galaxy Watch 6
(3, 37, 4, 'Màn hình viền mỏng đẹp hơn đời trước nhiều. Đo giấc ngủ và đưa ra gợi ý huấn luyện viên giấc ngủ rất hay.', NOW()),
(4, 37, 5, 'Thiết kế tròn cổ điển thời trang. Theo dõi nhịp tim và calo tiêu thụ khi tập thể thao chính xác.', NOW()),

-- Product 38: Xiaomi Redmi Watch 4
(2, 38, 4, 'Đồng hồ thông minh giá rẻ nhưng màn hình AMOLED lớn hiển thị đẹp. Pin dùng cả tuần không cần sạc.', NOW()),
(5, 38, 5, 'Đầy đủ các tính năng thông báo cuộc gọi, tin nhắn tiếng Việt không lỗi font. Rất đáng đồng tiền bát gạo.', NOW());
