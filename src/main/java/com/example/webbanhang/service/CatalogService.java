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

    public CatalogService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
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
        category(id);
        jdbc.update("DELETE FROM categories WHERE id=?", id);
    }

    public List<Map<String, Object>> products(String search, Long categoryId, Boolean featured) {
        StringBuilder sql = new StringBuilder("""
                SELECT p.*, c.name category_name,
                       COALESCE(ROUND(AVG(r.rating), 1), 0) average_rating,
                       COUNT(r.id) review_count
                FROM products p
                LEFT JOIN categories c ON c.id=p.category_id
                LEFT JOIN reviews r ON r.product_id=p.id
                WHERE 1=1
                """);
        if (search != null && !search.isBlank()) {
            sql.append(" AND (LOWER(p.name) LIKE LOWER('%").append(search.replace("'", "''")).append("%') OR LOWER(p.description) LIKE LOWER('%").append(search.replace("'", "''")).append("%'))");
        }
        if (categoryId != null) {
            sql.append(" AND p.category_id=").append(categoryId);
        }
        if (featured != null) {
            sql.append(" AND p.featured=").append(featured ? "TRUE" : "FALSE");
        }
        sql.append(" GROUP BY p.id, c.name ORDER BY p.created_at DESC");
        return jdbc.queryForList(sql.toString());
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
        product(id);
        validateProduct(request);
        jdbc.update("""
                        UPDATE products
                        SET name=?, description=?, price=?, stock=?, image_url=?, category_id=?, featured=?, discount_percent=?
                        WHERE id=?
                        """,
                request.name(), request.description(), request.price(), request.stock(), request.imageUrl(),
                request.categoryId(), Boolean.TRUE.equals(request.featured()), safeDiscount(request.discountPercent()), id);
        return product(id);
    }

    public void deleteProduct(long id) {
        product(id);
        jdbc.update("DELETE FROM products WHERE id=?", id);
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
