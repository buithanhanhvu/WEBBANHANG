package com.example.webbanhang.controller;

import com.example.webbanhang.common.ApiResponse;
import com.example.webbanhang.dto.Requests.CartRequest;
import com.example.webbanhang.dto.Requests.CheckoutRequest;
import com.example.webbanhang.dto.Requests.ReviewRequest;
import com.example.webbanhang.security.CurrentUserService;
import com.example.webbanhang.service.ShopService;
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

    public CartController(ShopService shopService, CurrentUserService currentUserService) {
        this.shopService = shopService;
        this.currentUserService = currentUserService;
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
        return ApiResponse.ok("Order created", shopService.checkout(currentUserService.requireUser(request).id(), body));
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
}
