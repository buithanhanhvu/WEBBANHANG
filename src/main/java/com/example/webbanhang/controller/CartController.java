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

    @PostMapping("/orders")
    public ApiResponse<Map<String, Object>> checkout(@RequestBody CheckoutRequest body, HttpServletRequest request) {
        return ApiResponse.ok("Order created", shopService.checkout(currentUserService.requireUser(request).id(), body));
    }

    @GetMapping("/orders")
    public ApiResponse<List<Map<String, Object>>> orders(HttpServletRequest request) {
        return ApiResponse.ok(shopService.orders(currentUserService.requireUser(request).id(), false));
    }

    @GetMapping("/orders/{id}")
    public ApiResponse<Map<String, Object>> order(@PathVariable long id, HttpServletRequest request) {
        return ApiResponse.ok(shopService.order(currentUserService.requireUser(request).id(), id, false));
    }

    @PostMapping("/reviews")
    public ApiResponse<Map<String, Object>> review(@RequestBody ReviewRequest body, HttpServletRequest request) {
        return ApiResponse.ok(shopService.review(currentUserService.requireUser(request).id(), body));
    }
}
