package com.example.webbanhang.controller;

import com.example.webbanhang.common.ApiResponse;
import com.example.webbanhang.service.CatalogService;
import com.example.webbanhang.service.ShopService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class CatalogController {
    private final CatalogService catalogService;
    private final ShopService shopService;

    public CatalogController(CatalogService catalogService, ShopService shopService) {
        this.catalogService = catalogService;
        this.shopService = shopService;
    }

    @GetMapping("/categories")
    public ApiResponse<List<Map<String, Object>>> categories() {
        return ApiResponse.ok(catalogService.categories());
    }

    @GetMapping("/categories/{id}")
    public ApiResponse<Map<String, Object>> category(@PathVariable long id) {
        return ApiResponse.ok(catalogService.category(id));
    }

    @GetMapping("/products")
    public ApiResponse<List<Map<String, Object>>> products(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Boolean featured,
            @RequestParam(required = false) java.math.BigDecimal minPrice,
            @RequestParam(required = false) java.math.BigDecimal maxPrice,
            @RequestParam(required = false) Double minRating,
            @RequestParam(required = false) String sortBy) {
        return ApiResponse.ok(catalogService.products(search, categoryId, featured, minPrice, maxPrice, minRating, sortBy));
    }

    @GetMapping("/products/{id}")
    public ApiResponse<Map<String, Object>> product(@PathVariable long id) {
        return ApiResponse.ok(catalogService.product(id));
    }

    @GetMapping("/products/{id}/reviews")
    public ApiResponse<List<Map<String, Object>>> productReviews(@PathVariable long id) {
        return ApiResponse.ok(shopService.productReviews(id));
    }

    @GetMapping("/products/{id}/price-history")
    public ApiResponse<List<Map<String, Object>>> priceHistory(@PathVariable long id) {
        return ApiResponse.ok(catalogService.priceHistory(id));
    }
}
