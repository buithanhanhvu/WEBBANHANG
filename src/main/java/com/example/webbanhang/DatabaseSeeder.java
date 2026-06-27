package com.example.webbanhang;

import com.example.webbanhang.domain.*;
import com.example.webbanhang.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final RankRepository rankRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CouponRepository couponRepository;
    private final OrderRepository orderRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(
            RankRepository rankRepository,
            CategoryRepository categoryRepository,
            ProductRepository productRepository,
            UserRepository userRepository,
            CouponRepository couponRepository,
            OrderRepository orderRepository,
            PasswordEncoder passwordEncoder) {
        this.rankRepository = rankRepository;
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.couponRepository = couponRepository;
        this.orderRepository = orderRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // 1. Seed Ranks
        if (rankRepository.count() == 0) {
            rankRepository.saveAll(List.of(
                Rank.builder()
                        .id("shopper")
                        .name("Shopper")
                        .subtitle("Người qua đường")
                        .icon("🛍️")
                        .description("Mới chân ướt chân ráo — mọi hành trình đều bắt đầu từ đây.")
                        .minSpent(BigDecimal.ZERO)
                        .color("#334155")
                        .cssClass("rank-shopper")
                        .build(),
                Rank.builder()
                        .id("shark")
                        .name("Shark")
                        .subtitle("Cá mập tập sự")
                        .icon("🦈")
                        .description("Đã bắt đầu chi tiêu mạnh tay — bản năng thị trường đang thức tỉnh.")
                        .minSpent(new BigDecimal("500000"))
                        .color("#93c5fd")
                        .cssClass("rank-shark")
                        .build(),
                Rank.builder()
                        .id("angel")
                        .name("Angel Investor")
                        .subtitle("Nhà đầu tư thiên thần")
                        .icon("👼")
                        .description("Chi tiêu hào phóng, tầm nhìn xa. Những deal tốt không bao giờ bỏ qua.")
                        .minSpent(new BigDecimal("2000000"))
                        .color("#c4b5fd")
                        .cssClass("rank-angel")
                        .build(),
                Rank.builder()
                        .id("unicorn")
                        .name("Unicorn")
                        .subtitle("Kỳ lân công nghệ")
                        .icon("🦄")
                        .description("Hiếm có khó tìm. Danh hiệu lấp lánh dành cho những tâm hồn mua sắm đặc biệt.")
                        .minSpent(new BigDecimal("5000000"))
                        .color("#f0abfc")
                        .cssClass("rank-unicorn")
                        .build(),
                Rank.builder()
                        .id("tycoon")
                        .name("Tycoon")
                        .subtitle("Trùm tài phiệt")
                        .icon("💰")
                        .description("Vàng chảy theo bước chân. Chỉ những tay chi tiêu đẳng cấp mới chạm tới đây.")
                        .minSpent(new BigDecimal("15000000"))
                        .color("#fbbf24")
                        .cssClass("rank-tycoon")
                        .build()
            ));
        }

        // 2. Seed Categories
        if (categoryRepository.count() == 0) {
            categoryRepository.saveAll(List.of(
                Category.builder().name("Điện thoại").description("Smartphone và phụ kiện di động").build(),
                Category.builder().name("Laptop").description("Máy tính xách tay cho học tập và làm việc").build(),
                Category.builder().name("Gia dụng").description("Thiết bị tiện ích trong nhà").build()
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
                        .build()
            ));
        }

        // Fetch products and coupons for order association
        List<Product> products = productRepository.findAll();
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
