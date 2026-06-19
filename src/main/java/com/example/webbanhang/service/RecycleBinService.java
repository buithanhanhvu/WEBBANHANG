package com.example.webbanhang.service;

import com.example.webbanhang.common.JsonHelper;
import com.example.webbanhang.domain.RecycleBin;
import com.example.webbanhang.repository.RecycleBinRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class RecycleBinService {
    private final RecycleBinRepository recycleBinRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public RecycleBinService(RecycleBinRepository recycleBinRepository) {
        this.recycleBinRepository = recycleBinRepository;
    }

    public void saveToRecycleBin(String entityType, long entityId, String displayName, Map<String, Object> data) {
        try {
            String json = JsonHelper.toJson(data);
            RecycleBin bin = RecycleBin.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .displayName(displayName)
                    .originalData(json)
                    .build();
            recycleBinRepository.save(bin);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi lưu trữ dữ liệu vào thùng rác: " + e.getMessage(), e);
        }
    }

    public List<Map<String, Object>> getRecycleBinItems() {
        List<RecycleBin> items = recycleBinRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (RecycleBin item : items) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", item.getId());
            m.put("entity_type", item.getEntityType());
            m.put("entity_id", item.getEntityId());
            m.put("display_name", item.getDisplayName());
            m.put("deleted_at", item.getDeletedAt());
            result.add(m);
        }
        return result;
    }

    @Transactional
    public void restoreItem(long id) {
        RecycleBin item = recycleBinRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy mục trong thùng rác"));
        String entityType = item.getEntityType();
        String originalData = item.getOriginalData();

        try {
            Map<String, Object> data = JsonHelper.fromJson(originalData);

            switch (entityType.toUpperCase()) {
                case "USER":
                    entityManager.createNativeQuery("""
                        INSERT INTO users(id, username, password_hash, full_name, email, phone, address, role, avatar_url, status, ban_until)
                        VALUES(?,?,?,?,?,?,?,?,?,?,?)
                    """)
                    .setParameter(1, data.get("id"))
                    .setParameter(2, data.get("username"))
                    .setParameter(3, data.get("password_hash"))
                    .setParameter(4, data.get("full_name"))
                    .setParameter(5, data.get("email"))
                    .setParameter(6, data.get("phone"))
                    .setParameter(7, data.get("address"))
                    .setParameter(8, data.get("role"))
                    .setParameter(9, data.get("avatar_url"))
                    .setParameter(10, data.get("status"))
                    .setParameter(11, data.get("ban_until"))
                    .executeUpdate();
                    break;

                case "PRODUCT":
                    Long catId = data.get("category_id") != null ? ((Number) data.get("category_id")).longValue() : null;
                    if (catId != null) {
                        Number count = (Number) entityManager.createNativeQuery("SELECT COUNT(*) FROM categories WHERE id = ?")
                                .setParameter(1, catId)
                                .getSingleResult();
                        if (count == null || count.intValue() == 0) {
                            catId = null;
                        }
                    }
                    entityManager.createNativeQuery("""
                        INSERT INTO products(id, name, description, price, stock, image_url, category_id, featured, discount_percent)
                        VALUES(?,?,?,?,?,?,?,?,?)
                    """)
                    .setParameter(1, data.get("id"))
                    .setParameter(2, data.get("name"))
                    .setParameter(3, data.get("description"))
                    .setParameter(4, data.get("price"))
                    .setParameter(5, data.get("stock"))
                    .setParameter(6, data.get("image_url"))
                    .setParameter(7, catId)
                    .setParameter(8, data.get("featured"))
                    .setParameter(9, data.get("discount_percent"))
                    .executeUpdate();
                    break;

                case "CATEGORY":
                    entityManager.createNativeQuery("INSERT INTO categories(id, name, description) VALUES(?,?,?)")
                            .setParameter(1, data.get("id"))
                            .setParameter(2, data.get("name"))
                            .setParameter(3, data.get("description"))
                            .executeUpdate();
                    if (data.get("product_ids") != null) {
                        java.util.Collection<?> productIds = (java.util.Collection<?>) data.get("product_ids");
                        for (Object prodId : productIds) {
                            entityManager.createNativeQuery("UPDATE products SET category_id = ? WHERE id = ?")
                                    .setParameter(1, data.get("id"))
                                    .setParameter(2, ((Number) prodId).longValue())
                                    .executeUpdate();
                        }
                    }
                    break;

                case "COUPON":
                    entityManager.createNativeQuery("""
                        INSERT INTO coupons(id, code, discount_percent, max_uses, used_count, start_date, end_date, active)
                        VALUES(?,?,?,?,?,?,?,?)
                    """)
                    .setParameter(1, data.get("id"))
                    .setParameter(2, data.get("code"))
                    .setParameter(3, data.get("discount_percent"))
                    .setParameter(4, data.get("max_uses"))
                    .setParameter(5, data.get("used_count"))
                    .setParameter(6, data.get("start_date"))
                    .setParameter(7, data.get("end_date"))
                    .setParameter(8, data.get("active"))
                    .executeUpdate();
                    break;

                default:
                    throw new IllegalArgumentException("Loại thực thể không hợp lệ: " + entityType);
            }

            recycleBinRepository.delete(item);
        } catch (Exception e) {
            throw new RuntimeException("Khôi phục thất bại: " + e.getMessage(), e);
        }
    }

    public void deletePermanently(long id) {
        recycleBinRepository.deleteById(id);
    }
}
