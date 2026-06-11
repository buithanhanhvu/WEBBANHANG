package com.example.webbanhang.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class Requests {
    private Requests() {
    }

    public record RegisterRequest(String username, String email, String password, String fullName, String phone, String address) {
    }

    public record LoginRequest(String usernameOrEmail, String password) {
    }

    public record GoogleLoginRequest(String credential) {
    }

    public record ForgotPasswordRequest(String email) {
    }

    public record ResetPasswordRequest(String email, String otp, String newPassword) {
    }



    public record ProfileRequest(String email, String fullName, String phone, String address, String avatarUrl) {
    }

    public record ChangePasswordRequest(String currentPassword, String newPassword) {
    }

    public record CategoryRequest(String name, String description) {
    }

    public record ProductRequest(String name, String description, BigDecimal price, Integer stock, String imageUrl,
                                 Long categoryId, Boolean featured, Integer discountPercent) {
    }

    public record CartRequest(Long productId, Integer quantity) {
    }

    public record CouponRequest(String code, Integer discountPercent, Boolean active, LocalDate startDate, LocalDate endDate, Integer maxUses) {
    }

    public record CheckoutRequest(String couponCode, String shippingName, String shippingAddress, String shippingPhone, String note) {
    }

    public record OrderStatusRequest(String status) {
    }

    public record ReviewRequest(Long productId, Integer rating, String comment) {
    }
}
