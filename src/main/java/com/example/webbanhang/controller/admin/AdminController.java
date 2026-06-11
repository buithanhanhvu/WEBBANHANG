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
import com.example.webbanhang.service.RecycleBinService;
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
    private final RecycleBinService recycleBinService;

    public AdminController(CatalogService catalogService, ShopService shopService,
                           CurrentUserService currentUserService, RealtimeService realtimeService,
                           RecycleBinService recycleBinService) {
        this.catalogService = catalogService;
        this.shopService = shopService;
        this.currentUserService = currentUserService;
        this.realtimeService = realtimeService;
        this.recycleBinService = recycleBinService;
    }

    @GetMapping("/dashboard")
    public ApiResponse<Map<String, Object>> dashboard(@RequestParam(value = "period", required = false, defaultValue = "all") String period, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(shopService.dashboard(period));
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

    @PutMapping("/products/bulk-category")
    public ApiResponse<Void> bulkUpdateCategory(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        List<?> rawIds = (List<?>) body.get("productIds");
        if (rawIds == null) {
            throw new com.example.webbanhang.exception.BadRequestException("Danh sách sản phẩm không hợp lệ");
        }
        List<Long> productIds = rawIds.stream()
                .map(x -> ((Number) x).longValue())
                .collect(java.util.stream.Collectors.toList());
        Long categoryId = body.get("categoryId") != null ? ((Number) body.get("categoryId")).longValue() : null;
        catalogService.bulkUpdateCategory(productIds, categoryId);
        if (realtimeService != null) {
            realtimeService.productChanged("updated", Map.of());
        }
        return ApiResponse.ok("Cập nhật danh mục hàng loạt thành công", null);
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

    // ── Users ──

    @GetMapping("/users")
    public ApiResponse<List<Map<String, Object>>> users(HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(shopService.allUsers());
    }

    @PutMapping("/users/{id}/status")
    public ApiResponse<Void> updateUserStatus(@PathVariable long id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        String status = String.valueOf(body.get("status"));
        Integer banDays = (Integer) body.get("banDays");
        shopService.updateUserStatus(id, status, banDays);
        return ApiResponse.ok("Updated", null);
    }


    @DeleteMapping("/users/{id}")
    public ApiResponse<Void> deleteUser(@PathVariable long id, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        shopService.deleteUser(id);
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

    // ── Revenue Report ──

    @GetMapping("/revenue-report")
    public ApiResponse<Map<String, Object>> revenueReport(
            @RequestParam(value = "period", required = false, defaultValue = "all") String period,
            HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(shopService.getAdminRevenueReport(period));
    }

    @PutMapping("/ranks/{id}")
    public ApiResponse<Void> updateRank(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        java.math.BigDecimal minSpent = new java.math.BigDecimal(String.valueOf(body.get("minSpent")));
        shopService.updateRankMinSpent(id, minSpent);
        return ApiResponse.ok("Updated", null);
    }

    // ── Recycle Bin ──

    @GetMapping("/recycle-bin")
    public ApiResponse<List<Map<String, Object>>> getRecycleBin(HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(recycleBinService.getRecycleBinItems());
    }

    @PostMapping("/recycle-bin/{id}/restore")
    public ApiResponse<Void> restoreItem(@PathVariable long id, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        recycleBinService.restoreItem(id);
        if (realtimeService != null) {
            realtimeService.productChanged("created", Map.of());
        }
        return ApiResponse.ok("Khôi phục thành công", null);
    }

    @DeleteMapping("/recycle-bin/{id}")
    public ApiResponse<Void> deletePermanently(@PathVariable long id, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        recycleBinService.deletePermanently(id);
        return ApiResponse.ok("Xóa vĩnh viễn thành công", null);
    }
}
