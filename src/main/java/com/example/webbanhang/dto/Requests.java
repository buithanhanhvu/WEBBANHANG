package com.example.webbanhang.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public final class Requests {
    private Requests() {
    }

    public record RegisterRequest(
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 80, message = "Username must be between 3 and 80 characters")
        String username,

        @NotBlank(message = "Email is required")
        @Email(message = "Email is invalid")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        String password,

        String fullName,
        @Pattern(regexp = "^$|^[0-9]{9,11}$", message = "Số điện thoại không hợp lệ (phải gồm 9-11 chữ số)")
        String phone,
        String address
    ) {}

    public record LoginRequest(
        @NotBlank(message = "Username or email is required")
        String usernameOrEmail,

        @NotBlank(message = "Password is required")
        String password
    ) {}

    public record GoogleLoginRequest(
        @NotBlank(message = "Credential token is required")
        String credential
    ) {}

    public record ForgotPasswordRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Email is invalid")
        String email
    ) {}

    public record ResetPasswordRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Email is invalid")
        String email,

        @NotBlank(message = "OTP is required")
        String otp,

        @NotBlank(message = "New password is required")
        @Size(min = 6, message = "New password must be at least 6 characters")
        String newPassword
    ) {}

    public record ProfileRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Email is invalid")
        String email,

        @NotBlank(message = "Full name is required")
        String fullName,

        @Pattern(regexp = "^$|^[0-9]{9,11}$", message = "Số điện thoại không hợp lệ (phải gồm 9-11 chữ số)")
        String phone,
        String address,
        String avatarUrl
    ) {}

    public record ChangePasswordRequest(
        @NotBlank(message = "Current password is required")
        String currentPassword,

        @NotBlank(message = "New password is required")
        @Size(min = 6, message = "New password must be at least 6 characters")
        String newPassword
    ) {}

    public record CategoryRequest(
        @NotBlank(message = "Category name is required")
        @Size(max = 120, message = "Category name is too long")
        String name,

        @Size(max = 500, message = "Description is too long")
        String description
    ) {}

    public record ProductRequest(
        @NotBlank(message = "Product name is required")
        @Size(max = 180, message = "Product name is too long")
        String name,

        String description,

        @NotNull(message = "Price is required")
        @DecimalMin(value = "0.0", inclusive = true, message = "Price must be positive")
        BigDecimal price,

        @NotNull(message = "Stock is required")
        @Min(value = 0, message = "Stock must be zero or positive")
        Integer stock,

        String imageUrl,
        Long categoryId,
        Boolean featured,

        @Min(value = 0, message = "Discount cannot be negative")
        @Max(value = 100, message = "Discount cannot exceed 100%")
        Integer discountPercent,

        String brand,
        java.util.List<String> images
    ) {}

    public record CartRequest(
        @NotNull(message = "Product ID is required")
        Long productId,

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        Integer quantity
    ) {}

    public record CouponRequest(
        @NotBlank(message = "Coupon code is required")
        @Size(max = 50, message = "Coupon code is too long")
        String code,

        @NotNull(message = "Discount percent is required")
        @Min(value = 0)
        @Max(value = 100)
        Integer discountPercent,

        Boolean active,
        LocalDate startDate,
        LocalDate endDate,
        @NotNull(message = "Lượt sử dụng tối đa không được để trống")
        @Min(value = 1, message = "Lượt sử dụng tối đa phải lớn hơn 0")
        Integer maxUses
    ) {}

    public record CheckoutRequest(
        String couponCode,

        @NotBlank(message = "Shipping name is required")
        String shippingName,

        @NotBlank(message = "Shipping address is required")
        String shippingAddress,

        @NotBlank(message = "Shipping phone is required")
        @Pattern(regexp = "^[0-9]{9,11}$", message = "Số điện thoại không hợp lệ (phải gồm 9-11 chữ số)")
        String shippingPhone,

        String note
    ) {}

    public record OrderStatusRequest(
        @NotBlank(message = "Status is required")
        String status
    ) {}

    public record ReviewRequest(
        @NotNull(message = "Product ID is required")
        Long productId,

        @NotNull(message = "Rating is required")
        @Min(value = 1, message = "Rating must be at least 1")
        @Max(value = 5, message = "Rating must be at most 5")
        Integer rating,

        String comment
    ) {}
}
