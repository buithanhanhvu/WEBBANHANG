package com.example.webbanhang.controller;

import com.example.webbanhang.common.ApiResponse;
import com.example.webbanhang.dto.Requests.CartRequest;
import com.example.webbanhang.dto.Requests.CheckoutRequest;
import com.example.webbanhang.dto.Requests.ReviewRequest;
import com.example.webbanhang.security.CurrentUserService;
import com.example.webbanhang.service.ShopService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class CartController {
    private final ShopService shopService;
    private final CurrentUserService currentUserService;

    public CartController(ShopService shopService, CurrentUserService currentUserService) {
        this.shopService = shopService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/cart")
    public ApiResponse<Map<String, Object>> cart(HttpServletRequest request) {
        return ApiResponse.ok(shopService.cart(currentUserService.requireUser(request).id()));
    }

    @PostMapping("/cart/add")
    public ApiResponse<Map<String, Object>> add(@RequestBody CartRequest body, HttpServletRequest request) {
        return ApiResponse.ok(shopService.addToCart(currentUserService.requireUser(request).id(), body));
    }

    @PutMapping("/cart/update")
    public ApiResponse<Map<String, Object>> update(@RequestBody CartRequest body, HttpServletRequest request) {
        return ApiResponse.ok(shopService.updateCart(currentUserService.requireUser(request).id(), body));
    }

    @DeleteMapping("/cart/remove/{productId}")
    public ApiResponse<Map<String, Object>> remove(@PathVariable long productId, HttpServletRequest request) {
        return ApiResponse.ok(shopService.removeCartItem(currentUserService.requireUser(request).id(), productId));
    }

    @PostMapping("/coupons/apply")
    public ApiResponse<Map<String, Object>> applyCoupon(@RequestBody Map<String, String> body, HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        Object subtotal = shopService.cart(userId).get("subtotal");
        return ApiResponse.ok(shopService.applyCoupon(body.get("code"), (java.math.BigDecimal) subtotal));
    }

    @GetMapping("/cart/apply-coupon")
    public ApiResponse<Map<String, Object>> previewCoupon(@RequestParam String code, HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        Object subtotal = shopService.cart(userId).get("subtotal");
        return ApiResponse.ok(shopService.applyCoupon(code, (java.math.BigDecimal) subtotal));
    }

    @PostMapping("/orders")
    public ApiResponse<Map<String, Object>> checkout(@RequestBody CheckoutRequest body, HttpServletRequest request) {
        return ApiResponse.ok("Order created", shopService.checkout(currentUserService.requireUser(request).id(), body));
    }

    @GetMapping("/orders")
    public ApiResponse<List<Map<String, Object>>> orders(HttpServletRequest request) {
        return ApiResponse.ok(shopService.orders(currentUserService.requireUser(request).id(), false));
    }

    @GetMapping("/purchased-products")
    public ApiResponse<List<Map<String, Object>>> purchasedProducts(HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        return ApiResponse.ok(shopService.purchasedProducts(userId));
    }

    @DeleteMapping("/orders/{id}/cancel")
    public ApiResponse<Map<String, Object>> cancelOrder(@PathVariable long id, HttpServletRequest request) {
        return ApiResponse.ok(shopService.cancelOrder(currentUserService.requireUser(request).id(), id));
    }

    @GetMapping("/orders/{id}")
    public ApiResponse<Map<String, Object>> order(@PathVariable long id, HttpServletRequest request) {
        return ApiResponse.ok(shopService.order(currentUserService.requireUser(request).id(), id, false));
    }

    @PostMapping("/reviews")
    public ApiResponse<Map<String, Object>> review(@RequestBody ReviewRequest body, HttpServletRequest request) {
        return ApiResponse.ok(shopService.review(currentUserService.requireUser(request).id(), body));
    }

    // ── Wishlist ──
    @GetMapping("/wishlist")
    public ApiResponse<java.util.List<Map<String, Object>>> wishlist(HttpServletRequest request) {
        return ApiResponse.ok(shopService.wishlist(currentUserService.requireUser(request).id()));
    }

    @GetMapping("/wishlist/ids")
    public ApiResponse<java.util.List<Long>> wishlistIds(HttpServletRequest request) {
        return ApiResponse.ok(shopService.wishlistIds(currentUserService.requireUser(request).id()));
    }

    @PostMapping("/wishlist/{productId}")
    public ApiResponse<Map<String, Object>> toggleWishlist(@PathVariable long productId, HttpServletRequest request) {
        return ApiResponse.ok(shopService.toggleWishlist(currentUserService.requireUser(request).id(), productId));
    }

    // ── Wishlist sale notifications ──
    @GetMapping("/wishlist/notifications")
    public ApiResponse<java.util.List<Map<String, Object>>> wishlistNotifications(HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        return ApiResponse.ok(shopService.wishlistSaleNotifications(userId));
    }

    // ── User spending statistics ──
    @GetMapping("/user/spending-stats")
    public ApiResponse<Map<String, Object>> spendingStats(
            @RequestParam(value = "period", required = false, defaultValue = "all") String period,
            HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        return ApiResponse.ok(shopService.getUserSpendingStats(userId, period));
    }
}
