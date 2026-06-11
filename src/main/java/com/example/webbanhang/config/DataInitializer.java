package com.example.webbanhang.config;

import com.example.webbanhang.security.PasswordService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true", matchIfMissing = true)
public class DataInitializer implements CommandLineRunner {
    private final JdbcTemplate jdbc;
    private final PasswordService passwordService;

    public DataInitializer(JdbcTemplate jdbc, PasswordService passwordService) {
        this.jdbc = jdbc;
        this.passwordService = passwordService;
    }

    @Override
    public void run(String... args) {
        createTables();
        seedData();
    }

    private void createTables() {
        // 1. Independent tables (no foreign keys)
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    username VARCHAR(80) NOT NULL UNIQUE,
                    email VARCHAR(160) NOT NULL UNIQUE,
                    password_hash VARCHAR(128) NOT NULL,
                    role VARCHAR(30) NOT NULL,
                    full_name VARCHAR(160),
                    phone VARCHAR(40),
                    address VARCHAR(255),
                    avatar_url VARCHAR(500),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """);

        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS categories (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(120) NOT NULL UNIQUE,
                    description VARCHAR(500)
                )
                """);

        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS coupons (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    code VARCHAR(50) NOT NULL UNIQUE,
                    discount_percent INT NOT NULL,
                    active BOOLEAN DEFAULT TRUE,
                    start_date DATE,
                    end_date DATE
                )
                """);

        // 2. Tables dependent only on previous ones
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS password_resets (
                    email VARCHAR(160) PRIMARY KEY,
                    otp_code VARCHAR(10) NOT NULL,
                    expiry_time TIMESTAMP NOT NULL
                )
                """);

        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS products (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(180) NOT NULL,
                    description TEXT,
                    price DECIMAL(12,2) NOT NULL,
                    stock INT NOT NULL,
                    image_url VARCHAR(500),
                    category_id BIGINT,
                    featured BOOLEAN DEFAULT FALSE,
                    discount_percent INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (category_id) REFERENCES categories(id)
                )
                """);

        // 3. Tables dependent on users, coupons, and products
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS user_coupons (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    user_id BIGINT NOT NULL,
                    coupon_id BIGINT NOT NULL,
                    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY uk_user_coupon (user_id, coupon_id),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (coupon_id) REFERENCES coupons(id)
                )
                """);

        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS wishlists (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    user_id BIGINT NOT NULL,
                    product_id BIGINT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY uk_wish_user_product (user_id, product_id),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (product_id) REFERENCES products(id)
                )
                """);

        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS price_history (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    product_id BIGINT NOT NULL,
                    old_price DECIMAL(12,2),
                    new_price DECIMAL(12,2),
                    old_discount INT,
                    new_discount INT,
                    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products(id)
                )
                """);

        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS cart_items (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    user_id BIGINT NOT NULL,
                    product_id BIGINT NOT NULL,
                    quantity INT NOT NULL,
                    UNIQUE KEY uk_cart_user_product (user_id, product_id),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (product_id) REFERENCES products(id)
                )
                """);

        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS orders (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    user_id BIGINT NOT NULL,
                    coupon_id BIGINT,
                    total_amount DECIMAL(12,2) NOT NULL,
                    discount_amount DECIMAL(12,2) NOT NULL,
                    status VARCHAR(30) NOT NULL,
                    shipping_name VARCHAR(160) NOT NULL,
                    shipping_address VARCHAR(255) NOT NULL,
                    shipping_phone VARCHAR(40) NOT NULL,
                    note VARCHAR(500),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (coupon_id) REFERENCES coupons(id)
                )
                """);

        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS order_items (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    order_id BIGINT NOT NULL,
                    product_id BIGINT NOT NULL,
                    product_name VARCHAR(180) NOT NULL,
                    quantity INT NOT NULL,
                    price DECIMAL(12,2) NOT NULL,
                    FOREIGN KEY (order_id) REFERENCES orders(id),
                    FOREIGN KEY (product_id) REFERENCES products(id)
                )
                """);

        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS reviews (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    user_id BIGINT NOT NULL,
                    product_id BIGINT NOT NULL,
                    rating INT NOT NULL,
                    comment VARCHAR(1000),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY uk_review_user_product (user_id, product_id),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (product_id) REFERENCES products(id)
                )
                """);

        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS ranks (
                    id VARCHAR(50) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    subtitle VARCHAR(100),
                    icon VARCHAR(50),
                    description VARCHAR(500),
                    min_spent DECIMAL(12,2) NOT NULL,
                    color VARCHAR(50),
                    css_class VARCHAR(50)
                )
                """);

        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS recycle_bin (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    entity_type VARCHAR(50) NOT NULL,
                    entity_id BIGINT NOT NULL,
                    display_name VARCHAR(255) NOT NULL,
                    original_data TEXT NOT NULL,
                    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """);

        // 4. Schema upgrades
        addColumnIfMissing("users", "avatar_url", "VARCHAR(500)");
        addColumnIfMissing("users", "status", "VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'");
        addColumnIfMissing("users", "ban_until", "TIMESTAMP NULL DEFAULT NULL");
        addColumnIfMissing("coupons", "max_uses", "INT DEFAULT NULL");
        addColumnIfMissing("coupons", "used_count", "INT NOT NULL DEFAULT 0");
    }

    private void seedData() {
        Long users = jdbc.queryForObject("SELECT COUNT(*) FROM users", Long.class);
        if (users != null && users == 0) {
            jdbc.update("INSERT INTO users(username,email,password_hash,role,full_name,phone,address) VALUES(?,?,?,?,?,?,?)",
                    "admin", "admin@shop.local", passwordService.hash("admin123"), "ADMIN", "Quan tri vien", "0900000000", "Ho Chi Minh");
            jdbc.update("INSERT INTO users(username,email,password_hash,role,full_name,phone,address) VALUES(?,?,?,?,?,?,?)",
                    "customer", "customer@shop.local", passwordService.hash("customer123"), "CUSTOMER", "Khach hang mau", "0911111111", "Ha Noi");
        }

        Long categories = jdbc.queryForObject("SELECT COUNT(*) FROM categories", Long.class);
        if (categories != null && categories == 0) {
            jdbc.update("INSERT INTO categories(name,description) VALUES(?,?)", "Dien thoai", "Smartphone va phu kien di dong");
            jdbc.update("INSERT INTO categories(name,description) VALUES(?,?)", "Laptop", "May tinh xach tay cho hoc tap va lam viec");
            jdbc.update("INSERT INTO categories(name,description) VALUES(?,?)", "Gia dung", "Thiet bi tien ich trong nha");
        }

        Long products = jdbc.queryForObject("SELECT COUNT(*) FROM products", Long.class);
        if (products != null && products == 0) {
            addProduct("Astra Phone X", "Man hinh AMOLED, camera 50MP, pin 5000mAh.", "8990000", 35, 1L, true, 10, "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900");
            addProduct("NovaBook Air 14", "Laptop mong nhe, chip tiet kiem dien, RAM 16GB.", "18990000", 18, 2L, true, 8, "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900");
            addProduct("Bep dien MiniCook", "Bep dien nho gon, dieu khien cam ung, de ve sinh.", "1290000", 60, 3L, false, 0, "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900");
            addProduct("Tai nghe Pulse Buds", "Chong on chu dong, hop sac USB-C, am bass ro.", "1490000", 80, 1L, true, 15, "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=900");
            addProduct("WorkStation Pro", "Laptop hieu nang cao cho lap trinh va thiet ke.", "32990000", 10, 2L, false, 5, "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900");
            addProduct("May hut bui Swift", "Cong suat manh, dau hut linh hoat, hop bui lon.", "2490000", 25, 3L, false, 12, "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900");
        }

        Long coupons = jdbc.queryForObject("SELECT COUNT(*) FROM coupons", Long.class);
        if (coupons != null && coupons == 0) {
            jdbc.update("INSERT INTO coupons(code,discount_percent,active,start_date,end_date) VALUES(?,?,?,?,?)",
                    "WELCOME10", 10, true, "2026-01-01", "2026-12-31");
            jdbc.update("INSERT INTO coupons(code,discount_percent,active,start_date,end_date) VALUES(?,?,?,?,?)",
                    "SALE20", 20, true, "2026-01-01", "2026-12-31");
        }

        Long ranksCount = jdbc.queryForObject("SELECT COUNT(*) FROM ranks", Long.class);
        if (ranksCount != null && ranksCount == 0) {
            jdbc.update("INSERT INTO ranks(id, name, subtitle, icon, description, min_spent, color, css_class) VALUES(?,?,?,?,?,?,?,?)",
                    "shopper", "Shopper", "Người qua đường", "🛍️", "Mới chân ướt chân ráo — mọi hành trình đều bắt đầu từ đây.", 0, "#334155", "rank-shopper");
            jdbc.update("INSERT INTO ranks(id, name, subtitle, icon, description, min_spent, color, css_class) VALUES(?,?,?,?,?,?,?,?)",
                    "shark", "Shark", "Cá mập tập sự", "🦈", "Đã bắt đầu chi tiêu mạnh tay — bản năng thị trường đang thức tỉnh.", 500000, "#93c5fd", "rank-shark");
            jdbc.update("INSERT INTO ranks(id, name, subtitle, icon, description, min_spent, color, css_class) VALUES(?,?,?,?,?,?,?,?)",
                    "angel", "Angel Investor", "Nhà đầu tư thiên thần", "👼", "Chi tiêu hào phóng, tầm nhìn xa. Những deal tốt không bao giờ bỏ qua.", 2000000, "#c4b5fd", "rank-angel");
            jdbc.update("INSERT INTO ranks(id, name, subtitle, icon, description, min_spent, color, css_class) VALUES(?,?,?,?,?,?,?,?)",
                    "unicorn", "Unicorn", "Kỳ lân công nghệ", "🦄", "Hiếm có khó tìm. Danh hiệu lấp lánh dành cho những tâm hồn mua sắm đặc biệt.", 5000000, "#f0abfc", "rank-unicorn");
            jdbc.update("INSERT INTO ranks(id, name, subtitle, icon, description, min_spent, color, css_class) VALUES(?,?,?,?,?,?,?,?)",
                    "tycoon", "Tycoon", "Trùm tài phiệt", "💰", "Vàng chảy theo bước chân. Chỉ những tay chi tiêu đẳng cấp mới chạm tới đây.", 15000000, "#fbbf24", "rank-tycoon");
        }

        // Auto-repair category relationships for orphaned products if category "Dien thoai" (ID=1) exists
        try {
            Integer hasPhoneCategory = jdbc.queryForObject("SELECT COUNT(*) FROM categories WHERE id = 1", Integer.class);
            if (hasPhoneCategory != null && hasPhoneCategory > 0) {
                jdbc.update("UPDATE products SET category_id = 1 WHERE category_id IS NULL AND (name LIKE '%Phone%' OR name LIKE '%Tai nghe%')");
            }
        } catch (Exception e) {
            // Ignore
        }
    }

    private void addProduct(String name, String description, String price, int stock, long categoryId,
                            boolean featured, int discountPercent, String imageUrl) {
        jdbc.update("""
                        INSERT INTO products(name,description,price,stock,image_url,category_id,featured,discount_percent)
                        VALUES(?,?,?,?,?,?,?,?)
                        """,
                name, description, new BigDecimal(price), stock, imageUrl, categoryId, featured, discountPercent);
    }

    private void addColumnIfMissing(String table, String column, String definition) {
        Integer exists = jdbc.query("""
                        SELECT COUNT(*)
                        FROM information_schema.columns
                        WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
                        """,
                rs -> rs.next() ? rs.getInt(1) : 0, table, column);
        if (exists == null || exists == 0) {
            jdbc.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
        }
    }
}
