package com.example.webbanhang.service;

import com.example.webbanhang.dto.Requests.CategoryRequest;
import com.example.webbanhang.dto.Requests.ProductRequest;
import com.example.webbanhang.exception.BadRequestException;
import com.example.webbanhang.exception.ResourceNotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
public class CatalogService {
    private final JdbcTemplate jdbc;
    private final RecycleBinService recycleBinService;

    public CatalogService(JdbcTemplate jdbc, RecycleBinService recycleBinService) {
        this.jdbc = jdbc;
        this.recycleBinService = recycleBinService;
    }

    public List<Map<String, Object>> categories() {
        return jdbc.queryForList("SELECT * FROM categories ORDER BY name");
    }

    public Map<String, Object> category(long id) {
        return one("SELECT * FROM categories WHERE id=?", id);
    }

    public Map<String, Object> createCategory(CategoryRequest request) {
        requireText(request.name(), "Category name is required");
        jdbc.update("INSERT INTO categories(name,description) VALUES(?,?)", request.name(), request.description());
        return one("SELECT * FROM categories WHERE id=LAST_INSERT_ID()");
    }

    public Map<String, Object> updateCategory(long id, CategoryRequest request) {
        category(id);
        requireText(request.name(), "Category name is required");
        jdbc.update("UPDATE categories SET name=?, description=? WHERE id=?", request.name(), request.description(), id);
        return category(id);
    }

    public void deleteCategory(long id) {
        Map<String, Object> cat = category(id);
        List<Long> productIds = jdbc.queryForList("SELECT id FROM products WHERE category_id = ?", Long.class, id);
        Map<String, Object> catBackup = new java.util.HashMap<>(cat);
        catBackup.put("product_ids", productIds);
        recycleBinService.saveToRecycleBin("CATEGORY", id, (String) cat.get("name"), catBackup);
        jdbc.update("UPDATE products SET category_id = NULL WHERE category_id = ?", id);
        jdbc.update("DELETE FROM categories WHERE id = ?", id);
    }

    public List<Map<String, Object>> products(String search, Long categoryId, Boolean featured,
                                               java.math.BigDecimal minPrice, java.math.BigDecimal maxPrice,
                                               Double minRating, String sortBy) {
        StringBuilder sql = new StringBuilder("""
                SELECT p.*, c.name category_name,
                       COALESCE(ROUND(AVG(r.rating), 1), 0) average_rating,
                       COUNT(r.id) review_count,
                       ROUND(p.price * (100 - p.discount_percent) / 100, 2) sale_price
                FROM products p
                LEFT JOIN categories c ON c.id=p.category_id
                LEFT JOIN reviews r ON r.product_id=p.id
                WHERE 1=1
                """);
        java.util.ArrayList<Object> args = new java.util.ArrayList<>();
        if (search != null && !search.isBlank()) {
            sql.append(" AND (LOWER(p.name) LIKE LOWER(?) OR LOWER(p.description) LIKE LOWER(?) OR LOWER(c.name) LIKE LOWER(?))");
            String pattern = "%" + search.trim() + "%";
            args.add(pattern);
            args.add(pattern);
            args.add(pattern);
        }
        if (categoryId != null) { sql.append(" AND p.category_id=?"); args.add(categoryId); }
        if (featured != null)   { sql.append(" AND p.featured=?"); args.add(featured); }
        if (minPrice != null)   { sql.append(" AND (p.price * (100 - p.discount_percent) / 100) >= ?"); args.add(minPrice); }
        if (maxPrice != null)   { sql.append(" AND (p.price * (100 - p.discount_percent) / 100) <= ?"); args.add(maxPrice); }
        sql.append(" GROUP BY p.id, c.name");
        if (minRating != null)  { sql.append(" HAVING average_rating >= ?"); args.add(minRating); }
        // Sort — chỉ dùng whitelist, không interpolate user input
        if ("price_asc".equals(sortBy))        sql.append(" ORDER BY sale_price ASC");
        else if ("price_desc".equals(sortBy))  sql.append(" ORDER BY sale_price DESC");
        else if ("rating".equals(sortBy))      sql.append(" ORDER BY average_rating DESC");
        else                                   sql.append(" ORDER BY p.created_at DESC");
        return jdbc.queryForList(sql.toString(), args.toArray());
    }

    public Map<String, Object> product(long id) {
        return one("""
                SELECT p.*, c.name category_name,
                       COALESCE(ROUND(AVG(r.rating), 1), 0) average_rating,
                       COUNT(r.id) review_count
                FROM products p
                LEFT JOIN categories c ON c.id=p.category_id
                LEFT JOIN reviews r ON r.product_id=p.id
                WHERE p.id=?
                GROUP BY p.id, c.name
                """, id);
    }

    public Map<String, Object> createProduct(ProductRequest request) {
        validateProduct(request);
        jdbc.update("""
                        INSERT INTO products(name,description,price,stock,image_url,category_id,featured,discount_percent)
                        VALUES(?,?,?,?,?,?,?,?)
                        """,
                request.name(), request.description(), request.price(), request.stock(), request.imageUrl(),
                request.categoryId(), Boolean.TRUE.equals(request.featured()), safeDiscount(request.discountPercent()));
        return one("SELECT * FROM products WHERE id=LAST_INSERT_ID()");
    }

    public Map<String, Object> updateProduct(long id, ProductRequest request) {
        Map<String, Object> old = product(id);
        validateProduct(request);
        // Ghi lịch sử giá nếu giá hoặc discount thay đổi
        java.math.BigDecimal oldPrice    = (java.math.BigDecimal) old.get("price");
        int oldDiscount = old.get("discount_percent") != null ? ((Number) old.get("discount_percent")).intValue() : 0;
        int newDiscount = safeDiscount(request.discountPercent());
        boolean priceChanged = request.price() != null && !request.price().equals(oldPrice);
        boolean discountChanged = newDiscount != oldDiscount;
        jdbc.update("""
                        UPDATE products
                        SET name=?, description=?, price=?, stock=?, image_url=?, category_id=?, featured=?, discount_percent=?
                        WHERE id=?
                        """,
                request.name(), request.description(), request.price(), request.stock(), request.imageUrl(),
                request.categoryId(), Boolean.TRUE.equals(request.featured()), newDiscount, id);
        if (priceChanged || discountChanged) {
            jdbc.update("""
                INSERT INTO price_history(product_id, old_price, new_price, old_discount, new_discount)
                VALUES(?,?,?,?,?)
                """, id, oldPrice, request.price(), oldDiscount, newDiscount);
        }
        return product(id);
    }

    public List<Map<String, Object>> priceHistory(long productId) {
        product(productId);
        return jdbc.queryForList("""
            SELECT * FROM price_history WHERE product_id=? ORDER BY changed_at DESC LIMIT 20
            """, productId);
    }

    public void deleteProduct(long id) {
        Map<String, Object> prod = product(id);
        Integer orderedCount = jdbc.queryForObject("SELECT COUNT(*) FROM order_items WHERE product_id = ?", Integer.class, id);
        if (orderedCount != null && orderedCount > 0) {
            throw new BadRequestException("Không thể xóa sản phẩm này vì đã có đơn hàng đặt mua. Hãy cập nhật trạng thái hoặc chỉnh sửa tồn kho về 0 thay vì xóa.");
        }
        recycleBinService.saveToRecycleBin("PRODUCT", id, (String) prod.get("name"), prod);
        // Cascade delete tất cả dữ liệu liên quan trước khi xóa sản phẩm
        jdbc.update("DELETE FROM wishlists WHERE product_id=?", id);
        jdbc.update("DELETE FROM price_history WHERE product_id=?", id);
        jdbc.update("DELETE FROM cart_items WHERE product_id=?", id);
        jdbc.update("DELETE FROM reviews WHERE product_id=?", id);
        jdbc.update("DELETE FROM products WHERE id=?", id);
    }

    public void bulkUpdateCategory(List<Long> productIds, Long categoryId) {
        if (productIds == null || productIds.isEmpty()) {
            return;
        }
        if (categoryId != null) {
            category(categoryId);
        }
        String inSql = String.join(",", java.util.Collections.nCopies(productIds.size(), "?"));
        Object[] args = new Object[productIds.size() + 1];
        args[0] = categoryId;
        for (int i = 0; i < productIds.size(); i++) {
            args[i + 1] = productIds.get(i);
        }
        jdbc.update("UPDATE products SET category_id = ? WHERE id IN (" + inSql + ")", args);
    }


    private void validateProduct(ProductRequest request) {
        requireText(request.name(), "Product name is required");
        if (request.price() == null || request.price().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Product price must be positive");
        }
        if (request.stock() == null || request.stock() < 0) {
            throw new BadRequestException("Product stock must be zero or positive");
        }
        if (request.categoryId() != null) {
            category(request.categoryId());
        }
    }

    private int safeDiscount(Integer discount) {
        return discount == null ? 0 : Math.max(0, Math.min(100, discount));
    }

    private Map<String, Object> one(String sql, Object... args) {
        List<Map<String, Object>> rows = jdbc.queryForList(sql, args);
        if (rows.isEmpty()) {
            throw new ResourceNotFoundException("Resource not found");
        }
        return rows.get(0);
    }

    private void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(message);
        }
    }
}
