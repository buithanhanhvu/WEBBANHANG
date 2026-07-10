package com.example.webbanhang.controller;

import com.example.webbanhang.common.ApiResponse;
import com.example.webbanhang.domain.Order;
import com.example.webbanhang.exception.ResourceNotFoundException;
import com.example.webbanhang.repository.OrderRepository;
import com.example.webbanhang.service.VNPayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Controller xử lý các callback từ cổng thanh toán VNPAY.
 */
@RestController
@RequestMapping("/api/payment")
@Tag(name = "Payment", description = "Endpoints xử lý thanh toán VNPAY")
public class PaymentController {

    private final VNPayService vnPayService;
    private final OrderRepository orderRepository;

    @Value("${vnpay.ipn-url:http://localhost:8080/api/payment/vnpay-ipn}")
    private String ipnUrl;

    public PaymentController(VNPayService vnPayService, OrderRepository orderRepository) {
        this.vnPayService = vnPayService;
        this.orderRepository = orderRepository;
    }

    /**
     * Tạo URL thanh toán VNPAY cho một đơn hàng đã tồn tại.
     * Dùng khi frontend cần lấy URL redirect sang VNPAY.
     */
    @GetMapping("/vnpay-create")
    @Operation(summary = "Tạo URL thanh toán VNPAY cho đơn hàng")
    public ApiResponse<Map<String, Object>> createPayment(
            @RequestParam long orderId,
            HttpServletRequest request) {

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));

        String ipAddr = getClientIp(request);
        String paymentUrl = vnPayService.createPaymentUrl(
                order.getId(),
                order.getTotalAmount(),
                "Thanh toan don hang #" + order.getId(),
                ipAddr
        );

        Map<String, Object> result = new HashMap<>();
        result.put("orderId", orderId);
        result.put("paymentUrl", paymentUrl);
        return ApiResponse.ok(result);
    }

    /**
     * VNPAY redirect người dùng về đây sau khi thanh toán xong.
     * Xác thực chữ ký, cập nhật trạng thái đơn hàng rồi redirect sang frontend.
     */
    @GetMapping("/vnpay-return")
    @Operation(summary = "Xử lý redirect sau thanh toán VNPAY")
    public void vnpayReturn(
            @RequestParam Map<String, String> params,
            HttpServletResponse response) throws IOException {

        boolean valid = vnPayService.verifySignature(params);
        boolean success = vnPayService.isPaymentSuccess(params);
        String txnRef = vnPayService.getTxnRef(params);
        String transactionNo = params.getOrDefault("vnp_TransactionNo", "");

        long orderId = -1;
        if (txnRef != null && txnRef.contains("_")) {
            try {
                orderId = vnPayService.parseOrderId(txnRef);
            } catch (Exception ignored) {}
        }

        if (valid && success && orderId > 0) {
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order != null && "PENDING".equals(order.getPaymentStatus())) {
                order.setPaymentStatus("PAID");
                order.setVnpayTxnRef(txnRef);
                order.setVnpayTransactionNo(transactionNo);
                orderRepository.save(order);
            }
            response.sendRedirect("/payment/result?status=success&orderId=" + orderId);
        } else {
            String failRedirect = "/payment/result?status=failed";
            if (orderId > 0) failRedirect += "&orderId=" + orderId;
            if (orderId > 0 && valid) {
                // Chữ ký OK nhưng thanh toán thất bại – cập nhật trạng thái
                Order order = orderRepository.findById(orderId).orElse(null);
                if (order != null && "PENDING".equals(order.getPaymentStatus())) {
                    order.setPaymentStatus("FAILED");
                    orderRepository.save(order);
                }
            }
            response.sendRedirect(failRedirect);
        }
    }

    /**
     * VNPAY gọi IPN (server-to-server) để xác nhận kết quả thanh toán.
     * Phải trả về JSON {"RspCode":"00","Message":"Confirm Success"} khi thành công.
     */
    @PostMapping("/vnpay-ipn")
    @Operation(summary = "Nhận IPN callback từ VNPAY")
    public Map<String, String> vnpayIpn(@RequestParam Map<String, String> params) {
        Map<String, String> result = new HashMap<>();

        if (!vnPayService.verifySignature(params)) {
            result.put("RspCode", "97");
            result.put("Message", "Invalid signature");
            return result;
        }

        String txnRef = vnPayService.getTxnRef(params);
        long orderId;
        try {
            orderId = vnPayService.parseOrderId(txnRef);
        } catch (Exception e) {
            result.put("RspCode", "01");
            result.put("Message", "Order not found");
            return result;
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            result.put("RspCode", "01");
            result.put("Message", "Order not found");
            return result;
        }

        // Tránh cập nhật trùng lặp
        if (!"PENDING".equals(order.getPaymentStatus())) {
            result.put("RspCode", "02");
            result.put("Message", "Order already confirmed");
            return result;
        }

        boolean success = vnPayService.isPaymentSuccess(params);
        order.setPaymentStatus(success ? "PAID" : "FAILED");
        order.setVnpayTxnRef(txnRef);
        order.setVnpayTransactionNo(params.getOrDefault("vnp_TransactionNo", ""));
        orderRepository.save(order);

        result.put("RspCode", "00");
        result.put("Message", "Confirm Success");
        return result;
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) ip = request.getHeader("X-Real-IP");
        if (ip == null || ip.isBlank()) ip = request.getRemoteAddr();
        // Lấy IP đầu tiên nếu có nhiều (proxy chain)
        if (ip != null && ip.contains(",")) ip = ip.split(",")[0].trim();
        return ip;
    }
}
