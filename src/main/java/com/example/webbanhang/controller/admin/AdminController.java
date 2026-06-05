package com.example.webbanhang.controller.admin;

import com.example.webbanhang.common.ApiResponse;
import com.example.webbanhang.dto.Requests.CategoryRequest;
import com.example.webbanhang.dto.Requests.CouponRequest;
import com.example.webbanhang.dto.Requests.OrderStatusRequest;
import com.example.webbanhang.dto.Requests.ProductRequest;
import com.example.webbanhang.security.CurrentUserService;
import com.example.webbanhang.service.CatalogService;
import com.example.webbanhang.service.RealtimeService;
import com.example.webbanhang.service.ShopService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final CatalogService catalogService;
    private final ShopService shopService;
    private final CurrentUserService currentUserService;
    private final RealtimeService realtimeService;

    public AdminController(CatalogService catalogService, ShopService shopService,
                           CurrentUserService currentUserService, RealtimeService realtimeService) {
        this.catalogService = catalogService;
        this.shopService = shopService;
        this.currentUserService = currentUserService;
        this.realtimeService = realtimeService;
    }

    @GetMapping("/dashboard")
    public ApiResponse<Map<String, Object>> dashboard(HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(shopService.dashboard());
    }

    // ── Categories ──

    @PostMapping("/categories")
    public ApiResponse<Map<String, Object>> createCategory(@RequestBody CategoryRequest body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        Map<String, Object> result = catalogService.createCategory(body);
        realtimeService.categoryChanged("created", result);
        return ApiResponse.ok(result);
    }

    @PutMapping("/categories/{id}")
    public ApiResponse<Map<String, Object>> updateCategory(@PathVariable long id, @RequestBody CategoryRequest body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        Map<String, Object> result = catalogService.updateCategory(id, body);
        realtimeService.categoryChanged("updated", result);
        return ApiResponse.ok(result);
    }

    @DeleteMapping("/categories/{id}")
    public ApiResponse<Void> deleteCategory(@PathVariable long id, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        catalogService.deleteCategory(id);
        realtimeService.categoryChanged("deleted", Map.of("id", id));
        return ApiResponse.ok("Deleted", null);
    }

    // ── Products ──

    @PostMapping("/products")
    public ApiResponse<Map<String, Object>> createProduct(@RequestBody ProductRequest body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        Map<String, Object> result = catalogService.createProduct(body);
        realtimeService.productChanged("created", result);
        return ApiResponse.ok(result);
    }

    @PutMapping("/products/{id}")
    public ApiResponse<Map<String, Object>> updateProduct(@PathVariable long id, @RequestBody ProductRequest body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        Map<String, Object> result = catalogService.updateProduct(id, body);
        realtimeService.productChanged("updated", result);
        return ApiResponse.ok(result);
    }

    @DeleteMapping("/products/{id}")
    public ApiResponse<Void> deleteProduct(@PathVariable long id, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        catalogService.deleteProduct(id);
        realtimeService.productChanged("deleted", Map.of("id", id));
        return ApiResponse.ok("Deleted", null);
    }

    // ── Coupons ──

    @GetMapping("/coupons")
    public ApiResponse<List<Map<String, Object>>> coupons(HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(shopService.coupons());
    }

    @PostMapping("/coupons")
    public ApiResponse<Map<String, Object>> createCoupon(@RequestBody CouponRequest body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(shopService.createCoupon(body));
    }

    @PutMapping("/coupons/{id}")
    public ApiResponse<Map<String, Object>> updateCoupon(@PathVariable long id, @RequestBody CouponRequest body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(shopService.updateCoupon(id, body));
    }

    @DeleteMapping("/coupons/{id}")
    public ApiResponse<Void> deleteCoupon(@PathVariable long id, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        shopService.deleteCoupon(id);
        return ApiResponse.ok("Deleted", null);
    }

    // ── Orders ──

    @GetMapping("/orders")
    public ApiResponse<List<Map<String, Object>>> orders(HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(shopService.orders(0, true));
    }

    @GetMapping("/orders/{id}")
    public ApiResponse<Map<String, Object>> order(@PathVariable long id, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(shopService.order(0, id, true));
    }

    @PutMapping("/orders/{id}/status")
    public ApiResponse<Map<String, Object>> status(@PathVariable long id, @RequestBody OrderStatusRequest body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        Map<String, Object> result = shopService.updateOrderStatus(id, body.status());
        realtimeService.orderChanged("status_updated", Map.of("id", id, "status", body.status()));
        return ApiResponse.ok(result);
    }
}
