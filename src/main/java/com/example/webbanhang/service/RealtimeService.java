package com.example.webbanhang.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Broadcast realtime events tới tất cả client đang kết nối.
 *
 * Topics:
 *   /topic/products  — khi sản phẩm được tạo / cập nhật / xóa
 *   /topic/categories — khi danh mục thay đổi
 *   /topic/orders    — khi trạng thái đơn hàng thay đổi
 *   /topic/stock     — khi tồn kho thay đổi (sau checkout)
 */
@Service
public class RealtimeService {

    private final SimpMessagingTemplate messaging;

    public RealtimeService(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    /** Gửi event tới một topic cụ thể */
    public void broadcast(String topic, String action, Object payload) {
        Map<String, Object> message = new HashMap<>();
        message.put("action", action);
        message.put("payload", payload != null ? payload : new HashMap<>());
        messaging.convertAndSend("/topic/" + topic, (Object) message);
    }

    public void productChanged(String action, Object product) {
        broadcast("products", action, product);
    }

    public void categoryChanged(String action, Object category) {
        broadcast("categories", action, category);
    }

    public void orderChanged(String action, Object order) {
        broadcast("orders", action, order);
    }

    public void stockChanged() {
        broadcast("stock", "updated", Map.of());
    }
}
