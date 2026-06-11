package com.example.webbanhang.service;

import com.example.webbanhang.common.JsonHelper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class RecycleBinService {
    private final JdbcTemplate jdbc;

    public RecycleBinService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void saveToRecycleBin(String entityType, long entityId, String displayName, Map<String, Object> data) {
        try {
            String json = JsonHelper.toJson(data);
            jdbc.update("INSERT INTO recycle_bin (entity_type, entity_id, display_name, original_data) VALUES (?, ?, ?, ?)",
                    entityType, entityId, displayName, json);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi lưu trữ dữ liệu vào thùng rác: " + e.getMessage(), e);
        }
    }

    public List<Map<String, Object>> getRecycleBinItems() {
        return jdbc.queryForList("SELECT id, entity_type, entity_id, display_name, deleted_at FROM recycle_bin ORDER BY deleted_at DESC");
    }

    @Transactional
    public void restoreItem(long id) {
        Map<String, Object> item = jdbc.queryForMap("SELECT * FROM recycle_bin WHERE id = ?", id);
        String entityType = (String) item.get("entity_type");
        String originalData = (String) item.get("original_data");

        try {
            Map<String, Object> data = JsonHelper.fromJson(originalData);

            switch (entityType.toUpperCase()) {
                case "USER":
                    jdbc.update("INSERT INTO users(id, username, password_hash, full_name, email, phone, address, role, avatar_url, status, ban_until, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                            data.get("id"), data.get("username"), data.get("password_hash"), data.get("full_name"),
                            data.get("email"), data.get("phone"), data.get("address"), data.get("role"),
                            data.get("avatar_url"), data.get("status"), data.get("ban_until"), data.get("created_at"));
                    break;

                case "PRODUCT":
                    Long catId = data.get("category_id") != null ? ((Number) data.get("category_id")).longValue() : null;
                    if (catId != null) {
                        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM categories WHERE id = ?", Integer.class, catId);
                        if (count == null || count == 0) {
                            catId = null;
                        }
                    }
                    jdbc.update("INSERT INTO products(id, name, description, price, stock, image_url, category_id, featured, discount_percent, created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
                            data.get("id"), data.get("name"), data.get("description"), data.get("price"),
                            data.get("stock"), data.get("image_url"), catId, data.get("featured"),
                            data.get("discount_percent"), data.get("created_at"));
                    break;

                case "CATEGORY":
                    jdbc.update("INSERT INTO categories(id, name, description) VALUES(?,?,?)",
                            data.get("id"), data.get("name"), data.get("description"));
                    if (data.get("product_ids") != null) {
                        java.util.Collection<?> productIds = (java.util.Collection<?>) data.get("product_ids");
                        for (Object prodId : productIds) {
                            jdbc.update("UPDATE products SET category_id = ? WHERE id = ?", data.get("id"), ((Number) prodId).longValue());
                        }
                    }
                    break;

                case "COUPON":
                    jdbc.update("INSERT INTO coupons(id, code, discount_percent, max_uses, used_count, start_date, end_date, active) VALUES(?,?,?,?,?,?,?,?)",
                            data.get("id"), data.get("code"), data.get("discount_percent"), data.get("max_uses"),
                            data.get("used_count"), data.get("start_date"), data.get("end_date"), data.get("active"));
                    break;

                default:
                    throw new IllegalArgumentException("Loại thực thể không hợp lệ: " + entityType);
            }

            jdbc.update("DELETE FROM recycle_bin WHERE id = ?", id);
        } catch (Exception e) {
            throw new RuntimeException("Khôi phục thất bại: " + e.getMessage(), e);
        }
    }

    public void deletePermanently(long id) {
        jdbc.update("DELETE FROM recycle_bin WHERE id = ?", id);
    }
}
