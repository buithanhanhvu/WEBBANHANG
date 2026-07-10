package com.example.webbanhang.controller;

import com.example.webbanhang.common.ApiResponse;
import com.example.webbanhang.dto.Requests.CartRequest;
import com.example.webbanhang.dto.Requests.CheckoutRequest;
import com.example.webbanhang.dto.Requests.ReviewRequest;
import com.example.webbanhang.security.CurrentUserService;
import com.example.webbanhang.service.ShopService;
import com.example.webbanhang.service.VNPayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@Tag(name = "Cart & Orders", description = "Endpoints phục vụ giỏ hàng, thanh toán, đơn hàng và các hoạt động của khách hàng")
public class CartController {
    private final ShopService shopService;
    private final CurrentUserService currentUserService;
    private final VNPayService vnPayService;

    public CartController(ShopService shopService, CurrentUserService currentUserService, VNPayService vnPayService) {
        this.shopService = shopService;
        this.currentUserService = currentUserService;
        this.vnPayService = vnPayService;
    }

    @GetMapping("/cart")
    @Operation(summary = "Lấy giỏ hàng hiện tại")
    public ApiResponse<Map<String, Object>> cart(HttpServletRequest request) {
        return ApiResponse.ok(shopService.cart(currentUserService.requireUser(request).id()));
    }

    @PostMapping("/cart/add")
    @Operation(summary = "Thêm sản phẩm vào giỏ hàng")
    public ApiResponse<Map<String, Object>> add(@Valid @RequestBody CartRequest body, HttpServletRequest request) {
        return ApiResponse.ok(shopService.addToCart(currentUserService.requireUser(request).id(), body));
    }

    @PutMapping("/cart/update")
    @Operation(summary = "Cập nhật số lượng sản phẩm trong giỏ hàng")
    public ApiResponse<Map<String, Object>> update(@Valid @RequestBody CartRequest body, HttpServletRequest request) {
        return ApiResponse.ok(shopService.updateCart(currentUserService.requireUser(request).id(), body));
    }

    @DeleteMapping("/cart/remove/{productId}")
    @Operation(summary = "Xóa sản phẩm khỏi giỏ hàng")
    public ApiResponse<Map<String, Object>> remove(@PathVariable long productId, HttpServletRequest request) {
        return ApiResponse.ok(shopService.removeCartItem(currentUserService.requireUser(request).id(), productId));
    }

    @PostMapping("/coupons/apply")
    @Operation(summary = "Áp dụng mã giảm giá cho giỏ hàng")
    public ApiResponse<Map<String, Object>> applyCoupon(@RequestBody Map<String, String> body, HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        Object subtotal = shopService.cart(userId).get("subtotal");
        return ApiResponse.ok(shopService.applyCoupon(body.get("code"), (java.math.BigDecimal) subtotal));
    }

    @GetMapping("/cart/apply-coupon")
    @Operation(summary = "Xem trước chiết khấu khi áp mã giảm giá")
    public ApiResponse<Map<String, Object>> previewCoupon(@RequestParam String code, HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        Object subtotal = shopService.cart(userId).get("subtotal");
        return ApiResponse.ok(shopService.applyCoupon(code, (java.math.BigDecimal) subtotal));
    }

    @PostMapping("/orders")
    @Operation(summary = "Tạo đơn hàng mới (Thanh toán)")
    public ApiResponse<Map<String, Object>> checkout(@Valid @RequestBody CheckoutRequest body, HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        Map<String, Object> order = shopService.checkout(userId, body);

        // Nếu chọn VNPAY, tạo thêm payment URL
        if ("VNPAY".equalsIgnoreCase(body.paymentMethod())) {
            java.math.BigDecimal total = (java.math.BigDecimal) order.get("total_amount");
            long orderId = ((Number) order.get("id")).longValue();
            String ip = getClientIp(request);
            String payUrl = vnPayService.createPaymentUrl(orderId, total, "Thanh toan don hang #" + orderId, ip);
            order.put("paymentUrl", payUrl);
        }
        return ApiResponse.ok("Order created", order);
    }

    @GetMapping("/orders")
    @Operation(summary = "Lấy danh sách đơn hàng đã mua")
    public ApiResponse<List<Map<String, Object>>> orders(HttpServletRequest request) {
        return ApiResponse.ok(shopService.orders(currentUserService.requireUser(request).id(), false));
    }

    @GetMapping("/purchased-products")
    @Operation(summary = "Lấy danh sách các sản phẩm đã mua thành công")
    public ApiResponse<List<Map<String, Object>>> purchasedProducts(HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        return ApiResponse.ok(shopService.purchasedProducts(userId));
    }

    @DeleteMapping("/orders/{id}/cancel")
    @Operation(summary = "Hủy một đơn hàng đang chờ")
    public ApiResponse<Map<String, Object>> cancelOrder(@PathVariable long id, HttpServletRequest request) {
        return ApiResponse.ok(shopService.cancelOrder(currentUserService.requireUser(request).id(), id));
    }

    @GetMapping("/orders/{id}")
    @Operation(summary = "Lấy chi tiết một đơn hàng")
    public ApiResponse<Map<String, Object>> order(@PathVariable long id, HttpServletRequest request) {
        return ApiResponse.ok(shopService.order(currentUserService.requireUser(request).id(), id, false));
    }

    @PostMapping("/reviews")
    @Operation(summary = "Gửi đánh giá cho sản phẩm đã mua")
    public ApiResponse<Map<String, Object>> review(@Valid @RequestBody ReviewRequest body, HttpServletRequest request) {
        return ApiResponse.ok(shopService.review(currentUserService.requireUser(request).id(), body));
    }

    @GetMapping("/wishlist")
    @Operation(summary = "Lấy danh sách sản phẩm yêu thích")
    public ApiResponse<java.util.List<Map<String, Object>>> wishlist(HttpServletRequest request) {
        return ApiResponse.ok(shopService.wishlist(currentUserService.requireUser(request).id()));
    }

    @GetMapping("/wishlist/ids")
    @Operation(summary = "Lấy danh sách ID sản phẩm yêu thích")
    public ApiResponse<java.util.List<Long>> wishlistIds(HttpServletRequest request) {
        return ApiResponse.ok(shopService.wishlistIds(currentUserService.requireUser(request).id()));
    }

    @PostMapping("/wishlist/{productId}")
    @Operation(summary = "Thêm/Xóa sản phẩm khỏi danh mục yêu thích")
    public ApiResponse<Map<String, Object>> toggleWishlist(@PathVariable long productId, HttpServletRequest request) {
        return ApiResponse.ok(shopService.toggleWishlist(currentUserService.requireUser(request).id(), productId));
    }

    @GetMapping("/wishlist/notifications")
    @Operation(summary = "Lấy thông báo giảm giá cho các sản phẩm yêu thích")
    public ApiResponse<java.util.List<Map<String, Object>>> wishlistNotifications(HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        return ApiResponse.ok(shopService.wishlistSaleNotifications(userId));
    }

    @GetMapping("/user/spending-stats")
    @Operation(summary = "Lấy thống kê phân tích chi tiêu cá nhân")
    public ApiResponse<Map<String, Object>> spendingStats(
            @RequestParam(value = "period", required = false, defaultValue = "all") String period,
            HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        return ApiResponse.ok(shopService.getUserSpendingStats(userId, period));
    }

    /**
     * VNPAY IPN – VNPAY gọi server-to-server để xác nhận giao dịch.
     * Endpoint này phải public (không cần auth).
     */
    @GetMapping("/vnpay/ipn")
    @Operation(summary = "VNPAY IPN callback (server-to-server)")
    public Map<String, String> vnpayIpn(@RequestParam Map<String, String> params) {
        if (!vnPayService.verifySignature(params)) {
            return Map.of("RspCode", "97", "Message", "Invalid signature");
        }
        try {
            String txnRef = vnPayService.getTxnRef(params);
            long orderId = vnPayService.parseOrderId(txnRef);
            boolean success = vnPayService.isPaymentSuccess(params);
            String transactionNo = params.getOrDefault("vnp_TransactionNo", "");
            shopService.updateVNPayPaymentStatus(orderId, txnRef, transactionNo, success);
            return Map.of("RspCode", "00", "Message", "Confirm success");
        } catch (Exception e) {
            return Map.of("RspCode", "99", "Message", "Internal error");
        }
    }

    /**
     * VNPAY Return URL – người dùng được redirect về sau khi thanh toán.
     * Frontend nhận params rồi gọi endpoint này để lấy kết quả.
     */
    @GetMapping("/vnpay/return")
    @Operation(summary = "Xác minh kết quả thanh toán VNPAY từ return URL")
    public ApiResponse<Map<String, Object>> vnpayReturn(@RequestParam Map<String, String> params) {
        if (!vnPayService.verifySignature(params)) {
            Map<String, Object> errResult = new java.util.LinkedHashMap<>();
            errResult.put("success", false);
            errResult.put("error", "Chữ ký không hợp lệ");
            return ApiResponse.ok(errResult);
        }
        String txnRef = vnPayService.getTxnRef(params);
        long orderId = vnPayService.parseOrderId(txnRef);
        boolean success = vnPayService.isPaymentSuccess(params);
        String transactionNo = params.getOrDefault("vnp_TransactionNo", "");
        shopService.updateVNPayPaymentStatus(orderId, txnRef, transactionNo, success);

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("success", success);
        result.put("orderId", orderId);
        result.put("txnRef", txnRef);
        result.put("responseCode", params.get("vnp_ResponseCode"));
        return ApiResponse.ok(result);
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // X-Forwarded-For có thể chứa nhiều IP, lấy IP đầu tiên
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
