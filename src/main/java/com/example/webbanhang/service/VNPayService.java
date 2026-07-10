package com.example.webbanhang.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

@Service
public class VNPayService {

    @Value("${vnpay.tmn-code}")
    private String tmnCode;

    @Value("${vnpay.hash-secret}")
    private String hashSecret;

    @Value("${vnpay.url}")
    private String vnpayUrl;

    @Value("${vnpay.return-url}")
    private String returnUrl;

    /**
     * Tạo URL thanh toán VNPAY cho đơn hàng.
     *
     * @param orderId   ID đơn hàng (dùng làm txnRef)
     * @param amount    Số tiền thanh toán (VND)
     * @param orderInfo Mô tả đơn hàng
     * @param ipAddress IP của người dùng
     * @return URL redirect sang cổng VNPAY
     */
    public String createPaymentUrl(long orderId, BigDecimal amount, String orderInfo, String ipAddress) {
        String txnRef = orderId + "_" + System.currentTimeMillis();
        long amountInPaise = amount.multiply(BigDecimal.valueOf(100)).longValue();

        String createDate = new SimpleDateFormat("yyyyMMddHHmmss").format(new Date());
        String expireDate = new SimpleDateFormat("yyyyMMddHHmmss")
                .format(new Date(System.currentTimeMillis() + 15 * 60 * 1000)); // 15 phút

        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", tmnCode);
        params.put("vnp_Amount", String.valueOf(amountInPaise));
        params.put("vnp_CreateDate", createDate);
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_IpAddr", ipAddress != null ? ipAddress : "127.0.0.1");
        params.put("vnp_Locale", "vn");
        params.put("vnp_OrderInfo", orderInfo);
        params.put("vnp_OrderType", "other");
        params.put("vnp_ReturnUrl", returnUrl);
        params.put("vnp_TxnRef", txnRef);
        params.put("vnp_ExpireDate", expireDate);

        String queryString = buildQueryString(params);
        String secureHash = hmacSHA512(hashSecret, queryString);

        return vnpayUrl + "?" + queryString + "&vnp_SecureHash=" + secureHash;
    }

    /**
     * Xác thực chữ ký từ callback VNPAY (IPN / return URL).
     *
     * @param params Tất cả query params nhận được từ VNPAY
     * @return true nếu chữ ký hợp lệ
     */
    public boolean verifySignature(Map<String, String> params) {
        String receivedHash = params.get("vnp_SecureHash");
        if (receivedHash == null) return false;

        Map<String, String> filtered = new TreeMap<>(params);
        filtered.remove("vnp_SecureHash");
        filtered.remove("vnp_SecureHashType");

        String queryString = buildQueryString(filtered);
        String expectedHash = hmacSHA512(hashSecret, queryString);

        return expectedHash.equalsIgnoreCase(receivedHash);
    }

    /**
     * Lấy txnRef gốc (orderId_timestamp) từ params VNPAY.
     */
    public String getTxnRef(Map<String, String> params) {
        return params.get("vnp_TxnRef");
    }

    /**
     * Lấy orderId từ txnRef (format: orderId_timestamp).
     */
    public long parseOrderId(String txnRef) {
        if (txnRef == null || !txnRef.contains("_")) {
            throw new IllegalArgumentException("Invalid txnRef: " + txnRef);
        }
        return Long.parseLong(txnRef.split("_")[0]);
    }

    /**
     * Kiểm tra giao dịch có thành công không (vnp_ResponseCode = "00").
     */
    public boolean isPaymentSuccess(Map<String, String> params) {
        return "00".equals(params.get("vnp_ResponseCode"));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String buildQueryString(Map<String, String> params) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (entry.getValue() != null && !entry.getValue().isEmpty()) {
                if (!sb.isEmpty()) sb.append('&');
                sb.append(URLEncoder.encode(entry.getKey(), StandardCharsets.US_ASCII));
                sb.append('=');
                sb.append(URLEncoder.encode(entry.getValue(), StandardCharsets.US_ASCII));
            }
        }
        return sb.toString();
    }

    private String hmacSHA512(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : bytes) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error computing HMAC-SHA512", e);
        }
    }
}
