package com.example.webbanhang;

import com.example.webbanhang.domain.*;
import com.example.webbanhang.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true", matchIfMissing = true)
public class DatabaseSeeder implements CommandLineRunner {


    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final UserRepository userRepository;
    private final CouponRepository couponRepository;
    private final OrderRepository orderRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(

            CategoryRepository categoryRepository,
            ProductRepository productRepository,
            ProductImageRepository productImageRepository,
            UserRepository userRepository,
            CouponRepository couponRepository,
            OrderRepository orderRepository,
            PasswordEncoder passwordEncoder) {

        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.productImageRepository = productImageRepository;
        this.userRepository = userRepository;
        this.couponRepository = couponRepository;
        this.orderRepository = orderRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {


        // 2. Seed Categories
        if (categoryRepository.count() == 0) {
            categoryRepository.saveAll(List.of(
                Category.builder().name("Điện thoại").description("Smartphone và phụ kiện di động").build(),
                Category.builder().name("Laptop").description("Máy tính xách tay cho học tập và làm việc").build(),
                Category.builder().name("Gia dụng").description("Thiết bị tiện ích trong nhà").build(),
                Category.builder().name("Phụ kiện").description("Phụ kiện công nghệ cao cấp").build(),
                Category.builder().name("Âm thanh").description("Tai nghe, loa và thiết bị âm thanh").build(),
                Category.builder().name("Đồng hồ").description("Đồng hồ thông minh và vòng đeo tay").build()
            ));
        }

        // 3. Seed Coupons
        if (couponRepository.count() == 0) {
            couponRepository.saveAll(List.of(
                Coupon.builder()
                        .code("WELCOME10")
                        .discountPercent(10)
                        .active(true)
                        .startDate(LocalDate.of(2026, 1, 1))
                        .endDate(LocalDate.of(2026, 12, 31))
                        .maxUses(100)
                        .usedCount(0)
                        .build(),
                Coupon.builder()
                        .code("SALE20")
                        .discountPercent(20)
                        .active(true)
                        .startDate(LocalDate.of(2026, 1, 1))
                        .endDate(LocalDate.of(2026, 12, 31))
                        .maxUses(50)
                        .usedCount(0)
                        .build(),
                Coupon.builder()
                        .code("ASTRA50")
                        .discountPercent(50)
                        .active(true)
                        .startDate(LocalDate.of(2026, 1, 1))
                        .endDate(LocalDate.of(2026, 12, 31))
                        .maxUses(100)
                        .usedCount(0)
                        .build(),
                Coupon.builder()
                        .code("FREESHIP")
                        .discountPercent(5)
                        .active(true)
                        .startDate(LocalDate.of(2026, 1, 1))
                        .endDate(LocalDate.of(2026, 12, 31))
                        .maxUses(200)
                        .usedCount(0)
                        .build(),
                Coupon.builder()
                        .code("TECH30")
                        .discountPercent(30)
                        .active(true)
                        .startDate(LocalDate.of(2026, 1, 1))
                        .endDate(LocalDate.of(2026, 12, 31))
                        .maxUses(50)
                        .usedCount(0)
                        .build(),
                Coupon.builder()
                        .code("SUMMERSALE")
                        .discountPercent(15)
                        .active(true)
                        .startDate(LocalDate.of(2026, 1, 1))
                        .endDate(LocalDate.of(2026, 12, 31))
                        .maxUses(150)
                        .usedCount(0)
                        .build()
            ));
        }

        // 4. Seed Users
        if (userRepository.count() == 0) {
            userRepository.saveAll(List.of(
                User.builder()
                        .username("admin")
                        .email("admin@shop.local")
                        .passwordHash(passwordEncoder.encode("admin123"))
                        .role("ADMIN")
                        .fullName("Quản trị viên")
                        .phone("0900000000")
                        .address("Hồ Chí Minh")
                        .avatarUrl("https://api.dicebear.com/8.x/initials/svg?seed=admin")
                        .status("ACTIVE")
                        .build(),
                User.builder()
                        .username("customer")
                        .email("customer@shop.local")
                        .passwordHash(passwordEncoder.encode("customer123"))
                        .role("CUSTOMER")
                        .fullName("Khách hàng mẫu")
                        .phone("0911111111")
                        .address("Hà Nội")
                        .avatarUrl("https://api.dicebear.com/8.x/initials/svg?seed=customer")
                        .status("ACTIVE")
                        .build()
            ));
        }

        // Fetch categories and users for associations
        List<Category> categories = categoryRepository.findAll();
        Category phoneCat = categories.stream().filter(c -> "Điện thoại".equalsIgnoreCase(c.getName())).findFirst().orElse(null);
        Category laptopCat = categories.stream().filter(c -> "Laptop".equalsIgnoreCase(c.getName())).findFirst().orElse(null);
        Category homeCat = categories.stream().filter(c -> "Gia dụng".equalsIgnoreCase(c.getName())).findFirst().orElse(null);
        Category accessoryCat = categories.stream().filter(c -> "Phụ kiện".equalsIgnoreCase(c.getName())).findFirst().orElse(null);
        Category audioCat = categories.stream().filter(c -> "Âm thanh".equalsIgnoreCase(c.getName())).findFirst().orElse(null);
        Category watchCat = categories.stream().filter(c -> "Đồng hồ".equalsIgnoreCase(c.getName())).findFirst().orElse(null);

        User customerUser = userRepository.findByUsername("customer").orElse(null);

        // 5. Seed Products
        if (productRepository.count() == 0) {
            productRepository.saveAll(List.of(
                Product.builder()
                        .name("Astra Phone X")
                        .description("Màn hình AMOLED, camera 50MP, pin 5000mAh.")
                        .price(new BigDecimal("8990000.00"))
                        .stock(35)
                        .imageUrl("https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900")
                        .category(phoneCat)
                        .featured(true)
                        .discountPercent(10)
                        .brand("Astra")
                        .build(),
                Product.builder()
                        .name("NovaBook Air 14")
                        .description("Laptop mỏng nhẹ, chip tiết kiệm điện, RAM 16GB.")
                        .price(new BigDecimal("18990000.00"))
                        .stock(18)
                        .imageUrl("https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900")
                        .category(laptopCat)
                        .featured(true)
                        .discountPercent(8)
                        .brand("NovaBook")
                        .build(),
                Product.builder()
                        .name("Bếp điện MiniCook")
                        .description("Bếp điện nhỏ gọn, điều khiển cảm ứng, dễ vệ sinh.")
                        .price(new BigDecimal("1290000.00"))
                        .stock(60)
                        .imageUrl("https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900")
                        .category(homeCat)
                        .featured(false)
                        .discountPercent(0)
                        .brand("MiniCook")
                        .build(),
                Product.builder()
                        .name("Tai nghe Pulse Buds")
                        .description("Chống ồn chủ động, hộp sạc USB-C, âm bass rõ.")
                        .price(new BigDecimal("1490000.00"))
                        .stock(80)
                        .imageUrl("https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=900")
                        .category(phoneCat)
                        .featured(true)
                        .discountPercent(15)
                        .brand("Pulse")
                        .build(),
                Product.builder()
                        .name("WorkStation Pro")
                        .description("Laptop hiệu năng cao cho lập trình và thiết kế.")
                        .price(new BigDecimal("32990000.00"))
                        .stock(10)
                        .imageUrl("https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900")
                        .category(laptopCat)
                        .featured(false)
                        .discountPercent(5)
                        .brand("NovaBook")
                        .build(),
                Product.builder()
                        .name("Máy hút bụi Swift")
                        .description("Công suất mạnh, đầu hút linh hoạt, hộp bụi lớn.")
                        .price(new BigDecimal("2490000.00"))
                        .stock(25)
                        .imageUrl("https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900")
                        .category(homeCat)
                        .featured(false)
                        .discountPercent(12)
                        .brand("Swift")
                        .build(),
                Product.builder()
                        .name("iPhone 15 Pro Max")
                        .description("Màn hình Super Retina XDR, chip A17 Pro.")
                        .price(new BigDecimal("29990000.00"))
                        .stock(25)
                        .imageUrl("https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=900")
                        .category(phoneCat)
                        .featured(true)
                        .discountPercent(5)
                        .brand("Apple")
                        .build(),
                Product.builder()
                        .name("Samsung Galaxy S24 Ultra")
                        .description("Bút S Pen quyền năng, camera AI 200MP.")
                        .price(new BigDecimal("26990000.00"))
                        .stock(30)
                        .imageUrl("https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=900")
                        .category(phoneCat)
                        .featured(true)
                        .discountPercent(8)
                        .brand("Samsung")
                        .build(),
                Product.builder()
                        .name("Xiaomi 14 Ultra")
                        .description("Ống kính Leica thế hệ mới, chip Snapdragon 8 Gen 3.")
                        .price(new BigDecimal("21990000.00"))
                        .stock(15)
                        .imageUrl("https://images.unsplash.com/photo-1565630916779-e303be97b6f5?w=900")
                        .category(phoneCat)
                        .featured(false)
                        .discountPercent(10)
                        .brand("Xiaomi")
                        .build(),
                Product.builder()
                        .name("ASUS ROG Ally")
                        .description("Máy chơi game cầm tay chạy Windows 11.")
                        .price(new BigDecimal("16490000.00"))
                        .stock(20)
                        .imageUrl("https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=900")
                        .category(phoneCat)
                        .featured(true)
                        .discountPercent(12)
                        .brand("ASUS")
                        .build(),
                Product.builder()
                        .name("MacBook Pro M3 Pro")
                        .description("Chip M3 Pro, RAM 18GB, SSD 512GB.")
                        .price(new BigDecimal("49990000.00"))
                        .stock(12)
                        .imageUrl("https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900")
                        .category(laptopCat)
                        .featured(true)
                        .discountPercent(5)
                        .brand("Apple")
                        .build(),
                Product.builder()
                        .name("Dell XPS 13 Plus")
                        .description("Thiết kế tràn viền thời thượng, CPU Core i7.")
                        .price(new BigDecimal("39990000.00"))
                        .stock(8)
                        .imageUrl("https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=900")
                        .category(laptopCat)
                        .featured(false)
                        .discountPercent(10)
                        .brand("Dell")
                        .build(),
                Product.builder()
                        .name("HP Spectre x360 14")
                        .description("Laptop xoay gập 2 in 1 màn hình OLED cảm ứng.")
                        .price(new BigDecimal("34990000.00"))
                        .stock(10)
                        .imageUrl("https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=900")
                        .category(laptopCat)
                        .featured(true)
                        .discountPercent(7)
                        .brand("HP")
                        .build(),
                Product.builder()
                        .name("Lenovo ThinkPad X1 Carbon")
                        .description("Laptop doanh nhân siêu bền bỉ và mỏng nhẹ.")
                        .price(new BigDecimal("42990000.00"))
                        .stock(15)
                        .imageUrl("https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=900")
                        .category(laptopCat)
                        .featured(false)
                        .discountPercent(6)
                        .brand("Lenovo")
                        .build(),
                Product.builder()
                        .name("Nồi chiên không dầu Philips")
                        .description("Công nghệ Rapid Air giảm 90% lượng mỡ thừa.")
                        .price(new BigDecimal("3490000.00"))
                        .stock(40)
                        .imageUrl("https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?w=900")
                        .category(homeCat)
                        .featured(true)
                        .discountPercent(15)
                        .brand("Philips")
                        .build(),
                Product.builder()
                        .name("Robot hút bụi Roborock S8")
                        .description("Lực hút 6000Pa, né tránh chướng ngại vật thông minh.")
                        .price(new BigDecimal("12990000.00"))
                        .stock(18)
                        .imageUrl("https://images.unsplash.com/photo-1576082900999-1ee07d7213bf?w=900")
                        .category(homeCat)
                        .featured(false)
                        .discountPercent(10)
                        .brand("Roborock")
                        .build(),
                Product.builder()
                        .name("Máy pha cà phê Delonghi")
                        .description("Áp suất 15 bar, tự động đánh bọt sữa mịn màng.")
                        .price(new BigDecimal("8990000.00"))
                        .stock(22)
                        .imageUrl("https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=900")
                        .category(homeCat)
                        .featured(true)
                        .discountPercent(5)
                        .brand("Delonghi")
                        .build(),
                Product.builder()
                        .name("Quạt lọc không khí Dyson")
                        .description("Lọc 99.95% bụi siêu mịn PM0.1, làm mát thông minh.")
                        .price(new BigDecimal("15990000.00"))
                        .stock(14)
                        .imageUrl("https://images.unsplash.com/photo-1595708684082-a173bb3a06c5?w=900")
                        .category(homeCat)
                        .featured(false)
                        .discountPercent(8)
                        .brand("Dyson")
                        .build(),
                Product.builder()
                        .name("Cáp sạc Anker PowerLine III")
                        .description("Cáp USB-C to Lightning siêu bền, sạc nhanh PD.")
                        .price(new BigDecimal("290000.00"))
                        .stock(150)
                        .imageUrl("https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=900")
                        .category(accessoryCat)
                        .featured(false)
                        .discountPercent(0)
                        .brand("Anker")
                        .build(),
                Product.builder()
                        .name("Sạc dự phòng Anker Prime 20000")
                        .description("Công suất sạc 200W, màn hình LCD thông minh.")
                        .price(new BigDecimal("1890000.00"))
                        .stock(90)
                        .imageUrl("https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?w=900")
                        .category(accessoryCat)
                        .featured(true)
                        .discountPercent(15)
                        .brand("Anker")
                        .build(),
                Product.builder()
                        .name("Chuột Logitech MX Master 3S")
                        .description("Cảm biến 8000 DPI, cuộn nhanh MagSpeed siêu êm.")
                        .price(new BigDecimal("2490000.00"))
                        .stock(75)
                        .imageUrl("https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=900")
                        .category(accessoryCat)
                        .featured(true)
                        .discountPercent(10)
                        .brand("Logitech")
                        .build(),
                Product.builder()
                        .name("Bàn phím cơ Keychron K2 V2")
                        .description("Kết nối Bluetooth/Wired, đèn LED RGB, gõ cực đã.")
                        .price(new BigDecimal("1990000.00"))
                        .stock(50)
                        .imageUrl("https://images.unsplash.com/photo-1601445638532-3c6f6c3aa1d6?w=900")
                        .category(accessoryCat)
                        .featured(false)
                        .discountPercent(8)
                        .brand("Keychron")
                        .build(),
                Product.builder()
                        .name("Loa Marshall Emberton II")
                        .description("Âm thanh đa hướng trung thực, pin trâu 30 giờ.")
                        .price(new BigDecimal("3890000.00"))
                        .stock(35)
                        .imageUrl("https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=900")
                        .category(audioCat)
                        .featured(true)
                        .discountPercent(5)
                        .brand("Marshall")
                        .build(),
                Product.builder()
                        .name("Tai nghe Sony WH-1000XM5")
                        .description("Chống ồn đỉnh cao, thời lượng pin 30 giờ.")
                        .price(new BigDecimal("6490000.00"))
                        .stock(28)
                        .imageUrl("https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900")
                        .category(audioCat)
                        .featured(true)
                        .discountPercent(12)
                        .brand("Sony")
                        .build(),
                Product.builder()
                        .name("Apple Watch Ultra 2")
                        .description("Màn hình sáng nhất của Apple, GPS tần số kép.")
                        .price(new BigDecimal("19990000.00"))
                        .stock(20)
                        .imageUrl("https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=900")
                        .category(watchCat)
                        .featured(true)
                        .discountPercent(5)
                        .brand("Apple")
                        .build(),
                Product.builder()
                        .name("Garmin Fenix 7 Pro")
                        .description("Đồng hồ thể thao chuyên nghiệp, pin năng lượng mặt trời.")
                        .price(new BigDecimal("17490000.00"))
                        .stock(15)
                        .imageUrl("https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900")
                        .category(watchCat)
                        .featured(false)
                        .discountPercent(10)
                        .brand("Garmin")
                        .build()
            ));
        }

        // Fetch products and coupons for order association
        List<Product> products = productRepository.findAll();

        // 5.1. Seed Product Images (Gallery)
        if (productImageRepository.count() == 0) {
            List<ProductImage> galleryImages = new java.util.ArrayList<>();
            for (Product p : products) {
                String name = p.getName().toLowerCase();
                if (name.contains("iphone")) {
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=900").build());
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=900").build());
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=900").build());
                } else if (name.contains("samsung")) {
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=900").build());
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=900").build());
                } else if (name.contains("macbook")) {
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900").build());
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=900").build());
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=900").build());
                } else if (name.contains("dell") || name.contains("hp") || name.contains("lenovo") || name.contains("novabook") || name.contains("workstation")) {
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=900").build());
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900").build());
                } else if (name.contains("sony") || name.contains("buds") || name.contains("pulse")) {
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=900").build());
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900").build());
                } else if (name.contains("marshall")) {
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=900").build());
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1545454675-3531b543be5d?w=900").build());
                } else if (name.contains("apple watch") || name.contains("garmin")) {
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=900").build());
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900").build());
                } else if (name.contains("xiaomi")) {
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1565630916779-e303be97b6f5?w=900").build());
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=900").build());
                } else if (name.contains("rog ally")) {
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=900").build());
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=900").build());
                } else if (name.contains("dyson") || name.contains("quạt")) {
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1595708684082-a173bb3a06c5?w=900").build());
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1618944847828-82e943c3babf?w=900").build());
                } else if (name.contains("delonghi") || name.contains("cook")) {
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=900").build());
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900").build());
                } else if (name.contains("philips") || name.contains("roborock") || name.contains("hút bụi")) {
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?w=900").build());
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1576082900999-1ee07d7213bf?w=900").build());
                } else {
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=900").build());
                    galleryImages.add(ProductImage.builder().product(p).imageUrl("https://images.unsplash.com/photo-1601445638532-3c6f6c3aa1d6?w=900").build());
                }
            }
            productImageRepository.saveAll(galleryImages);
        }

        Product phoneProduct = products.stream().filter(p -> p.getName().contains("Pulse Buds")).findFirst().orElse(null);
        Product laptopProduct = products.stream().filter(p -> p.getName().contains("NovaBook")).findFirst().orElse(null);
        Coupon welcomeCoupon = couponRepository.findByCode("WELCOME10").orElse(null);

        // 6. Seed Sample Orders
        if (orderRepository.count() == 0 && customerUser != null) {
            // Order 1 (Delivered)
            if (laptopProduct != null) {
                Order order1 = Order.builder()
                        .user(customerUser)
                        .coupon(welcomeCoupon)
                        .totalAmount(new BigDecimal("17091000.00")) // (18990000 * 0.92) - 10% coupon = 17470800 * 0.9 = 15723720 (approx or exact, let's keep it simple)
                        .discountAmount(new BigDecimal("1899000.00"))
                        .status("DELIVERED")
                        .shippingName("Khách hàng mẫu")
                        .shippingAddress("Hà Nội")
                        .shippingPhone("0911111111")
                        .note("Đã thanh toán qua chuyển khoản.")
                        .build();

                OrderItem item1 = OrderItem.builder()
                        .order(order1)
                        .product(laptopProduct)
                        .productName(laptopProduct.getName())
                        .quantity(1)
                        .price(laptopProduct.getPrice())
                        .build();

                order1.setItems(List.of(item1));
                orderRepository.save(order1);
            }

            // Order 2 (Pending)
            if (phoneProduct != null) {
                Order order2 = Order.builder()
                        .user(customerUser)
                        .totalAmount(new BigDecimal("1266500.00"))
                        .discountAmount(new BigDecimal("223500.00"))
                        .status("PENDING")
                        .shippingName("Khách hàng mẫu")
                        .shippingAddress("Hà Nội")
                        .shippingPhone("0911111111")
                        .note("Giao hàng ngoài giờ hành chính.")
                        .build();

                OrderItem item2 = OrderItem.builder()
                        .order(order2)
                        .product(phoneProduct)
                        .productName(phoneProduct.getName())
                        .quantity(1)
                        .price(phoneProduct.getPrice())
                        .build();

                order2.setItems(List.of(item2));
                orderRepository.save(order2);
            }
        }
    }
}
