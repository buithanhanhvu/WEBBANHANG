package com.example.webbanhang.controller;

import com.example.webbanhang.common.ApiResponse;
import com.example.webbanhang.service.CatalogService;
import com.example.webbanhang.service.ShopService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@Tag(name = "Catalog", description = "Endpoints phục vụ duyệt danh mục, sản phẩm và đánh giá")
public class CatalogController {
    private final CatalogService catalogService;
    private final ShopService shopService;
    private final com.example.webbanhang.security.CurrentUserService currentUserService;

    public CatalogController(CatalogService catalogService, ShopService shopService, com.example.webbanhang.security.CurrentUserService currentUserService) {
        this.catalogService = catalogService;
        this.shopService = shopService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/categories")
    @Operation(summary = "Lấy danh sách tất cả các danh mục sản phẩm")
    public ApiResponse<List<Map<String, Object>>> categories() {
        return ApiResponse.ok(catalogService.categories());
    }

    @GetMapping("/categories/{id}")
    @Operation(summary = "Lấy thông tin chi tiết một danh mục")
    public ApiResponse<Map<String, Object>> category(@PathVariable long id) {
        return ApiResponse.ok(catalogService.category(id));
    }

    @GetMapping("/products")
    @Operation(summary = "Lấy danh sách sản phẩm có lọc, sắp xếp và phân trang")
    public ApiResponse<List<Map<String, Object>>> products(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Boolean featured,
            @RequestParam(required = false) java.math.BigDecimal minPrice,
            @RequestParam(required = false) java.math.BigDecimal maxPrice,
            @RequestParam(required = false) Double minRating,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(catalogService.products(search, categoryId, featured, minPrice, maxPrice, minRating, brand, sortBy, page, size));
    }

    @GetMapping("/products/{id}")
    @Operation(summary = "Lấy chi tiết một sản phẩm")
    public ApiResponse<Map<String, Object>> product(@PathVariable long id) {
        return ApiResponse.ok(catalogService.product(id));
    }

    @GetMapping("/products/{id}/reviews")
    @Operation(summary = "Lấy danh sách đánh giá của sản phẩm")
    public ApiResponse<List<Map<String, Object>>> productReviews(@PathVariable long id) {
        return ApiResponse.ok(shopService.productReviews(id));
    }

    @GetMapping("/products/{id}/can-review")
    @Operation(summary = "Kiểm tra xem người dùng hiện tại có được phép đánh giá sản phẩm hay không")
    public ApiResponse<Boolean> canReview(@PathVariable long id, jakarta.servlet.http.HttpServletRequest request) {
        try {
            com.example.webbanhang.security.TokenService.AuthUser user = currentUserService.requireUser(request);
            return ApiResponse.ok(shopService.canUserReviewProduct(user.id(), id));
        } catch (Exception ex) {
            return ApiResponse.ok(false);
        }
    }

    @GetMapping("/products/{id}/price-history")
    @Operation(summary = "Lấy lịch sử biến động giá của sản phẩm")
    public ApiResponse<List<Map<String, Object>>> priceHistory(@PathVariable long id) {
        return ApiResponse.ok(catalogService.priceHistory(id));
    }

    @GetMapping("/ranks")
    @Operation(summary = "Lấy danh sách phân hạng thành viên")
    public ApiResponse<List<Map<String, Object>>> ranks() {
        return ApiResponse.ok(shopService.getRanks());
    }
}
