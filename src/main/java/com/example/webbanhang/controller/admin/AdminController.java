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
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin Operations", description = "Endpoints dành cho quản trị viên quản lý sản phẩm, danh mục, đơn hàng, coupon và người dùng")
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
    @Operation(summary = "Lấy dữ liệu thống kê tổng quan (Dashboard)")
    public ApiResponse<Map<String, Object>> dashboard(@RequestParam(value = "period", required = false, defaultValue = "all") String period, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(shopService.dashboard(period));
    }

    // ── Categories ──

    @PostMapping("/categories")
    @Operation(summary = "Tạo mới một danh mục sản phẩm")
    public ApiResponse<Map<String, Object>> createCategory(@Valid @RequestBody CategoryRequest body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        Map<String, Object> result = catalogService.createCategory(body);
        if (realtimeService != null) realtimeService.categoryChanged("created", result);
        return ApiResponse.ok(result);
    }

    @PutMapping("/categories/{id}")
    @Operation(summary = "Cập nhật thông tin danh mục")
    public ApiResponse<Map<String, Object>> updateCategory(@PathVariable long id, @Valid @RequestBody CategoryRequest body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        Map<String, Object> result = catalogService.updateCategory(id, body);
        if (realtimeService != null) realtimeService.categoryChanged("updated", result);
        return ApiResponse.ok(result);
    }

    @DeleteMapping("/categories/{id}")
    @Operation(summary = "Xóa một danh mục sản phẩm")
    public ApiResponse<Void> deleteCategory(@PathVariable long id, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        catalogService.deleteCategory(id);
        if (realtimeService != null) realtimeService.categoryChanged("deleted", Map.of("id", id));
        return ApiResponse.ok("Deleted", null);
    }

    // ── Products ──

    @PostMapping("/products")
    @Operation(summary = "Tạo mới một sản phẩm")
    public ApiResponse<Map<String, Object>> createProduct(@Valid @RequestBody ProductRequest body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        Map<String, Object> result = catalogService.createProduct(body);
        if (realtimeService != null) realtimeService.productChanged("created", result);
        return ApiResponse.ok(result);
    }

    @PutMapping("/products/{id}")
    @Operation(summary = "Cập nhật thông tin sản phẩm")
    public ApiResponse<Map<String, Object>> updateProduct(@PathVariable long id, @Valid @RequestBody ProductRequest body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        Map<String, Object> result = catalogService.updateProduct(id, body);
        if (realtimeService != null) realtimeService.productChanged("updated", result);
        return ApiResponse.ok(result);
    }

    @DeleteMapping("/products/{id}")
    @Operation(summary = "Xóa một sản phẩm")
    public ApiResponse<Void> deleteProduct(@PathVariable long id, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        catalogService.deleteProduct(id);
        if (realtimeService != null) realtimeService.productChanged("deleted", Map.of("id", id));
        return ApiResponse.ok("Deleted", null);
    }

    @PutMapping("/products/bulk-category")
    @Operation(summary = "Cập nhật danh mục hàng loạt cho danh sách sản phẩm")
    public ApiResponse<Void> bulkUpdateCategory(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        List<?> rawIds = (List<?>) body.get("productIds");
        if (rawIds == null) {
            throw new com.example.webbanhang.exception.BadRequestException("Danh sách sản phẩm không hợp lệ");
        }
        List<Long> productIds = rawIds.stream()
                .map(x -> ((Number) x).longValue())
                .toList();
        Long categoryId = body.get("categoryId") != null ? ((Number) body.get("categoryId")).longValue() : null;
        catalogService.bulkUpdateCategory(productIds, categoryId);
        if (realtimeService != null) {
            realtimeService.productChanged("updated", Map.of());
        }
        return ApiResponse.ok("Cập nhật danh mục hàng loạt thành công", null);
    }


    // ── Coupons ──

    @GetMapping("/coupons")
    @Operation(summary = "Lấy danh sách tất cả các coupon")
    public ApiResponse<List<Map<String, Object>>> coupons(HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(shopService.coupons());
    }

    @PostMapping("/coupons")
    @Operation(summary = "Tạo mới một coupon giảm giá")
    public ApiResponse<Map<String, Object>> createCoupon(@Valid @RequestBody CouponRequest body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(shopService.createCoupon(body));
    }

    @PutMapping("/coupons/{id}")
    @Operation(summary = "Cập nhật thông tin coupon")
    public ApiResponse<Map<String, Object>> updateCoupon(@PathVariable long id, @Valid @RequestBody CouponRequest body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(shopService.updateCoupon(id, body));
    }

    @DeleteMapping("/coupons/{id}")
    @Operation(summary = "Xóa một coupon")
    public ApiResponse<Void> deleteCoupon(@PathVariable long id, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        shopService.deleteCoupon(id);
        return ApiResponse.ok("Deleted", null);
    }

    // ── Users ──

    @GetMapping("/users")
    @Operation(summary = "Lấy danh sách tất cả người dùng hệ thống")
    public ApiResponse<List<Map<String, Object>>> users(HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(shopService.allUsers());
    }

    @PutMapping("/users/{id}/status")
    @Operation(summary = "Cập nhật trạng thái người dùng (Ví dụ: BAN tài khoản)")
    public ApiResponse<Void> updateUserStatus(@PathVariable long id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        String status = String.valueOf(body.get("status"));
        Integer banDays = (Integer) body.get("banDays");
        shopService.updateUserStatus(id, status, banDays);
        return ApiResponse.ok("Updated", null);
    }


    @DeleteMapping("/users/{id}")
    @Operation(summary = "Xóa vĩnh viễn tài khoản người dùng")
    public ApiResponse<Void> deleteUser(@PathVariable long id, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        shopService.deleteUser(id);
        return ApiResponse.ok("Deleted", null);
    }

    // ── Orders ──

    @GetMapping("/orders")
    @Operation(summary = "Lấy danh sách tất cả đơn hàng")
    public ApiResponse<List<Map<String, Object>>> orders(HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(shopService.orders(0, true));
    }

    @GetMapping("/orders/{id}")
    @Operation(summary = "Lấy chi tiết một đơn hàng")
    public ApiResponse<Map<String, Object>> order(@PathVariable long id, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(shopService.order(0, id, true));
    }

    @PutMapping("/orders/{id}/status")
    @Operation(summary = "Cập nhật trạng thái đơn hàng")
    public ApiResponse<Map<String, Object>> status(@PathVariable long id, @Valid @RequestBody OrderStatusRequest body, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        Map<String, Object> result = shopService.updateOrderStatus(id, body.status());
        if (realtimeService != null) {
            realtimeService.orderChanged("status_updated", Map.of("id", id, "status", body.status()));
        }
        return ApiResponse.ok(result);
    }

    // ── Revenue Report ──

    @GetMapping("/revenue-report")
    @Operation(summary = "Lấy báo cáo phân tích doanh thu chi tiết")
    public ApiResponse<Map<String, Object>> revenueReport(
            @RequestParam(value = "period", required = false, defaultValue = "all") String period,
            HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(shopService.getAdminRevenueReport(period));
    }



    // ── Recycle Bin ──

    @GetMapping("/recycle-bin")
    @Operation(summary = "Lấy danh sách các tài nguyên trong thùng rác")
    public ApiResponse<List<Map<String, Object>>> getRecycleBin(HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        return ApiResponse.ok(recycleBinService.getRecycleBinItems());
    }

    @PostMapping("/recycle-bin/{id}/restore")
    @Operation(summary = "Khôi phục tài nguyên đã xóa từ thùng rác")
    public ApiResponse<Void> restoreItem(@PathVariable long id, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        recycleBinService.restoreItem(id);
        if (realtimeService != null) {
            realtimeService.productChanged("created", Map.of());
        }
        return ApiResponse.ok("Khôi phục thành công", null);
    }

    @DeleteMapping("/recycle-bin/{id}")
    @Operation(summary = "Xóa vĩnh viễn tài nguyên khỏi thùng rác")
    public ApiResponse<Void> deletePermanently(@PathVariable long id, HttpServletRequest request) {
        currentUserService.requireAdmin(request);
        recycleBinService.deletePermanently(id);
        return ApiResponse.ok("Xóa vĩnh viễn thành công", null);
    }
}
