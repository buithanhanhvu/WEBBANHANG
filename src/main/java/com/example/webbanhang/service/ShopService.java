package com.example.webbanhang.service;

import com.example.webbanhang.domain.*;
import com.example.webbanhang.dto.Requests.CartRequest;
import com.example.webbanhang.dto.Requests.CheckoutRequest;
import com.example.webbanhang.dto.Requests.CouponRequest;
import com.example.webbanhang.dto.Requests.ReviewRequest;
import com.example.webbanhang.exception.BadRequestException;
import com.example.webbanhang.exception.ResourceNotFoundException;
import com.example.webbanhang.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class ShopService {
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final CouponRepository couponRepository;
    private final UserCouponRepository userCouponRepository;
    private final CartItemRepository cartItemRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ReviewRepository reviewRepository;
    private final RankRepository rankRepository;
    private final WishlistRepository wishlistRepository;
    private final RecycleBinService recycleBinService;
    private RealtimeService realtimeService;

    @PersistenceContext
    private EntityManager entityManager;

    public ShopService(UserRepository userRepository,
                       CategoryRepository categoryRepository,
                       ProductRepository productRepository,
                       CouponRepository couponRepository,
                       UserCouponRepository userCouponRepository,
                       CartItemRepository cartItemRepository,
                       OrderRepository orderRepository,
                       OrderItemRepository orderItemRepository,
                       ReviewRepository reviewRepository,
                       RankRepository rankRepository,
                       WishlistRepository wishlistRepository,
                       RecycleBinService recycleBinService) {
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.couponRepository = couponRepository;
        this.userCouponRepository = userCouponRepository;
        this.cartItemRepository = cartItemRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.reviewRepository = reviewRepository;
        this.rankRepository = rankRepository;
        this.wishlistRepository = wishlistRepository;
        this.recycleBinService = recycleBinService;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setRealtimeService(RealtimeService realtimeService) {
        this.realtimeService = realtimeService;
    }

    public Map<String, Object> cart(long userId) {
        List<CartItem> items = cartItemRepository.findByUserId(userId);
        List<Map<String, Object>> list = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (CartItem ci : items) {
            Product p = ci.getProduct();
            BigDecimal salePrice = p.getPrice().multiply(BigDecimal.valueOf(100 - p.getDiscountPercent()))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal lineTotal = salePrice.multiply(BigDecimal.valueOf(ci.getQuantity()));
            subtotal = subtotal.add(lineTotal);

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", ci.getId());
            m.put("productId", p.getId());
            m.put("quantity", ci.getQuantity());
            m.put("name", p.getName());
            m.put("price", p.getPrice());
            m.put("stock", p.getStock());
            m.put("imageUrl", p.getImageUrl());
            m.put("discountPercent", p.getDiscountPercent());
            m.put("salePrice", salePrice);
            m.put("lineTotal", lineTotal);
            list.add(m);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", list);
        result.put("subtotal", subtotal);
        return result;
    }

    @Transactional
    public Map<String, Object> addToCart(long userId, CartRequest request) {
        validateCartRequest(request);
        Product p = productRepository.findById(request.productId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (request.quantity() > p.getStock()) {
            throw new BadRequestException("Quantity exceeds stock");
        }

        Optional<CartItem> opt = cartItemRepository.findByUserIdAndProductId(userId, request.productId());
        if (opt.isEmpty()) {
            CartItem ci = CartItem.builder().user(u).product(p).quantity(request.quantity()).build();
            cartItemRepository.save(ci);
        } else {
            CartItem ci = opt.get();
            int next = ci.getQuantity() + request.quantity();
            if (next > p.getStock()) {
                throw new BadRequestException("Quantity exceeds stock");
            }
            ci.setQuantity(next);
            cartItemRepository.save(ci);
        }
        return cart(userId);
    }

    @Transactional
    public Map<String, Object> updateCart(long userId, CartRequest request) {
        validateCartRequest(request);
        if (request.quantity() <= 0) {
            cartItemRepository.deleteByUserIdAndProductId(userId, request.productId());
        } else {
            Product p = productRepository.findById(request.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
            if (request.quantity() > p.getStock()) {
                throw new BadRequestException("Quantity exceeds stock");
            }
            CartItem ci = cartItemRepository.findByUserIdAndProductId(userId, request.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cart item not found"));
            ci.setQuantity(request.quantity());
            cartItemRepository.save(ci);
        }
        return cart(userId);
    }

    @Transactional
    public Map<String, Object> removeCartItem(long userId, long productId) {
        cartItemRepository.deleteByUserIdAndProductId(userId, productId);
        return cart(userId);
    }

    public List<Map<String, Object>> coupons() {
        return couponRepository.findAll().stream().map(this::mapCoupon).toList();
    }

    @Transactional
    public Map<String, Object> createCoupon(CouponRequest request) {
        requireText(request.code(), "Coupon code is required");
        if (couponRepository.findByCode(request.code().trim().toUpperCase()).isPresent()) {
            throw new BadRequestException("Coupon code already exists");
        }
        Coupon c = Coupon.builder()
                .code(request.code().trim().toUpperCase())
                .discountPercent(safePercent(request.discountPercent()))
                .active(Boolean.TRUE.equals(request.active()))
                .startDate(request.startDate())
                .endDate(request.endDate())
                .maxUses((request.maxUses() != null && request.maxUses() > 0) ? request.maxUses() : null)
                .usedCount(0)
                .build();
        c = couponRepository.save(c);
        return mapCoupon(c);
    }

    @Transactional
    public Map<String, Object> updateCoupon(long id, CouponRequest request) {
        Coupon c = couponRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Coupon not found"));
        requireText(request.code(), "Coupon code is required");
        c.setCode(request.code().trim().toUpperCase());
        c.setDiscountPercent(safePercent(request.discountPercent()));
        c.setActive(Boolean.TRUE.equals(request.active()));
        c.setStartDate(request.startDate());
        c.setEndDate(request.endDate());
        c.setMaxUses((request.maxUses() != null && request.maxUses() > 0) ? request.maxUses() : null);
        c = couponRepository.save(c);
        return mapCoupon(c);
    }

    @Transactional
    public void deleteCoupon(long id) {
        Coupon c = couponRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Coupon not found"));
        recycleBinService.saveToRecycleBin("COUPON", id, c.getCode(), mapCoupon(c));
        userCouponRepository.deleteByCouponId(id);
        couponRepository.delete(c);
    }

    public Map<String, Object> applyCoupon(String code, BigDecimal subtotal) {
        Coupon c = couponByCode(code);
        BigDecimal discount = subtotal.multiply(BigDecimal.valueOf(c.getDiscountPercent()))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("coupon", mapCoupon(c));
        result.put("discount", discount);
        result.put("total", subtotal.subtract(discount));
        return result;
    }

    @Transactional
    public Map<String, Object> checkout(long userId, CheckoutRequest request) {
        requireText(request.shippingName(), "Shipping name is required");
        requireText(request.shippingAddress(), "Shipping address is required");
        requireText(request.shippingPhone(), "Shipping phone is required");

        User u = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<CartItem> cartItems = cartItemRepository.findByUserId(userId);
        if (cartItems.isEmpty()) {
            throw new BadRequestException("Cart is empty");
        }

        // Sắp xếp items theo product_id để tránh deadlock khi khóa dòng
        cartItems.sort(Comparator.comparing(ci -> ci.getProduct().getId()));

        BigDecimal subtotal = BigDecimal.ZERO;
        for (CartItem ci : cartItems) {
            Product p = ci.getProduct();
            // Lock row thực tế bằng JPA query or EntityManager
            Product liveProduct = entityManager.find(Product.class, p.getId(), jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            if (liveProduct == null || ci.getQuantity() > liveProduct.getStock()) {
                throw new BadRequestException(p.getName() + " không đủ hàng (chỉ còn " + (liveProduct == null ? 0 : liveProduct.getStock()) + ")");
            }
            BigDecimal salePrice = p.getPrice().multiply(BigDecimal.valueOf(100 - p.getDiscountPercent()))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            subtotal = subtotal.add(salePrice.multiply(BigDecimal.valueOf(ci.getQuantity())));
        }

        Coupon coupon = null;
        BigDecimal discount = BigDecimal.ZERO;
        if (request.couponCode() != null && !request.couponCode().isBlank()) {
            coupon = couponByCode(request.couponCode());
            Optional<UserCoupon> ucOpt = userCouponRepository.findByUserIdAndCouponId(userId, coupon.getId());
            if (ucOpt.isEmpty()) {
                throw new BadRequestException("Bạn chưa thu thập mã giảm giá này. Hãy vào mục Voucher để thu thập trước.");
            }
            discount = subtotal.multiply(BigDecimal.valueOf(coupon.getDiscountPercent()))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }

        BigDecimal total = subtotal.subtract(discount);
        Order o = Order.builder()
                .user(u)
                .coupon(coupon)
                .totalAmount(total)
                .discountAmount(discount)
                .status(OrderStatus.PENDING.name())
                .shippingName(request.shippingName())
                .shippingAddress(request.shippingAddress())
                .shippingPhone(request.shippingPhone())
                .note(request.note())
                .build();
        o = orderRepository.save(o);

        if (coupon != null) {
            userCouponRepository.deleteByUserIdAndCouponId(userId, coupon.getId());
            coupon.setUsedCount(coupon.getUsedCount() + 1);
            couponRepository.save(coupon);
        }

        List<OrderItem> ois = new ArrayList<>();
        for (CartItem ci : cartItems) {
            Product p = ci.getProduct();
            BigDecimal salePrice = p.getPrice().multiply(BigDecimal.valueOf(100 - p.getDiscountPercent()))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            OrderItem oi = OrderItem.builder()
                    .order(o)
                    .product(p)
                    .productName(p.getName())
                    .quantity(ci.getQuantity())
                    .price(salePrice)
                    .build();
            orderItemRepository.save(oi);
            ois.add(oi);

            p.setStock(p.getStock() - ci.getQuantity());
            productRepository.save(p);
        }

        cartItemRepository.deleteByUserId(userId);
        o.setItems(ois);

        if (realtimeService != null) {
            realtimeService.stockChanged();
            realtimeService.orderChanged("created", Map.of("id", o.getId()));
        }

        return mapOrder(o);
    }

    public List<Map<String, Object>> orders(long userId, boolean admin) {
        List<Order> list = admin
                ? orderRepository.findAllByOrderByCreatedAtDesc()
                : orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return list.stream().map(this::mapOrder).toList();
    }

    public Map<String, Object> order(long userId, long orderId, boolean admin) {
        Order o = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        if (!admin && o.getUser().getId() != userId) {
            throw new BadRequestException("Unauthorized access to order");
        }
        return mapOrder(o);
    }

    public List<Map<String, Object>> wishlist(long userId) {
        List<Wishlist> list = wishlistRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return list.stream().map(w -> mapProductWithStats(w.getProduct())).toList();
    }

    @Transactional
    public Map<String, Object> toggleWishlist(long userId, long productId) {
        Product p = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Optional<Wishlist> opt = wishlistRepository.findByUserIdAndProductId(userId, productId);
        boolean added;
        if (opt.isPresent()) {
            wishlistRepository.delete(opt.get());
            added = false;
        } else {
            Wishlist w = Wishlist.builder().user(u).product(p).build();
            wishlistRepository.save(w);
            added = true;
        }
        return Map.of("added", added, "productId", productId);
    }

    public List<Long> wishlistIds(long userId) {
        return wishlistRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(w -> w.getProduct().getId())
                .toList();
    }

    public List<Map<String, Object>> wishlistSaleNotifications(long userId) {
        String sql = """
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
        """;
        List<?> rows = entityManager.createNativeQuery(sql)
                .setParameter(1, userId)
                .getResultList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (Object row : rows) {
            Object[] arr = (Object[]) row;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", ((Number) arr[0]).longValue());
            m.put("name", arr[1]);
            m.put("imageUrl", arr[2]);
            m.put("price", arr[3]);
            m.put("discountPercent", arr[4]);
            m.put("oldPrice", arr[5]);
            m.put("newPrice", arr[6]);
            m.put("oldDiscount", arr[7]);
            m.put("newDiscount", arr[8]);
            m.put("changedAt", arr[9]);
            result.add(m);
        }
        return result;
    }

    @Transactional
    public Map<String, Object> cancelOrder(long userId, long orderId) {
        Order o = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        if (o.getUser().getId() != userId) {
            throw new BadRequestException("Unauthorized access to order");
        }
        if (!OrderStatus.PENDING.name().equals(o.getStatus())) {
            throw new BadRequestException("Chỉ có thể hủy đơn hàng đang chờ xác nhận");
        }
        o.setStatus(OrderStatus.CANCELLED.name());
        orderRepository.save(o);

        // Hoàn lại tồn kho
        for (OrderItem oi : o.getItems()) {
            Product p = oi.getProduct();
            p.setStock(p.getStock() + oi.getQuantity());
            productRepository.save(p);
        }

        if (realtimeService != null) realtimeService.stockChanged();
        return mapOrder(o);
    }

    @Transactional
    public Map<String, Object> updateOrderStatus(long orderId, String status) {
        try {
            OrderStatus.valueOf(status);
        } catch (Exception ex) {
            throw new BadRequestException("Invalid order status");
        }

        Order o = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        String oldStatus = o.getStatus();

        if (!oldStatus.equals(status)) {
            if ("CANCELLED".equals(status)) {
                for (OrderItem oi : o.getItems()) {
                    Product p = oi.getProduct();
                    p.setStock(p.getStock() + oi.getQuantity());
                    productRepository.save(p);
                }
                if (realtimeService != null) realtimeService.stockChanged();
            } else if ("CANCELLED".equals(oldStatus)) {
                for (OrderItem oi : o.getItems()) {
                    Product p = oi.getProduct();
                    Product liveProduct = entityManager.find(Product.class, p.getId(), jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
                    if (liveProduct == null || oi.getQuantity() > liveProduct.getStock()) {
                        throw new BadRequestException(oi.getProductName() + " không đủ hàng để khôi phục đơn (chỉ còn " + (liveProduct == null ? 0 : liveProduct.getStock()) + ")");
                    }
                }
                for (OrderItem oi : o.getItems()) {
                    Product p = oi.getProduct();
                    p.setStock(p.getStock() - oi.getQuantity());
                    productRepository.save(p);
                }
                if (realtimeService != null) realtimeService.stockChanged();
            }
            o.setStatus(status);
            orderRepository.save(o);
        }

        return mapOrder(o);
    }

    @Transactional
    public Map<String, Object> review(long userId, ReviewRequest request) {
        if (request.productId() == null || request.rating() == null || request.rating() < 1 || request.rating() > 5) {
            throw new BadRequestException("Review requires productId and rating from 1 to 5");
        }
        Product p = productRepository.findById(request.productId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Number purchased = (Number) entityManager.createQuery("""
                SELECT COUNT(o.id) FROM Order o
                JOIN o.items oi
                WHERE o.user.id = :userId AND oi.product.id = :prodId AND o.status = 'DELIVERED'
                """)
                .setParameter("userId", userId)
                .setParameter("prodId", request.productId())
                .getSingleResult();

        if (purchased == null || purchased.intValue() == 0) {
            throw new BadRequestException("Bạn chỉ có thể đánh giá sau khi đã nhận hàng");
        }

        Review r = reviewRepository.findByUserIdAndProductId(userId, request.productId())
                .orElse(Review.builder().user(u).product(p).build());

        r.setRating(request.rating());
        r.setComment(request.comment());
        r = reviewRepository.save(r);

        Map<String, Object> m = mapReview(r);
        m.put("username", u.getUsername());
        return m;
    }

    public List<Map<String, Object>> productReviews(long productId) {
        productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        return reviewRepository.findByProductIdOrderByCreatedAtDesc(productId).stream().map(r -> {
            Map<String, Object> m = mapReview(r);
            m.put("username", r.getUser().getUsername());
            return m;
        }).toList();
    }

    public List<Map<String, Object>> availableVouchers(long userId) {
        List<Coupon> coupons = couponRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Coupon c : coupons) {
            if (Boolean.TRUE.equals(c.getActive())) {
                Map<String, Object> m = mapCoupon(c);
                boolean collected = userCouponRepository.findByUserIdAndCouponId(userId, c.getId()).isPresent();
                long collectedCount = userCouponRepository.countByCouponId(c.getId());
                m.put("collected", collected ? 1 : 0);
                m.put("collected_count", collectedCount);
                result.add(m);
            }
        }
        return result;
    }

    public List<Map<String, Object>> myVouchers(long userId) {
        return userCouponRepository.findByUserId(userId).stream().map(uc -> {
            Map<String, Object> m = mapCoupon(uc.getCoupon());
            m.put("collected_at", uc.getCollectedAt());
            return m;
        }).toList();
    }

    @Transactional
    public Map<String, Object> collectVoucher(long userId, long couponId) {
        Coupon c = couponRepository.findById(couponId)
                .orElseThrow(() -> new ResourceNotFoundException("Coupon not found"));
        if (!Boolean.TRUE.equals(c.getActive())) {
            throw new BadRequestException("Mã giảm giá không tồn tại hoặc đã tắt");
        }

        if (c.getMaxUses() != null) {
            long collected = userCouponRepository.countByCouponId(couponId);
            if (collected >= c.getMaxUses()) {
                throw new BadRequestException("Mã giảm giá đã hết — không còn phiếu để nhận");
            }
        }

        Optional<UserCoupon> already = userCouponRepository.findByUserIdAndCouponId(userId, couponId);
        if (already.isPresent()) {
            throw new BadRequestException("Bạn đã thu thập mã này rồi");
        }

        User u = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        UserCoupon uc = UserCoupon.builder().user(u).coupon(c).build();
        userCouponRepository.save(uc);
        return mapCoupon(c);
    }

    public List<Map<String, Object>> allUsers() {
        return userRepository.findAll().stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("username", u.getUsername());
            m.put("full_name", u.getFullName());
            m.put("email", u.getEmail());
            m.put("phone", u.getPhone());
            m.put("address", u.getAddress());
            m.put("role", u.getRole());
            m.put("avatar_url", u.getAvatarUrl());
            m.put("status", u.getStatus());
            m.put("ban_until", u.getBanUntil());
            return m;
        }).toList();
    }

    public List<Map<String, Object>> purchasedProducts(long userId) {
        String sql = """
            SELECT DISTINCT oi.product_id
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            WHERE o.user_id = ? AND o.status = 'DELIVERED'
        """;
        List<?> prodIds = entityManager.createNativeQuery(sql)
                .setParameter(1, userId)
                .getResultList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (Object pid : prodIds) {
            long pId = ((Number) pid).longValue();
            Product p = productRepository.findById(pId).orElse(null);
            if (p != null) {
                Map<String, Object> map = mapProductWithStats(p);
                Optional<Review> r = reviewRepository.findByUserIdAndProductId(userId, pId);
                if (r.isPresent()) {
                    map.put("myRating", r.get().getRating());
                    map.put("myComment", r.get().getComment());
                    map.put("myReviewedAt", r.get().getCreatedAt());
                } else {
                    map.put("myRating", null);
                    map.put("myComment", null);
                    map.put("myReviewedAt", null);
                }
                result.add(map);
            }
        }
        return result;
    }

    @Transactional
    public void deleteUser(long id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if ("ADMIN".equals(u.getRole())) {
            throw new BadRequestException("Cannot delete admin account");
        }
        long orderCount = orderRepository.countByUserId(id);
        if (orderCount > 0) {
            throw new BadRequestException("Không thể xóa người dùng này vì họ đã có lịch sử đặt hàng. Vui lòng chuyển trạng thái tài khoản sang BANNED thay vì xóa.");
        }

        Map<String, Object> backup = new LinkedHashMap<>();
        backup.put("id", u.getId());
        backup.put("username", u.getUsername());
        backup.put("email", u.getEmail());
        backup.put("password_hash", u.getPasswordHash());
        backup.put("role", u.getRole());
        backup.put("full_name", u.getFullName());
        backup.put("phone", u.getPhone());
        backup.put("address", u.getAddress());
        backup.put("avatar_url", u.getAvatarUrl());
        backup.put("status", u.getStatus());
        backup.put("ban_until", u.getBanUntil());
        
        recycleBinService.saveToRecycleBin("USER", id, u.getUsername(), backup);

        wishlistRepository.deleteByUserId(id);
        userCouponRepository.deleteByUserId(id);
        cartItemRepository.deleteByUserId(id);
        reviewRepository.deleteByUserId(id);
        userRepository.delete(u);
    }

    @Transactional
    public void updateUserStatus(long id, String status, Integer banDays) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if ("ADMIN".equals(u.getRole())) {
            throw new BadRequestException("Cannot change admin status");
        }

        if ("BANNED".equals(status)) {
            if (banDays != null && banDays > 0) {
                u.setBanUntil(LocalDateTime.now().plusDays(banDays));
            } else {
                u.setBanUntil(null);
            }
            u.setStatus("BANNED");
        } else {
            u.setStatus("ACTIVE");
            u.setBanUntil(null);
        }
        userRepository.save(u);
    }

    public List<Map<String, Object>> getRanks() {
        return rankRepository.findAllByOrderByMinSpentAsc().stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("name", r.getName());
            m.put("subtitle", r.getSubtitle());
            m.put("icon", r.getIcon());
            m.put("description", r.getDescription());
            m.put("min_spent", r.getMinSpent());
            m.put("color", r.getColor());
            m.put("css_class", r.getCssClass());
            return m;
        }).toList();
    }

    public Map<String, Object> dashboard(String period) {
        Map<String, Object> result = new LinkedHashMap<>();
        LocalDateTime start = resolvePeriodStart(period);

        String pCountSql = "SELECT COUNT(*) FROM products";
        String oCountSql = "SELECT COUNT(*) FROM orders";
        String uCountSql = "SELECT COUNT(*) FROM users WHERE role='CUSTOMER'";
        String revSql = "SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status <> 'CANCELLED'";

        if (start != null) {
            result.put("products", ((Number) entityManager.createNativeQuery(pCountSql + " WHERE created_at >= ?").setParameter(1, start).getSingleResult()).longValue());
            result.put("orders", ((Number) entityManager.createNativeQuery(oCountSql + " WHERE created_at >= ?").setParameter(1, start).getSingleResult()).longValue());
            result.put("customers", ((Number) entityManager.createNativeQuery(uCountSql + " AND created_at >= ?").setParameter(1, start).getSingleResult()).longValue());
            result.put("revenue", new BigDecimal(entityManager.createNativeQuery(revSql + " AND created_at >= ?").setParameter(1, start).getSingleResult().toString()));
        } else {
            result.put("products", ((Number) entityManager.createNativeQuery(pCountSql).getSingleResult()).longValue());
            result.put("orders", ((Number) entityManager.createNativeQuery(oCountSql).getSingleResult()).longValue());
            result.put("customers", ((Number) entityManager.createNativeQuery(uCountSql).getSingleResult()).longValue());
            result.put("revenue", new BigDecimal(entityManager.createNativeQuery(revSql).getSingleResult().toString()));
        }

        result.put("latestOrders", orders(0, true).stream().limit(6).toList());
        
        List<?> lowStockRows = entityManager.createNativeQuery("SELECT id, name, stock FROM products WHERE stock<=10 ORDER BY stock ASC").getResultList();
        List<Map<String, Object>> lowStock = new ArrayList<>();
        for (Object r : lowStockRows) {
            Object[] arr = (Object[]) r;
            Map<String, Object> m = new HashMap<>();
            m.put("id", ((Number) arr[0]).longValue());
            m.put("name", arr[1]);
            m.put("stock", arr[2]);
            lowStock.add(m);
        }
        result.put("lowStock", lowStock);

        // Order Status counts
        String orderStatusSql = "SELECT status as label, COUNT(*) as value FROM orders";
        List<?> osCounts;
        if (start != null) {
            osCounts = entityManager.createNativeQuery(orderStatusSql + " WHERE created_at >= ? GROUP BY status").setParameter(1, start).getResultList();
        } else {
            osCounts = entityManager.createNativeQuery(orderStatusSql + " GROUP BY status").getResultList();
        }
        List<Map<String, Object>> osList = new ArrayList<>();
        for (Object r : osCounts) {
            Object[] arr = (Object[]) r;
            Map<String, Object> m = new HashMap<>();
            m.put("label", arr[0]);
            m.put("value", arr[1]);
            osList.add(m);
        }
        result.put("orderStatusCounts", osList);

        // Category Revenue distribution
        String catRevSql = "SELECT COALESCE(c.name, 'Khác') as label, COALESCE(SUM(oi.price * oi.quantity),0) as value " +
                           "FROM order_items oi " +
                           "LEFT JOIN products p ON oi.product_id = p.id " +
                           "LEFT JOIN categories c ON p.category_id = c.id " +
                           "JOIN orders o ON oi.order_id = o.id " +
                           "WHERE o.status <> 'CANCELLED' ";
        List<?> catRevs;
        if (start != null) {
            catRevs = entityManager.createNativeQuery(catRevSql + "AND o.created_at >= ? GROUP BY COALESCE(c.name, 'Khác') ORDER BY value DESC").setParameter(1, start).getResultList();
        } else {
            catRevs = entityManager.createNativeQuery(catRevSql + "GROUP BY COALESCE(c.name, 'Khác') ORDER BY value DESC").getResultList();
        }
        List<Map<String, Object>> catList = new ArrayList<>();
        for (Object r : catRevs) {
            Object[] arr = (Object[]) r;
            Map<String, Object> m = new HashMap<>();
            m.put("label", arr[0]);
            m.put("value", arr[1]);
            catList.add(m);
        }
        result.put("categoryRevenue", catList);

        // Top Products
        String topProdSql = "SELECT oi.product_id as id, COALESCE(p.name, oi.product_name, CONCAT('Sản phẩm #', oi.product_id)) as name, p.image_url as imageUrl, COALESCE(SUM(oi.quantity),0) as quantitySold, COALESCE(SUM(oi.price * oi.quantity),0) as revenue " +
                            "FROM order_items oi " +
                            "LEFT JOIN products p ON oi.product_id = p.id " +
                            "JOIN orders o ON oi.order_id = o.id " +
                            "WHERE o.status <> 'CANCELLED' ";
        List<?> topProds;
        if (start != null) {
            topProds = entityManager.createNativeQuery(topProdSql + "AND o.created_at >= ? GROUP BY oi.product_id, p.name, oi.product_name, p.image_url ORDER BY quantitySold DESC LIMIT 10").setParameter(1, start).getResultList();
        } else {
            topProds = entityManager.createNativeQuery(topProdSql + "GROUP BY oi.product_id, p.name, oi.product_name, p.image_url ORDER BY quantitySold DESC LIMIT 10").getResultList();
        }
        List<Map<String, Object>> topProdList = new ArrayList<>();
        for (Object r : topProds) {
            Object[] arr = (Object[]) r;
            Map<String, Object> m = new HashMap<>();
            m.put("id", ((Number) arr[0]).longValue());
            m.put("name", arr[1]);
            m.put("imageUrl", arr[2]);
            m.put("quantitySold", arr[3]);
            m.put("revenue", arr[4]);
            topProdList.add(m);
        }
        result.put("topProducts", topProdList);

        // Revenue Chart Data
        List<Map<String, Object>> chartData = new java.util.ArrayList<>();
        if ("today".equalsIgnoreCase(period)) {
            List<?> rows = entityManager.createNativeQuery(
                "SELECT HOUR(created_at) as hr, COALESCE(SUM(total_amount),0) as rev FROM orders WHERE status <> 'CANCELLED' AND created_at >= ? GROUP BY HOUR(created_at) ORDER BY HOUR(created_at)"
            ).setParameter(1, start).getResultList();
            for (Object r : rows) {
                Object[] arr = (Object[]) r;
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("label", String.format("%02d:00", ((Number) arr[0]).intValue()));
                m.put("value", arr[1]);
                chartData.add(m);
            }
        } else if ("week".equalsIgnoreCase(period) || "month".equalsIgnoreCase(period)) {
            List<?> rows = entityManager.createNativeQuery(
                "SELECT DATE(created_at) as dt, COALESCE(SUM(total_amount),0) as rev FROM orders WHERE status <> 'CANCELLED' AND created_at >= ? GROUP BY DATE(created_at) ORDER BY DATE(created_at)"
            ).setParameter(1, start).getResultList();
            for (Object r : rows) {
                Object[] arr = (Object[]) r;
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("label", arr[0].toString());
                m.put("value", arr[1]);
                chartData.add(m);
            }
        } else {
            String sql = "SELECT DATE_FORMAT(created_at, '%Y-%m') as dt, COALESCE(SUM(total_amount),0) as rev FROM orders WHERE status <> 'CANCELLED' ";
            List<?> rows;
            if (start != null) {
                rows = entityManager.createNativeQuery(sql + "AND created_at >= ? GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY DATE_FORMAT(created_at, '%Y-%m')").setParameter(1, start).getResultList();
            } else {
                rows = entityManager.createNativeQuery(sql + "GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY DATE_FORMAT(created_at, '%Y-%m')").getResultList();
            }
            for (Object r : rows) {
                Object[] arr = (Object[]) r;
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("label", arr[0].toString());
                m.put("value", arr[1]);
                chartData.add(m);
            }
        }
        result.put("revenueChartData", chartData);

        return result;
    }

    public Map<String, Object> getUserSpendingStats(long userId, String period) {
        Map<String, Object> result = new LinkedHashMap<>();
        LocalDateTime periodStart = resolvePeriodStart(period);

        String baseSql = "SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id=? AND status <> 'CANCELLED'";
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime yearStart = LocalDate.now().withDayOfYear(1).atStartOfDay();

        result.put("totalSpent", new BigDecimal(entityManager.createNativeQuery(baseSql).setParameter(1, userId).getSingleResult().toString()));
        result.put("spentToday", new BigDecimal(entityManager.createNativeQuery(baseSql + " AND created_at >= ?").setParameter(1, userId).setParameter(2, todayStart).getSingleResult().toString()));
        result.put("spentThisMonth", new BigDecimal(entityManager.createNativeQuery(baseSql + " AND created_at >= ?").setParameter(1, userId).setParameter(2, monthStart).getSingleResult().toString()));
        result.put("spentThisYear", new BigDecimal(entityManager.createNativeQuery(baseSql + " AND created_at >= ?").setParameter(1, userId).setParameter(2, yearStart).getSingleResult().toString()));

        String countSql = "SELECT COUNT(*) FROM orders WHERE user_id=? AND status <> 'CANCELLED'";
        if (periodStart != null) {
            result.put("totalOrders", ((Number) entityManager.createNativeQuery(countSql + " AND created_at >= ?").setParameter(1, userId).setParameter(2, periodStart).getSingleResult()).longValue());
        } else {
            result.put("totalOrders", ((Number) entityManager.createNativeQuery(countSql).setParameter(1, userId).getSingleResult()).longValue());
        }

        // Spending by month of current year
        List<?> monthlyRows = entityManager.createNativeQuery(
            "SELECT MONTH(created_at) as monthNum, COALESCE(SUM(total_amount),0) as amount " +
            "FROM orders " +
            "WHERE user_id=? AND status <> 'CANCELLED' AND YEAR(created_at) = YEAR(CURDATE()) " +
            "GROUP BY MONTH(created_at) " +
            "ORDER BY MONTH(created_at)"
        ).setParameter(1, userId).getResultList();
        List<Map<String, Object>> monthlySpending = new ArrayList<>();
        for (Object r : monthlyRows) {
            Object[] arr = (Object[]) r;
            Map<String, Object> m = new HashMap<>();
            m.put("label", "Tháng " + ((Number) arr[0]).intValue());
            m.put("value", arr[1]);
            monthlySpending.add(m);
        }
        result.put("monthlySpending", monthlySpending);

        // Spending by Category
        String catSql = "SELECT COALESCE(c.name, 'Khác') as label, COALESCE(SUM(oi.price * oi.quantity),0) as value " +
                         "FROM order_items oi " +
                         "LEFT JOIN products p ON oi.product_id = p.id " +
                         "LEFT JOIN categories c ON p.category_id = c.id " +
                         "JOIN orders o ON oi.order_id = o.id " +
                         "WHERE o.user_id=? AND o.status <> 'CANCELLED' ";
        List<?> catRevs;
        if (periodStart != null) {
            catRevs = entityManager.createNativeQuery(catSql + "AND o.created_at >= ? GROUP BY COALESCE(c.name, 'Khác') ORDER BY value DESC").setParameter(1, userId).setParameter(2, periodStart).getResultList();
        } else {
            catRevs = entityManager.createNativeQuery(catSql + "GROUP BY COALESCE(c.name, 'Khác') ORDER BY value DESC").setParameter(1, userId).getResultList();
        }
        List<Map<String, Object>> categorySpending = new ArrayList<>();
        for (Object r : catRevs) {
            Object[] arr = (Object[]) r;
            Map<String, Object> m = new HashMap<>();
            m.put("label", arr[0]);
            m.put("value", arr[1]);
            categorySpending.add(m);
        }
        result.put("categorySpending", categorySpending);

        // Top products
        String topProdSql = "SELECT oi.product_id as id, COALESCE(p.name, oi.product_name, CONCAT('Sản phẩm #', oi.product_id)) as name, p.image_url as imageUrl, COALESCE(SUM(oi.quantity),0) as quantity, COALESCE(SUM(oi.price * oi.quantity),0) as totalSpent " +
                            "FROM order_items oi " +
                            "LEFT JOIN products p ON oi.product_id = p.id " +
                            "JOIN orders o ON oi.order_id = o.id " +
                            "WHERE o.user_id=? AND o.status <> 'CANCELLED' ";
        List<?> topProds;
        if (periodStart != null) {
            topProds = entityManager.createNativeQuery(topProdSql + "AND o.created_at >= ? GROUP BY oi.product_id, p.name, oi.product_name, p.image_url ORDER BY quantity DESC LIMIT 5").setParameter(1, userId).setParameter(2, periodStart).getResultList();
        } else {
            topProds = entityManager.createNativeQuery(topProdSql + "GROUP BY oi.product_id, p.name, oi.product_name, p.image_url ORDER BY quantity DESC LIMIT 5").setParameter(1, userId).getResultList();
        }
        List<Map<String, Object>> topProdList = new ArrayList<>();
        for (Object r : topProds) {
            Object[] arr = (Object[]) r;
            Map<String, Object> m = new HashMap<>();
            m.put("id", ((Number) arr[0]).longValue());
            m.put("name", arr[1]);
            m.put("imageUrl", arr[2]);
            m.put("quantity", arr[3]);
            m.put("totalSpent", arr[4]);
            topProdList.add(m);
        }
        result.put("topProducts", topProdList);

        // Daily spending
        List<Map<String, Object>> dailySpending = new ArrayList<>();
        if ("today".equalsIgnoreCase(period)) {
            List<?> rows = entityManager.createNativeQuery(
                "SELECT HOUR(created_at) as hr, COALESCE(SUM(total_amount),0) as amount FROM orders WHERE user_id=? AND status <> 'CANCELLED' AND created_at >= ? GROUP BY HOUR(created_at) ORDER BY HOUR(created_at)"
            ).setParameter(1, userId).setParameter(2, periodStart).getResultList();
            for (Object r : rows) {
                Object[] arr = (Object[]) r;
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("label", String.format("%02d:00", ((Number) arr[0]).intValue()));
                m.put("value", arr[1]);
                dailySpending.add(m);
            }
        } else if ("week".equalsIgnoreCase(period) || "month".equalsIgnoreCase(period)) {
            List<?> rows = entityManager.createNativeQuery(
                "SELECT DATE(created_at) as dt, COALESCE(SUM(total_amount),0) as amount FROM orders WHERE user_id=? AND status <> 'CANCELLED' AND created_at >= ? GROUP BY DATE(created_at) ORDER BY DATE(created_at)"
            ).setParameter(1, userId).setParameter(2, periodStart).getResultList();
            for (Object r : rows) {
                Object[] arr = (Object[]) r;
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("label", arr[0].toString());
                m.put("value", arr[1]);
                dailySpending.add(m);
            }
        } else {
            String sql = "SELECT DATE_FORMAT(created_at, '%Y-%m') as dt, COALESCE(SUM(total_amount),0) as amount FROM orders WHERE user_id=? AND status <> 'CANCELLED' ";
            List<?> rows;
            if (periodStart != null) {
                rows = entityManager.createNativeQuery(sql + "AND created_at >= ? GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY dt").setParameter(1, userId).setParameter(2, periodStart).getResultList();
            } else {
                rows = entityManager.createNativeQuery(sql + "GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY dt").setParameter(1, userId).getResultList();
            }
            for (Object r : rows) {
                Object[] arr = (Object[]) r;
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("label", arr[0].toString());
                m.put("value", arr[1]);
                dailySpending.add(m);
            }
        }
        result.put("dailySpending", dailySpending);

        return result;
    }

    private Coupon couponByCode(String code) {
        requireText(code, "Coupon code is required");
        Coupon c = couponRepository.findByCodeAndActiveTrue(code.trim().toUpperCase())
                .orElseThrow(() -> new BadRequestException("Mã giảm giá không tồn tại hoặc đã bị tắt"));

        LocalDate today = LocalDate.now();
        if (c.getStartDate() != null && today.isBefore(c.getStartDate())) {
            throw new BadRequestException("Mã giảm giá chưa đến thời gian áp dụng");
        }
        if (c.getEndDate() != null && today.isAfter(c.getEndDate())) {
            throw new BadRequestException("Mã giảm giá đã hết hạn sử dụng");
        }
        return c;
    }

    private Map<String, Object> mapCoupon(Coupon c) {
        if (c == null) return null;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("code", c.getCode());
        m.put("discount_percent", c.getDiscountPercent());
        m.put("active", c.getActive());
        m.put("start_date", c.getStartDate());
        m.put("end_date", c.getEndDate());
        m.put("max_uses", c.getMaxUses());
        m.put("used_count", c.getUsedCount());
        return m;
    }

    private Map<String, Object> mapReview(Review r) {
        if (r == null) return null;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("user_id", r.getUser().getId());
        m.put("product_id", r.getProduct().getId());
        m.put("rating", r.getRating());
        m.put("comment", r.getComment());
        m.put("created_at", r.getCreatedAt());
        return m;
    }

    private Map<String, Object> mapOrder(Order o) {
        if (o == null) return null;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", o.getId());
        m.put("user_id", o.getUser().getId());
        m.put("username", o.getUser().getUsername());
        m.put("email", o.getUser().getEmail());
        m.put("coupon_id", o.getCoupon() != null ? o.getCoupon().getId() : null);
        m.put("total_amount", o.getTotalAmount());
        m.put("discount_amount", o.getDiscountAmount());
        m.put("status", o.getStatus());
        m.put("shipping_name", o.getShippingName());
        m.put("shipping_address", o.getShippingAddress());
        m.put("shipping_phone", o.getShippingPhone());
        m.put("note", o.getNote());
        m.put("created_at", o.getCreatedAt());

        List<Map<String, Object>> itemMaps = new ArrayList<>();
        if (o.getItems() != null) {
            for (OrderItem oi : o.getItems()) {
                Map<String, Object> im = new LinkedHashMap<>();
                im.put("id", oi.getId());
                im.put("order_id", oi.getOrder().getId());
                im.put("product_id", oi.getProduct().getId());
                im.put("product_name", oi.getProductName());
                im.put("quantity", oi.getQuantity());
                im.put("price", oi.getPrice());
                im.put("imageUrl", oi.getProduct().getImageUrl());
                im.put("productDescription", oi.getProduct().getDescription());
                itemMaps.add(im);
            }
        }
        m.put("items", itemMaps);
        return m;
    }

    private Map<String, Object> mapProductWithStats(Product p) {
        if (p == null) return null;
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", p.getId());
        map.put("name", p.getName());
        map.put("description", p.getDescription());
        map.put("price", p.getPrice());
        map.put("stock", p.getStock());
        map.put("image_url", p.getImageUrl());
        map.put("category_id", p.getCategory() != null ? p.getCategory().getId() : null);
        map.put("category_name", p.getCategory() != null ? p.getCategory().getName() : null);
        map.put("featured", p.getFeatured());
        map.put("discount_percent", p.getDiscountPercent());
        map.put("brand", p.getBrand());
        map.put("created_at", p.getCreatedAt());

        double avg = 0.0;
        long count = 0;
        if (p.getId() != null) {
            Object[] stats = (Object[]) entityManager.createQuery(
                "SELECT COALESCE(ROUND(AVG(r.rating), 1), 0.0), COUNT(r.id) FROM Review r WHERE r.product.id = :prodId"
            )
            .setParameter("prodId", p.getId())
            .getSingleResult();
            avg = ((Number) stats[0]).doubleValue();
            count = ((Number) stats[1]).longValue();
        }
        map.put("average_rating", avg);
        map.put("review_count", count);

        BigDecimal salePrice = p.getPrice().multiply(BigDecimal.valueOf(100 - p.getDiscountPercent())).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        map.put("sale_price", salePrice);

        return map;
    }

    private LocalDateTime resolvePeriodStart(String period) {
        if ("today".equalsIgnoreCase(period)) {
            return LocalDate.now().atStartOfDay();
        } else if ("week".equalsIgnoreCase(period)) {
            return LocalDate.now().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).atStartOfDay();
        } else if ("month".equalsIgnoreCase(period)) {
            return LocalDate.now().withDayOfMonth(1).atStartOfDay();
        } else if ("year".equalsIgnoreCase(period)) {
            return LocalDate.now().withDayOfYear(1).atStartOfDay();
        }
        return null;
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

    private void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(message);
        }
    }

    public Map<String, Object> getAdminRevenueReport(String period) {
        Map<String, Object> result = new LinkedHashMap<>();
        LocalDateTime periodStart = resolvePeriodStart(period);

        // 1. Daily/Monthly revenue chart data
        result.put("revenueChartData", dashboard(period).get("revenueChartData"));

        // 2. Daily revenue list
        String dailyRevSql = "SELECT DATE(created_at) as dt, COUNT(id) as orderCount, COALESCE(SUM(total_amount),0) as amount " +
                             "FROM orders WHERE status <> 'CANCELLED' ";
        List<?> dailyRevRows;
        if (periodStart != null) {
            dailyRevRows = entityManager.createNativeQuery(dailyRevSql + "AND created_at >= ? GROUP BY DATE(created_at) ORDER BY DATE(created_at) DESC")
                    .setParameter(1, periodStart).getResultList();
        } else {
            dailyRevRows = entityManager.createNativeQuery(dailyRevSql + "GROUP BY DATE(created_at) ORDER BY DATE(created_at) DESC").getResultList();
        }
        List<Map<String, Object>> dailyRevenue = new ArrayList<>();
        for (Object r : dailyRevRows) {
            Object[] arr = (Object[]) r;
            Map<String, Object> m = new HashMap<>();
            m.put("date", arr[0].toString());
            m.put("orderCount", arr[1]);
            m.put("amount", arr[2]);
            dailyRevenue.add(m);
        }
        result.put("dailyRevenue", dailyRevenue);

        // 3. Top buyers list
        String buyerSql = "SELECT u.id as userId, u.username, u.email, u.full_name as fullName, " +
                          "COUNT(o.id) as orderCount, COALESCE(SUM(o.total_amount),0) as totalSpent " +
                          "FROM orders o JOIN users u ON u.id = o.user_id " +
                          "WHERE o.status <> 'CANCELLED' ";
        List<?> buyerRows;
        if (periodStart != null) {
            buyerRows = entityManager.createNativeQuery(buyerSql + "AND o.created_at >= ? GROUP BY u.id, u.username, u.email, u.full_name ORDER BY totalSpent DESC LIMIT 20")
                    .setParameter(1, periodStart).getResultList();
        } else {
            buyerRows = entityManager.createNativeQuery(buyerSql + "GROUP BY u.id, u.username, u.email, u.full_name ORDER BY totalSpent DESC LIMIT 20").getResultList();
        }
        List<Map<String, Object>> topBuyers = new ArrayList<>();
        for (Object r : buyerRows) {
            Object[] arr = (Object[]) r;
            Map<String, Object> m = new HashMap<>();
            m.put("userId", ((Number) arr[0]).longValue());
            m.put("username", arr[1]);
            m.put("email", arr[2]);
            m.put("fullName", arr[3]);
            m.put("orderCount", arr[4]);
            m.put("totalSpent", arr[5]);
            topBuyers.add(m);
        }
        result.put("topBuyers", topBuyers);

        // 4. Recent order details
        String orderSql = "SELECT o.id, u.username, u.full_name as fullName, o.total_amount as totalAmount, o.status, o.created_at as createdAt " +
                          "FROM orders o JOIN users u ON u.id = o.user_id " +
                          "WHERE o.status <> 'CANCELLED' ";
        List<?> orderDetailsRows;
        if (periodStart != null) {
            orderDetailsRows = entityManager.createNativeQuery(orderSql + "AND o.created_at >= ? ORDER BY o.created_at DESC LIMIT 50")
                    .setParameter(1, periodStart).getResultList();
        } else {
            orderDetailsRows = entityManager.createNativeQuery(orderSql + "ORDER BY o.created_at DESC LIMIT 50").getResultList();
        }
        List<Map<String, Object>> orderDetails = new ArrayList<>();
        for (Object r : orderDetailsRows) {
            Object[] arr = (Object[]) r;
            Map<String, Object> m = new HashMap<>();
            m.put("id", ((Number) arr[0]).longValue());
            m.put("username", arr[1]);
            m.put("fullName", arr[2]);
            m.put("totalAmount", arr[3]);
            m.put("status", arr[4]);
            m.put("createdAt", arr[5]);
            orderDetails.add(m);
        }
        result.put("orderDetails", orderDetails);

        // 5. Top selling products in period
        result.put("topProducts", dashboard(period).get("topProducts"));

        return result;
    }

    @Transactional
    public void updateRankMinSpent(String id, BigDecimal minSpent) {
        if (minSpent == null || minSpent.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Số tiền tích lũy tối thiểu không được âm");
        }
        Rank r = rankRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rank not found"));
        r.setMinSpent(minSpent);
        rankRepository.save(r);
    }
}
