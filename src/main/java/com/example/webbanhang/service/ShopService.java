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
        jdbc.update("INSERT INTO coupons(code,discount_percent,active,start_date,end_date) VALUES(?,?,?,?,?)",
                request.code().trim().toUpperCase(), safePercent(request.discountPercent()), Boolean.TRUE.equals(request.active()),
                request.startDate(), request.endDate());
        return one("SELECT * FROM coupons WHERE id=LAST_INSERT_ID()");
    }

    public Map<String, Object> updateCoupon(long id, CouponRequest request) {
        couponById(id);
        requireText(request.code(), "Coupon code is required");
        jdbc.update("UPDATE coupons SET code=?, discount_percent=?, active=?, start_date=?, end_date=? WHERE id=?",
                request.code().trim().toUpperCase(), safePercent(request.discountPercent()), Boolean.TRUE.equals(request.active()),
                request.startDate(), request.endDate(), id);
        return couponById(id);
    }

    public void deleteCoupon(long id) {
        couponById(id);
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
        BigDecimal subtotal = BigDecimal.ZERO;
        for (Map<String, Object> item : items) {
            int quantity = ((Number) item.get("quantity")).intValue();
            int stock = ((Number) item.get("stock")).intValue();
            if (quantity > stock) {
                throw new BadRequestException(item.get("name") + " does not have enough stock");
            }
            subtotal = subtotal.add(((BigDecimal) item.get("sale_price")).multiply(BigDecimal.valueOf(quantity)));
        }
        Long couponId = null;
        BigDecimal discount = BigDecimal.ZERO;
        if (request.couponCode() != null && !request.couponCode().isBlank()) {
            Map<String, Object> coupon = couponByCode(request.couponCode());
            couponId = ((Number) coupon.get("id")).longValue();
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

    public Map<String, Object> updateOrderStatus(long orderId, String status) {
        try {
            OrderStatus.valueOf(status);
        } catch (Exception ex) {
            throw new BadRequestException("Invalid order status");
        }
        jdbc.update("UPDATE orders SET status=? WHERE id=?", status, orderId);
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
                WHERE o.user_id=? AND oi.product_id=? AND o.status IN ('CONFIRMED','SHIPPING','DELIVERED')
                """, rs -> rs.next() ? rs.getInt(1) : 0, userId, request.productId());
        if (purchased == null || purchased == 0) {
            throw new BadRequestException("Only purchased products can be reviewed after order confirmation");
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

    public Map<String, Object> dashboard() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("products", jdbc.queryForObject("SELECT COUNT(*) FROM products", Long.class));
        result.put("orders", jdbc.queryForObject("SELECT COUNT(*) FROM orders", Long.class));
        result.put("customers", jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE role='CUSTOMER'", Long.class));
        result.put("revenue", jdbc.queryForObject("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status <> 'CANCELLED'", BigDecimal.class));
        result.put("latestOrders", orders(0, true).stream().limit(6).toList());
        result.put("lowStock", jdbc.queryForList("SELECT id,name,stock FROM products WHERE stock<=10 ORDER BY stock ASC"));
        return result;
    }

    private Map<String, Object> couponByCode(String code) {
        requireText(code, "Coupon code is required");
        Map<String, Object> coupon = one("SELECT * FROM coupons WHERE code=? AND active=TRUE", code.trim().toUpperCase());
        LocalDate today = LocalDate.now();
        Object start = coupon.get("start_date");
        Object end = coupon.get("end_date");
        if (start instanceof java.sql.Date date && today.isBefore(date.toLocalDate())) {
            throw new BadRequestException("Coupon is not active yet");
        }
        if (end instanceof java.sql.Date date && today.isAfter(date.toLocalDate())) {
            throw new BadRequestException("Coupon expired");
        }
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
}
