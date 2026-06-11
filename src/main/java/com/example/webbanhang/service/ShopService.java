package com.example.webbanhang.service;

import com.example.webbanhang.domain.OrderStatus;
import com.example.webbanhang.dto.Requests.CartRequest;
import com.example.webbanhang.dto.Requests.CheckoutRequest;
import com.example.webbanhang.dto.Requests.CouponRequest;
import com.example.webbanhang.dto.Requests.ReviewRequest;
import com.example.webbanhang.exception.BadRequestException;
import com.example.webbanhang.exception.ResourceNotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ShopService {
    private final JdbcTemplate jdbc;
    private RealtimeService realtimeService;

    public ShopService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // Setter injection để tránh circular dependency
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setRealtimeService(RealtimeService realtimeService) {
        this.realtimeService = realtimeService;
    }

    public Map<String, Object> cart(long userId) {
        List<Map<String, Object>> items = jdbc.queryForList("""
                SELECT ci.id, ci.product_id productId, ci.quantity, p.name, p.price, p.stock, p.image_url imageUrl,
                       p.discount_percent discountPercent,
                       ROUND(p.price * (100 - p.discount_percent) / 100, 2) salePrice,
                       ROUND(ci.quantity * p.price * (100 - p.discount_percent) / 100, 2) lineTotal
                FROM cart_items ci
                JOIN products p ON p.id=ci.product_id
                WHERE ci.user_id=?
                ORDER BY ci.id DESC
                """, userId);
        BigDecimal subtotal = items.stream()
                .map(item -> (BigDecimal) item.get("lineTotal"))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", items);
        result.put("subtotal", subtotal);
        return result;
    }

    public Map<String, Object> addToCart(long userId, CartRequest request) {
        validateCartRequest(request);
        Map<String, Object> product = product(request.productId());
        int stock = ((Number) product.get("stock")).intValue();
        if (request.quantity() > stock) {
            throw new BadRequestException("Quantity exceeds stock");
        }
        Integer existing = jdbc.query("SELECT quantity FROM cart_items WHERE user_id=? AND product_id=?",
                rs -> rs.next() ? rs.getInt("quantity") : null, userId, request.productId());
        if (existing == null) {
            jdbc.update("INSERT INTO cart_items(user_id,product_id,quantity) VALUES(?,?,?)", userId, request.productId(), request.quantity());
        } else {
            int next = existing + request.quantity();
            if (next > stock) {
                throw new BadRequestException("Quantity exceeds stock");
            }
            jdbc.update("UPDATE cart_items SET quantity=? WHERE user_id=? AND product_id=?", next, userId, request.productId());
        }
        return cart(userId);
    }

    public Map<String, Object> updateCart(long userId, CartRequest request) {
        validateCartRequest(request);
        if (request.quantity() <= 0) {
            jdbc.update("DELETE FROM cart_items WHERE user_id=? AND product_id=?", userId, request.productId());
        } else {
            product(request.productId());
            jdbc.update("UPDATE cart_items SET quantity=? WHERE user_id=? AND product_id=?", request.quantity(), userId, request.productId());
        }
        return cart(userId);
    }

    public Map<String, Object> removeCartItem(long userId, long productId) {
        jdbc.update("DELETE FROM cart_items WHERE user_id=? AND product_id=?", userId, productId);
        return cart(userId);
    }

    public List<Map<String, Object>> coupons() {
        return jdbc.queryForList("SELECT * FROM coupons ORDER BY id DESC");
    }

    public Map<String, Object> createCoupon(CouponRequest request) {
        requireText(request.code(), "Coupon code is required");
        jdbc.update("INSERT INTO coupons(code,discount_percent,active,start_date,end_date,max_uses,used_count) VALUES(?,?,?,?,?,?,0)",
                request.code().trim().toUpperCase(), safePercent(request.discountPercent()), Boolean.TRUE.equals(request.active()),
                request.startDate(), request.endDate(),
                (request.maxUses() != null && request.maxUses() > 0) ? request.maxUses() : null);
        return one("SELECT * FROM coupons WHERE id=LAST_INSERT_ID()");
    }

    public Map<String, Object> updateCoupon(long id, CouponRequest request) {
        couponById(id);
        requireText(request.code(), "Coupon code is required");
        jdbc.update("UPDATE coupons SET code=?, discount_percent=?, active=?, start_date=?, end_date=?, max_uses=? WHERE id=?",
                request.code().trim().toUpperCase(), safePercent(request.discountPercent()), Boolean.TRUE.equals(request.active()),
                request.startDate(), request.endDate(),
                (request.maxUses() != null && request.maxUses() > 0) ? request.maxUses() : null,
                id);
        return couponById(id);
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteCoupon(long id) {
        couponById(id);
        jdbc.update("DELETE FROM user_coupons WHERE coupon_id=?", id);
        jdbc.update("UPDATE orders SET coupon_id=NULL WHERE coupon_id=?", id);
        jdbc.update("DELETE FROM coupons WHERE id=?", id);
    }

    public Map<String, Object> applyCoupon(String code, BigDecimal subtotal) {
        Map<String, Object> coupon = couponByCode(code);
        int percent = ((Number) coupon.get("discount_percent")).intValue();
        BigDecimal discount = subtotal.multiply(BigDecimal.valueOf(percent)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("coupon", coupon);
        result.put("discount", discount);
        result.put("total", subtotal.subtract(discount));
        return result;
    }

    @Transactional
    public Map<String, Object> checkout(long userId, CheckoutRequest request) {
        requireText(request.shippingName(), "Shipping name is required");
        requireText(request.shippingAddress(), "Shipping address is required");
        requireText(request.shippingPhone(), "Shipping phone is required");
        List<Map<String, Object>> items = jdbc.queryForList("""
                SELECT ci.product_id, ci.quantity, p.name, p.price, p.stock, p.discount_percent,
                       ROUND(p.price * (100 - p.discount_percent) / 100, 2) sale_price
                FROM cart_items ci
                JOIN products p ON p.id=ci.product_id
                WHERE ci.user_id=?
                """, userId);
        if (items.isEmpty()) {
            throw new BadRequestException("Cart is empty");
        }
        // Sắp xếp items theo product_id để tránh deadlock khi lock nhiều dòng
        items.sort((a, b) -> Long.compare(
            ((Number) a.get("product_id")).longValue(),
            ((Number) b.get("product_id")).longValue()
        ));
        BigDecimal subtotal = BigDecimal.ZERO;
        for (Map<String, Object> item : items) {
            int quantity = ((Number) item.get("quantity")).intValue();
            // Lock row để tránh race condition — đọc stock thực tế với FOR UPDATE
            Integer currentStock = jdbc.queryForObject(
                "SELECT stock FROM products WHERE id=? FOR UPDATE",
                Integer.class, item.get("product_id"));
            if (currentStock == null || quantity > currentStock) {
                throw new BadRequestException(item.get("name") + " không đủ hàng (chỉ còn " + (currentStock == null ? 0 : currentStock) + ")");
            }
            subtotal = subtotal.add(((BigDecimal) item.get("sale_price")).multiply(BigDecimal.valueOf(quantity)));
        }
        Long couponId = null;
        BigDecimal discount = BigDecimal.ZERO;
        if (request.couponCode() != null && !request.couponCode().isBlank()) {
            Map<String, Object> coupon = couponByCode(request.couponCode());
            couponId = ((Number) coupon.get("id")).longValue();
            // Verify user đã thu thập coupon này vào ví
            Integer owned = jdbc.query(
                "SELECT COUNT(*) FROM user_coupons WHERE user_id=? AND coupon_id=?",
                rs -> rs.next() ? rs.getInt(1) : 0, userId, couponId);
            if (owned == null || owned == 0) {
                throw new BadRequestException("Bạn chưa thu thập mã giảm giá này. Hãy vào mục Voucher để thu thập trước.");
            }
            int percent = ((Number) coupon.get("discount_percent")).intValue();
            discount = subtotal.multiply(BigDecimal.valueOf(percent)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }
        BigDecimal total = subtotal.subtract(discount);
        jdbc.update("""
                        INSERT INTO orders(user_id,coupon_id,total_amount,discount_amount,status,shipping_name,shipping_address,shipping_phone,note)
                        VALUES(?,?,?,?,?,?,?,?,?)
                        """,
                userId, couponId, total, discount, OrderStatus.PENDING.name(), request.shippingName(), request.shippingAddress(),
                request.shippingPhone(), request.note());
        Long orderId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        // Dùng voucher xong → xóa khỏi ví của user (mỗi người chỉ dùng 1 lần) và tăng used_count
        if (couponId != null) {
            jdbc.update("DELETE FROM user_coupons WHERE user_id=? AND coupon_id=?", userId, couponId);
            jdbc.update("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?", couponId);
        }
        for (Map<String, Object> item : items) {
            jdbc.update("INSERT INTO order_items(order_id,product_id,product_name,quantity,price) VALUES(?,?,?,?,?)",
                    orderId, item.get("product_id"), item.get("name"), item.get("quantity"), item.get("sale_price"));
            jdbc.update("UPDATE products SET stock=stock-? WHERE id=?", item.get("quantity"), item.get("product_id"));
        }
        jdbc.update("DELETE FROM cart_items WHERE user_id=?", userId);
        Map<String, Object> createdOrder = order(userId, orderId, false);
        // Broadcast: tồn kho thay đổi + đơn hàng mới
        if (realtimeService != null) {
            realtimeService.stockChanged();
            realtimeService.orderChanged("created", Map.of("id", orderId));
        }
        return createdOrder;
    }

    public List<Map<String, Object>> orders(long userId, boolean admin) {
        if (admin) {
            return jdbc.queryForList("""
                    SELECT o.*, u.username, u.email FROM orders o
                    JOIN users u ON u.id=o.user_id
                    ORDER BY o.created_at DESC
                    """);
        }
        return jdbc.queryForList("SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC", userId);
    }

    public Map<String, Object> order(long userId, long orderId, boolean admin) {
        Map<String, Object> order = admin
                ? one("SELECT o.*, u.username, u.email FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=?", orderId)
                : one("SELECT * FROM orders WHERE id=? AND user_id=?", orderId, userId);
        order.put("items", jdbc.queryForList("""
                SELECT oi.*, p.image_url imageUrl, p.description productDescription
                FROM order_items oi
                JOIN products p ON p.id=oi.product_id
                WHERE oi.order_id=?
                ORDER BY oi.id
                """, orderId));
        return order;
    }

    // ── Wishlist ──
    public List<Map<String, Object>> wishlist(long userId) {
        return jdbc.queryForList("""
            SELECT p.*, c.name category_name,
                   COALESCE(AVG(r.rating),0) average_rating,
                   COUNT(r.id) review_count
            FROM wishlists w
            JOIN products p ON p.id = w.product_id
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN reviews r ON r.product_id = p.id
            WHERE w.user_id = ?
            GROUP BY p.id, c.name, w.created_at
            ORDER BY w.created_at DESC
            """, userId);
    }

    public Map<String, Object> toggleWishlist(long userId, long productId) {
        product(productId); // validate exists
        Integer exists = jdbc.query(
            "SELECT COUNT(*) FROM wishlists WHERE user_id=? AND product_id=?",
            rs -> rs.next() ? rs.getInt(1) : 0, userId, productId);
        boolean added;
        if (exists != null && exists > 0) {
            jdbc.update("DELETE FROM wishlists WHERE user_id=? AND product_id=?", userId, productId);
            added = false;
        } else {
            jdbc.update("INSERT INTO wishlists(user_id,product_id) VALUES(?,?)", userId, productId);
            added = true;
        }
        return Map.of("added", added, "productId", productId);
    }

    public List<Long> wishlistIds(long userId) {
        return jdbc.queryForList("SELECT product_id FROM wishlists WHERE user_id=?", Long.class, userId);
    }

    // Trả về sản phẩm trong wishlist đang có giảm giá mới (trong 7 ngày gần nhất)
    // Detect cả tăng discount VÀ giảm giá gốc
    public List<Map<String, Object>> wishlistSaleNotifications(long userId) {
        return jdbc.queryForList("""
            SELECT p.id, p.name, p.image_url imageUrl, p.price, p.discount_percent discountPercent,
                   ph.old_price oldPrice, ph.new_price newPrice, ph.old_discount oldDiscount,
                   ph.new_discount newDiscount, ph.changed_at changedAt
            FROM wishlists w
            JOIN products p ON p.id = w.product_id
            JOIN price_history ph ON ph.product_id = p.id
            WHERE w.user_id = ?
              AND ph.changed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
              AND (ph.new_price * (100 - ph.new_discount) / 100) < (ph.old_price * (100 - ph.old_discount) / 100)
            ORDER BY ph.changed_at DESC
            """, userId);
    }

    @Transactional
    public Map<String, Object> cancelOrder(long userId, long orderId) {
        Map<String, Object> o = one("SELECT * FROM orders WHERE id=? AND user_id=?", orderId, userId);
        String status = String.valueOf(o.get("status"));
        if (!"PENDING".equals(status)) {
            throw new BadRequestException("Chỉ có thể hủy đơn hàng đang chờ xác nhận");
        }
        jdbc.update("UPDATE orders SET status='CANCELLED' WHERE id=?", orderId);
        // Hoàn lại tồn kho
        List<Map<String, Object>> items = jdbc.queryForList(
            "SELECT product_id, quantity FROM order_items WHERE order_id=?", orderId);
        for (Map<String, Object> item : items) {
            jdbc.update("UPDATE products SET stock=stock+? WHERE id=?",
                item.get("quantity"), item.get("product_id"));
        }
        if (realtimeService != null) realtimeService.stockChanged();
        return order(userId, orderId, false);
    }

    @Transactional
    public Map<String, Object> updateOrderStatus(long orderId, String status) {
        try {
            OrderStatus.valueOf(status);
        } catch (Exception ex) {
            throw new BadRequestException("Invalid order status");
        }

        Map<String, Object> o = one("SELECT * FROM orders WHERE id=?", orderId);
        String oldStatus = String.valueOf(o.get("status"));

        if (!oldStatus.equals(status)) {
            // Nếu đổi sang CANCELLED → Hoàn lại tồn kho
            if ("CANCELLED".equals(status)) {
                List<Map<String, Object>> items = jdbc.queryForList(
                    "SELECT product_id, quantity FROM order_items WHERE order_id=?", orderId);
                for (Map<String, Object> item : items) {
                    jdbc.update("UPDATE products SET stock=stock+? WHERE id=?",
                        item.get("quantity"), item.get("product_id"));
                }
                if (realtimeService != null) realtimeService.stockChanged();
            } 
            // Nếu khôi phục từ CANCELLED sang trạng thái khác → Trừ kho trở lại
            else if ("CANCELLED".equals(oldStatus)) {
                List<Map<String, Object>> items = jdbc.queryForList(
                    "SELECT product_id, quantity, product_name FROM order_items WHERE order_id=?", orderId);
                // Sắp xếp để tránh deadlock khi khóa dòng
                items.sort((a, b) -> Long.compare(
                    ((Number) a.get("product_id")).longValue(),
                    ((Number) b.get("product_id")).longValue()
                ));
                // Kiểm tra tồn kho trước
                for (Map<String, Object> item : items) {
                    int quantity = ((Number) item.get("quantity")).intValue();
                    Integer currentStock = jdbc.queryForObject(
                        "SELECT stock FROM products WHERE id=? FOR UPDATE",
                        Integer.class, item.get("product_id"));
                    if (currentStock == null || quantity > currentStock) {
                        throw new BadRequestException(item.get("product_name") + " không đủ hàng để khôi phục đơn (chỉ còn " + (currentStock == null ? 0 : currentStock) + ")");
                    }
                }
                // Trừ kho
                for (Map<String, Object> item : items) {
                    jdbc.update("UPDATE products SET stock=stock-? WHERE id=?",
                        item.get("quantity"), item.get("product_id"));
                }
                if (realtimeService != null) realtimeService.stockChanged();
            }

            jdbc.update("UPDATE orders SET status=? WHERE id=?", status, orderId);
        }

        return order(0, orderId, true);
    }

    public Map<String, Object> review(long userId, ReviewRequest request) {
        if (request.productId() == null || request.rating() == null || request.rating() < 1 || request.rating() > 5) {
            throw new BadRequestException("Review requires productId and rating from 1 to 5");
        }
        product(request.productId());
        Integer purchased = jdbc.query("""
                SELECT COUNT(*) FROM orders o
                JOIN order_items oi ON oi.order_id=o.id
                WHERE o.user_id=? AND oi.product_id=? AND o.status = 'DELIVERED'
                """, rs -> rs.next() ? rs.getInt(1) : 0, userId, request.productId());
        if (purchased == null || purchased == 0) {
            throw new BadRequestException("Bạn chỉ có thể đánh giá sau khi đã nhận hàng");
        }
        jdbc.update("""
                        INSERT INTO reviews(user_id,product_id,rating,comment)
                        VALUES(?,?,?,?)
                        ON DUPLICATE KEY UPDATE rating=VALUES(rating), comment=VALUES(comment), created_at=CURRENT_TIMESTAMP
                        """,
                userId, request.productId(), request.rating(), request.comment());
        return one("""
                SELECT r.*, u.username FROM reviews r
                JOIN users u ON u.id=r.user_id
                WHERE r.user_id=? AND r.product_id=?
                """, userId, request.productId());
    }

    public List<Map<String, Object>> productReviews(long productId) {
        product(productId);
        return jdbc.queryForList("""
                SELECT r.*, u.username FROM reviews r
                JOIN users u ON u.id=r.user_id
                WHERE r.product_id=?
                ORDER BY r.created_at DESC
                """, productId);
    }

    // ── Voucher (user_coupons) ──
    public List<Map<String, Object>> availableVouchers(long userId) {
        return jdbc.queryForList("""
            SELECT c.*,
                   (SELECT COUNT(*) FROM user_coupons uc WHERE uc.user_id=? AND uc.coupon_id=c.id) AS collected,
                   (SELECT COUNT(*) FROM user_coupons uc2 WHERE uc2.coupon_id=c.id) AS collected_count
            FROM coupons c
            WHERE c.active = TRUE
            ORDER BY c.id DESC
            """, userId);
    }

    public List<Map<String, Object>> myVouchers(long userId) {
        return jdbc.queryForList("""
            SELECT c.*, uc.collected_at
            FROM user_coupons uc
            JOIN coupons c ON c.id = uc.coupon_id
            WHERE uc.user_id = ?
            ORDER BY uc.collected_at DESC
            """, userId);
    }

    public Map<String, Object> collectVoucher(long userId, long couponId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT * FROM coupons WHERE id=? AND active=TRUE", couponId);
        if (rows.isEmpty()) throw new BadRequestException("Mã giảm giá không tồn tại hoặc đã tắt");
        Map<String, Object> c = rows.get(0);

        // Kiểm tra còn phiếu để phát không (max_uses = tổng phiếu phát ra)
        Object maxUses = c.get("max_uses");
        if (maxUses != null) {
            int max = ((Number) maxUses).intValue();
            // Đếm số người đã thu thập
            Integer collected = jdbc.query(
                "SELECT COUNT(*) FROM user_coupons WHERE coupon_id=?",
                rs -> rs.next() ? rs.getInt(1) : 0, couponId);
            if (collected != null && collected >= max) {
                throw new BadRequestException("Mã giảm giá đã hết — không còn phiếu để nhận");
            }
        }

        // Kiểm tra user đã thu thập chưa
        Integer already = jdbc.query(
            "SELECT COUNT(*) FROM user_coupons WHERE user_id=? AND coupon_id=?",
            rs -> rs.next() ? rs.getInt(1) : 0, userId, couponId);
        if (already != null && already > 0) throw new BadRequestException("Bạn đã thu thập mã này rồi");

        jdbc.update("INSERT INTO user_coupons(user_id,coupon_id) VALUES(?,?)", userId, couponId);
        return rows.get(0);
    }

    public List<Map<String, Object>> allUsers() {
        return jdbc.queryForList(
            "SELECT id, username, full_name, email, phone, address, role, avatar_url, status, ban_until FROM users ORDER BY id DESC"
        );
    }
    public List<Map<String, Object>> purchasedProducts(long userId) {
        return jdbc.queryForList("""
            SELECT
                p.id, p.name, p.image_url imageUrl, p.price, p.discount_percent discountPercent,
                (SELECT AVG(r2.rating) FROM reviews r2 WHERE r2.product_id = p.id) avgRating,
                (SELECT COUNT(*) FROM reviews r2 WHERE r2.product_id = p.id) reviewCount,
                r.rating myRating, r.comment myComment, r.created_at myReviewedAt
            FROM (
                SELECT DISTINCT oi.product_id, MAX(o.created_at) AS last_ordered
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                WHERE o.user_id = ? AND o.status = 'DELIVERED'
                GROUP BY oi.product_id
            ) op
            JOIN products p ON p.id = op.product_id
            LEFT JOIN reviews r ON r.product_id = p.id AND r.user_id = ?
            ORDER BY op.last_ordered DESC
            """, userId, userId);
    }

    public void deleteUser(long id) {
        // Không cho xóa admin
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT role FROM users WHERE id=?", id);
        if (rows.isEmpty()) throw new com.example.webbanhang.exception.ResourceNotFoundException("User not found");
        if ("ADMIN".equals(rows.get(0).get("role"))) {
            throw new com.example.webbanhang.exception.BadRequestException("Cannot delete admin account");
        }
        // Cascade delete tất cả dữ liệu liên quan
        jdbc.update("DELETE FROM wishlists WHERE user_id=?", id);
        jdbc.update("DELETE FROM user_coupons WHERE user_id=?", id);
        jdbc.update("DELETE FROM cart_items WHERE user_id=?", id);
        jdbc.update("DELETE FROM reviews WHERE user_id=?", id);
        // Xóa order_items qua join orders
        jdbc.update("DELETE oi FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.user_id=?", id);
        jdbc.update("DELETE FROM orders WHERE user_id=?", id);
        jdbc.update("DELETE FROM users WHERE id=?", id);
    }

    public void updateUserStatus(long id, String status, Integer banDays) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT role FROM users WHERE id=?", id);
        if (rows.isEmpty()) throw new ResourceNotFoundException("User not found");
        if ("ADMIN".equals(rows.get(0).get("role"))) {
            throw new BadRequestException("Cannot change admin status");
        }

        if ("BANNED".equals(status)) {
            if (banDays != null && banDays > 0) {
                java.time.LocalDateTime until = java.time.LocalDateTime.now().plusDays(banDays);
                jdbc.update("UPDATE users SET status='BANNED', ban_until=? WHERE id=?", until, id);
            } else {
                jdbc.update("UPDATE users SET status='BANNED', ban_until=NULL WHERE id=?", id);
            }
        } else {
            jdbc.update("UPDATE users SET status='ACTIVE', ban_until=NULL WHERE id=?", id);
        }
    }

    public Map<String, Object> dashboard(String period) {
        Map<String, Object> result = new LinkedHashMap<>();

        java.time.LocalDateTime start = null;
        if ("today".equalsIgnoreCase(period)) {
            start = java.time.LocalDate.now().atStartOfDay();
        } else if ("week".equalsIgnoreCase(period)) {
            start = java.time.LocalDate.now().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).atStartOfDay();
        } else if ("month".equalsIgnoreCase(period)) {
            start = java.time.LocalDate.now().withDayOfMonth(1).atStartOfDay();
        } else if ("year".equalsIgnoreCase(period)) {
            start = java.time.LocalDate.now().withDayOfYear(1).atStartOfDay();
        }

        String pCountSql = "SELECT COUNT(*) FROM products";
        String oCountSql = "SELECT COUNT(*) FROM orders";
        String uCountSql = "SELECT COUNT(*) FROM users WHERE role='CUSTOMER'";
        String revSql = "SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status <> 'CANCELLED'";

        if (start != null) {
            Object[] args = new Object[]{start};
            result.put("products", jdbc.queryForObject(pCountSql + " WHERE created_at >= ?", Long.class, args));
            result.put("orders", jdbc.queryForObject(oCountSql + " WHERE created_at >= ?", Long.class, args));
            result.put("customers", jdbc.queryForObject(uCountSql + " AND created_at >= ?", Long.class, args));
            result.put("revenue", jdbc.queryForObject(revSql + " AND created_at >= ?", BigDecimal.class, args));
        } else {
            result.put("products", jdbc.queryForObject(pCountSql, Long.class));
            result.put("orders", jdbc.queryForObject(oCountSql, Long.class));
            result.put("customers", jdbc.queryForObject(uCountSql, Long.class));
            result.put("revenue", jdbc.queryForObject(revSql, BigDecimal.class));
        }

        result.put("latestOrders", orders(0, true).stream().limit(6).toList());
        result.put("lowStock", jdbc.queryForList("SELECT id,name,stock FROM products WHERE stock<=10 ORDER BY stock ASC"));

        // ── Order Status counts ──
        String orderStatusSql = "SELECT status as label, COUNT(*) as value FROM orders";
        if (start != null) {
            result.put("orderStatusCounts", jdbc.queryForList(orderStatusSql + " WHERE created_at >= ? GROUP BY status", start));
        } else {
            result.put("orderStatusCounts", jdbc.queryForList(orderStatusSql + " GROUP BY status"));
        }

        // ── Category Revenue distribution ──
        String catRevSql = "SELECT c.name as label, COALESCE(SUM(oi.price * oi.quantity),0) as value " +
                           "FROM order_items oi " +
                           "JOIN products p ON oi.product_id = p.id " +
                           "JOIN categories c ON p.category_id = c.id " +
                           "JOIN orders o ON oi.order_id = o.id " +
                           "WHERE o.status <> 'CANCELLED' ";
        if (start != null) {
            result.put("categoryRevenue", jdbc.queryForList(catRevSql + "AND o.created_at >= ? GROUP BY c.name ORDER BY value DESC", start));
        } else {
            result.put("categoryRevenue", jdbc.queryForList(catRevSql + "GROUP BY c.name ORDER BY value DESC"));
        }

        // ── Top Products ──
        String topProdSql = "SELECT p.id, p.name, p.image_url as imageUrl, COALESCE(SUM(oi.quantity),0) as quantitySold, COALESCE(SUM(oi.price * oi.quantity),0) as revenue " +
                            "FROM order_items oi " +
                            "JOIN products p ON oi.product_id = p.id " +
                            "JOIN orders o ON oi.order_id = o.id " +
                            "WHERE o.status <> 'CANCELLED' ";
        if (start != null) {
            result.put("topProducts", jdbc.queryForList(topProdSql + "AND o.created_at >= ? GROUP BY p.id, p.name, p.image_url ORDER BY quantitySold DESC LIMIT 10", start));
        } else {
            result.put("topProducts", jdbc.queryForList(topProdSql + "GROUP BY p.id, p.name, p.image_url ORDER BY quantitySold DESC LIMIT 10"));
        }

        // ── Revenue Chart Data ──
        List<Map<String, Object>> chartData = new java.util.ArrayList<>();
        if ("today".equalsIgnoreCase(period)) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT HOUR(created_at) as hr, COALESCE(SUM(total_amount),0) as rev FROM orders WHERE status <> 'CANCELLED' AND created_at >= ? GROUP BY HOUR(created_at) ORDER BY HOUR(created_at)",
                start
            );
            for (Map<String, Object> r : rows) {
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("label", String.format("%02d:00", ((Number) r.get("hr")).intValue()));
                m.put("value", r.get("rev"));
                chartData.add(m);
            }
        } else if ("week".equalsIgnoreCase(period) || "month".equalsIgnoreCase(period)) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT DATE(created_at) as dt, COALESCE(SUM(total_amount),0) as rev FROM orders WHERE status <> 'CANCELLED' AND created_at >= ? GROUP BY DATE(created_at) ORDER BY DATE(created_at)",
                start
            );
            for (Map<String, Object> r : rows) {
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("label", r.get("dt").toString());
                m.put("value", r.get("rev"));
                chartData.add(m);
            }
        } else {
            // year or all
            String sql = "SELECT DATE_FORMAT(created_at, '%Y-%m') as dt, COALESCE(SUM(total_amount),0) as rev FROM orders WHERE status <> 'CANCELLED' ";
            List<Map<String, Object>> rows;
            if (start != null) {
                rows = jdbc.queryForList(sql + "AND created_at >= ? GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY DATE_FORMAT(created_at, '%Y-%m')", start);
            } else {
                rows = jdbc.queryForList(sql + "GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY DATE_FORMAT(created_at, '%Y-%m')");
            }
            for (Map<String, Object> r : rows) {
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("label", r.get("dt").toString());
                m.put("value", r.get("rev"));
                chartData.add(m);
            }
        }
        result.put("revenueChartData", chartData);

        return result;
    }

    private Map<String, Object> couponByCode(String code) {
        requireText(code, "Coupon code is required");
        Map<String, Object> coupon;
        try {
            coupon = one("SELECT * FROM coupons WHERE code=? AND active=TRUE", code.trim().toUpperCase());
        } catch (ResourceNotFoundException ex) {
            throw new BadRequestException("Mã giảm giá không tồn tại hoặc đã bị tắt");
        }
        LocalDate today = LocalDate.now();
        Object start = coupon.get("start_date");
        Object end   = coupon.get("end_date");
        if (start instanceof java.sql.Date date && today.isBefore(date.toLocalDate())) {
            throw new BadRequestException("Mã giảm giá chưa đến thời gian áp dụng");
        }
        if (end instanceof java.sql.Date date && today.isAfter(date.toLocalDate())) {
            throw new BadRequestException("Mã giảm giá đã hết hạn sử dụng");
        }
        // Không check hết lượt ở đây — giới hạn phát đã được enforce khi thu thập
        // Ai đã có trong ví (user_coupons) thì luôn được dùng
        return coupon;
    }

    private Map<String, Object> couponById(long id) {
        return one("SELECT * FROM coupons WHERE id=?", id);
    }

    private Map<String, Object> product(long id) {
        return one("SELECT * FROM products WHERE id=?", id);
    }

    private void validateCartRequest(CartRequest request) {
        if (request.productId() == null || request.quantity() == null) {
            throw new BadRequestException("Product and quantity are required");
        }
        if (request.quantity() < 1) {
            throw new BadRequestException("Quantity must be greater than zero");
        }
    }

    private int safePercent(Integer percent) {
        if (percent == null || percent < 0 || percent > 100) {
            throw new BadRequestException("Discount percent must be between 0 and 100");
        }
        return percent;
    }

    private Map<String, Object> one(String sql, Object... args) {
        List<Map<String, Object>> rows = jdbc.queryForList(sql, args);
        if (rows.isEmpty()) {
            throw new ResourceNotFoundException("Resource not found");
        }
        return new LinkedHashMap<>(rows.get(0));
    }

    private void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(message);
        }
    }

    public Map<String, Object> getUserSpendingStats(long userId, String period) {
        Map<String, Object> result = new LinkedHashMap<>();

        // Determine period start
        java.time.LocalDateTime periodStart = resolvePeriodStart(period);

        // 1. Overview cards — always show all-time breakdowns
        String baseSql = "SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id=? AND status <> 'CANCELLED'";
        java.time.LocalDateTime todayStart = java.time.LocalDate.now().atStartOfDay();
        java.time.LocalDateTime monthStart = java.time.LocalDate.now().withDayOfMonth(1).atStartOfDay();
        java.time.LocalDateTime yearStart = java.time.LocalDate.now().withDayOfYear(1).atStartOfDay();

        result.put("totalSpent", jdbc.queryForObject(baseSql, BigDecimal.class, userId));
        result.put("spentToday", jdbc.queryForObject(baseSql + " AND created_at >= ?", BigDecimal.class, userId, todayStart));
        result.put("spentThisMonth", jdbc.queryForObject(baseSql + " AND created_at >= ?", BigDecimal.class, userId, monthStart));
        result.put("spentThisYear", jdbc.queryForObject(baseSql + " AND created_at >= ?", BigDecimal.class, userId, yearStart));

        // Order count
        String countSql = "SELECT COUNT(*) FROM orders WHERE user_id=? AND status <> 'CANCELLED'";
        if (periodStart != null) {
            result.put("totalOrders", jdbc.queryForObject(countSql + " AND created_at >= ?", Long.class, userId, periodStart));
        } else {
            result.put("totalOrders", jdbc.queryForObject(countSql, Long.class, userId));
        }

        // 2. Spending by month of current year
        List<Map<String, Object>> monthlyRows = jdbc.queryForList(
            "SELECT MONTH(created_at) as monthNum, COALESCE(SUM(total_amount),0) as amount " +
            "FROM orders " +
            "WHERE user_id=? AND status <> 'CANCELLED' AND YEAR(created_at) = YEAR(CURDATE()) " +
            "GROUP BY MONTH(created_at) " +
            "ORDER BY MONTH(created_at)",
            userId
        );
        List<Map<String, Object>> monthlySpending = new java.util.ArrayList<>();
        for (Map<String, Object> r : monthlyRows) {
            Map<String, Object> m = new java.util.HashMap<>();
            m.put("label", "Tháng " + ((Number) r.get("monthNum")).intValue());
            m.put("value", r.get("amount"));
            monthlySpending.add(m);
        }
        result.put("monthlySpending", monthlySpending);

        // 3. Spending by Category (filtered by period)
        String catSql = "SELECT c.name as label, COALESCE(SUM(oi.price * oi.quantity),0) as value " +
                         "FROM order_items oi " +
                         "JOIN products p ON oi.product_id = p.id " +
                         "JOIN categories c ON p.category_id = c.id " +
                         "JOIN orders o ON oi.order_id = o.id " +
                         "WHERE o.user_id=? AND o.status <> 'CANCELLED' ";
        if (periodStart != null) {
            result.put("categorySpending", jdbc.queryForList(catSql + "AND o.created_at >= ? GROUP BY c.name ORDER BY value DESC", userId, periodStart));
        } else {
            result.put("categorySpending", jdbc.queryForList(catSql + "GROUP BY c.name ORDER BY value DESC", userId));
        }

        // 4. Top purchased products (filtered by period)
        String topProdSql = "SELECT p.id, p.name, p.image_url as imageUrl, COALESCE(SUM(oi.quantity),0) as quantity, COALESCE(SUM(oi.price * oi.quantity),0) as totalSpent " +
                            "FROM order_items oi " +
                            "JOIN products p ON oi.product_id = p.id " +
                            "JOIN orders o ON oi.order_id = o.id " +
                            "WHERE o.user_id=? AND o.status <> 'CANCELLED' ";
        if (periodStart != null) {
            result.put("topProducts", jdbc.queryForList(topProdSql + "AND o.created_at >= ? GROUP BY p.id, p.name, p.image_url ORDER BY quantity DESC LIMIT 5", userId, periodStart));
        } else {
            result.put("topProducts", jdbc.queryForList(topProdSql + "GROUP BY p.id, p.name, p.image_url ORDER BY quantity DESC LIMIT 5", userId));
        }

        // 5. Daily spending chart data (for selected period)
        List<Map<String, Object>> dailySpending = new java.util.ArrayList<>();
        if ("today".equalsIgnoreCase(period)) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT HOUR(created_at) as hr, COALESCE(SUM(total_amount),0) as amount FROM orders WHERE user_id=? AND status <> 'CANCELLED' AND created_at >= ? GROUP BY HOUR(created_at) ORDER BY HOUR(created_at)",
                userId, periodStart
            );
            for (Map<String, Object> r : rows) {
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("label", String.format("%02d:00", ((Number) r.get("hr")).intValue()));
                m.put("value", r.get("amount"));
                dailySpending.add(m);
            }
        } else if ("week".equalsIgnoreCase(period) || "month".equalsIgnoreCase(period)) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT DATE(created_at) as dt, COALESCE(SUM(total_amount),0) as amount FROM orders WHERE user_id=? AND status <> 'CANCELLED' AND created_at >= ? GROUP BY DATE(created_at) ORDER BY DATE(created_at)",
                userId, periodStart
            );
            for (Map<String, Object> r : rows) {
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("label", r.get("dt").toString());
                m.put("value", r.get("amount"));
                dailySpending.add(m);
            }
        } else {
            // year or all — group by month
            String sql = "SELECT DATE_FORMAT(created_at, '%Y-%m') as dt, COALESCE(SUM(total_amount),0) as amount FROM orders WHERE user_id=? AND status <> 'CANCELLED' ";
            List<Map<String, Object>> rows;
            if (periodStart != null) {
                rows = jdbc.queryForList(sql + "AND created_at >= ? GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY dt", userId, periodStart);
            } else {
                rows = jdbc.queryForList(sql + "GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY dt", userId);
            }
            for (Map<String, Object> r : rows) {
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("label", r.get("dt").toString());
                m.put("value", r.get("amount"));
                dailySpending.add(m);
            }
        }
        result.put("dailySpending", dailySpending);

        // 6. Recent orders with items (filtered by period, limit 20)
        String orderSql = "SELECT o.id, o.total_amount as totalAmount, o.status, o.created_at as createdAt " +
                          "FROM orders o WHERE o.user_id=? AND o.status <> 'CANCELLED' ";
        List<Map<String, Object>> orders;
        if (periodStart != null) {
            orders = jdbc.queryForList(orderSql + "AND o.created_at >= ? ORDER BY o.created_at DESC LIMIT 20", userId, periodStart);
        } else {
            orders = jdbc.queryForList(orderSql + "ORDER BY o.created_at DESC LIMIT 20", userId);
        }
        for (Map<String, Object> order : orders) {
            long orderId = ((Number) order.get("id")).longValue();
            List<Map<String, Object>> items = jdbc.queryForList(
                "SELECT oi.quantity, oi.price, p.name, p.image_url as imageUrl " +
                "FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id=?",
                orderId
            );
            order.put("items", items);
        }
        result.put("recentOrders", orders);

        return result;
    }

    // ── Admin Revenue Report ──

    public Map<String, Object> getAdminRevenueReport(String period) {
        Map<String, Object> result = new LinkedHashMap<>();
        java.time.LocalDateTime periodStart = resolvePeriodStart(period);

        // 1. Summary cards
        String revSql = "SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status <> 'CANCELLED'";
        String countSql = "SELECT COUNT(*) FROM orders WHERE status <> 'CANCELLED'";
        String custSql = "SELECT COUNT(DISTINCT user_id) FROM orders WHERE status <> 'CANCELLED'";

        if (periodStart != null) {
            result.put("totalRevenue", jdbc.queryForObject(revSql + " AND created_at >= ?", BigDecimal.class, periodStart));
            result.put("totalOrders", jdbc.queryForObject(countSql + " AND created_at >= ?", Long.class, periodStart));
            result.put("totalCustomers", jdbc.queryForObject(custSql + " AND created_at >= ?", Long.class, periodStart));
        } else {
            result.put("totalRevenue", jdbc.queryForObject(revSql, BigDecimal.class));
            result.put("totalOrders", jdbc.queryForObject(countSql, Long.class));
            result.put("totalCustomers", jdbc.queryForObject(custSql, Long.class));
        }

        long totalOrders = ((Number) result.get("totalOrders")).longValue();
        BigDecimal totalRevenue = (BigDecimal) result.get("totalRevenue");
        result.put("avgOrderValue", totalOrders > 0 ? totalRevenue.divide(BigDecimal.valueOf(totalOrders), 0, RoundingMode.HALF_UP) : BigDecimal.ZERO);

        // 2. Daily/hourly revenue chart
        List<Map<String, Object>> dailyRevenue = new java.util.ArrayList<>();
        if ("today".equalsIgnoreCase(period)) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT HOUR(created_at) as hr, COALESCE(SUM(total_amount),0) as rev FROM orders WHERE status <> 'CANCELLED' AND created_at >= ? GROUP BY HOUR(created_at) ORDER BY hr",
                periodStart
            );
            for (Map<String, Object> r : rows) {
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("label", String.format("%02d:00", ((Number) r.get("hr")).intValue()));
                m.put("value", r.get("rev"));
                dailyRevenue.add(m);
            }
        } else if ("week".equalsIgnoreCase(period) || "month".equalsIgnoreCase(period)) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT DATE(created_at) as dt, COALESCE(SUM(total_amount),0) as rev FROM orders WHERE status <> 'CANCELLED' AND created_at >= ? GROUP BY DATE(created_at) ORDER BY dt",
                periodStart
            );
            for (Map<String, Object> r : rows) {
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("label", r.get("dt").toString());
                m.put("value", r.get("rev"));
                dailyRevenue.add(m);
            }
        } else {
            String sql = "SELECT DATE_FORMAT(created_at, '%Y-%m') as dt, COALESCE(SUM(total_amount),0) as rev FROM orders WHERE status <> 'CANCELLED' ";
            List<Map<String, Object>> rows;
            if (periodStart != null) {
                rows = jdbc.queryForList(sql + "AND created_at >= ? GROUP BY dt ORDER BY dt", periodStart);
            } else {
                rows = jdbc.queryForList(sql + "GROUP BY dt ORDER BY dt");
            }
            for (Map<String, Object> r : rows) {
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("label", r.get("dt").toString());
                m.put("value", r.get("rev"));
                dailyRevenue.add(m);
            }
        }
        result.put("dailyRevenue", dailyRevenue);

        // 3. Top buyers list
        String buyerSql = "SELECT u.id as userId, u.username, u.email, u.full_name as fullName, " +
                          "COUNT(o.id) as orderCount, COALESCE(SUM(o.total_amount),0) as totalSpent " +
                          "FROM orders o JOIN users u ON u.id = o.user_id " +
                          "WHERE o.status <> 'CANCELLED' ";
        if (periodStart != null) {
            result.put("topBuyers", jdbc.queryForList(buyerSql + "AND o.created_at >= ? GROUP BY u.id, u.username, u.email, u.full_name ORDER BY totalSpent DESC LIMIT 20", periodStart));
        } else {
            result.put("topBuyers", jdbc.queryForList(buyerSql + "GROUP BY u.id, u.username, u.email, u.full_name ORDER BY totalSpent DESC LIMIT 20"));
        }

        // 4. Recent order details
        String orderSql = "SELECT o.id, u.username, u.full_name as fullName, o.total_amount as totalAmount, o.status, o.created_at as createdAt " +
                          "FROM orders o JOIN users u ON u.id = o.user_id " +
                          "WHERE o.status <> 'CANCELLED' ";
        if (periodStart != null) {
            result.put("orderDetails", jdbc.queryForList(orderSql + "AND o.created_at >= ? ORDER BY o.created_at DESC LIMIT 50", periodStart));
        } else {
            result.put("orderDetails", jdbc.queryForList(orderSql + "ORDER BY o.created_at DESC LIMIT 50"));
        }

        // 5. Top selling products in period
        String topProdSql = "SELECT p.id, p.name, p.image_url as imageUrl, COALESCE(SUM(oi.quantity),0) as quantitySold, COALESCE(SUM(oi.price * oi.quantity),0) as revenue " +
                            "FROM order_items oi JOIN products p ON oi.product_id = p.id " +
                            "JOIN orders o ON oi.order_id = o.id WHERE o.status <> 'CANCELLED' ";
        if (periodStart != null) {
            result.put("topProducts", jdbc.queryForList(topProdSql + "AND o.created_at >= ? GROUP BY p.id, p.name, p.image_url ORDER BY quantitySold DESC LIMIT 10", periodStart));
        } else {
            result.put("topProducts", jdbc.queryForList(topProdSql + "GROUP BY p.id, p.name, p.image_url ORDER BY quantitySold DESC LIMIT 10"));
        }

        return result;
    }

    // ── Helper: resolve period to LocalDateTime ──

    private java.time.LocalDateTime resolvePeriodStart(String period) {
        if ("today".equalsIgnoreCase(period)) {
            return java.time.LocalDate.now().atStartOfDay();
        } else if ("week".equalsIgnoreCase(period)) {
            return java.time.LocalDate.now().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).atStartOfDay();
        } else if ("month".equalsIgnoreCase(period)) {
            return java.time.LocalDate.now().withDayOfMonth(1).atStartOfDay();
        } else if ("year".equalsIgnoreCase(period)) {
            return java.time.LocalDate.now().withDayOfYear(1).atStartOfDay();
        }
        return null; // "all"
    }
}
