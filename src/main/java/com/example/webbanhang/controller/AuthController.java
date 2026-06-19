package com.example.webbanhang.controller;

import com.example.webbanhang.common.ApiResponse;
import com.example.webbanhang.dto.Requests.*;
import com.example.webbanhang.security.CurrentUserService;
import com.example.webbanhang.service.AuthService;
import com.example.webbanhang.service.ShopService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Endpoints phục vụ đăng ký, đăng nhập và quản lý tài khoản")
public class AuthController {
    private final AuthService authService;
    private final CurrentUserService currentUserService;
    private final ShopService shopService;

    public AuthController(AuthService authService, CurrentUserService currentUserService, ShopService shopService) {
        this.authService = authService;
        this.currentUserService = currentUserService;
        this.shopService = shopService;
    }

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản khách hàng mới")
    public ApiResponse<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.ok("Registered", authService.register(request));
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập bằng username/email và mật khẩu")
    public ApiResponse<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok("Logged in", authService.login(request));
    }

    @PostMapping("/google")
    @Operation(summary = "Đăng nhập bằng tài khoản Google")
    public ApiResponse<Map<String, Object>> loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
        return ApiResponse.ok("Logged in with Google", authService.loginWithGoogle(request.credential()));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Cấp mới Access Token bằng Refresh Token")
    public ApiResponse<Map<String, Object>> refresh(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new com.example.webbanhang.exception.BadRequestException("Refresh token is required");
        }
        return ApiResponse.ok("Token refreshed", authService.refresh(refreshToken));
    }

    @GetMapping("/me")
    @Operation(summary = "Lấy hồ sơ cá nhân của người dùng hiện tại")
    public ApiResponse<Map<String, Object>> me(HttpServletRequest request) {
        return ApiResponse.ok(authService.profile(currentUserService.requireUser(request).id()));
    }

    @PutMapping("/me")
    @Operation(summary = "Cập nhật hồ sơ cá nhân")
    public ApiResponse<Map<String, Object>> updateMe(@Valid @RequestBody ProfileRequest body, HttpServletRequest request) {
        return ApiResponse.ok("Profile updated", authService.updateProfile(currentUserService.requireUser(request).id(), body));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Đổi mật khẩu tài khoản")
    public ApiResponse<Void> changePassword(@Valid @RequestBody ChangePasswordRequest body, HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        authService.changePassword(userId, body);
        return ApiResponse.ok("Password changed", null);
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất tài khoản")
    public ApiResponse<Void> logout(HttpServletRequest request) {
        try {
            long userId = currentUserService.requireUser(request).id();
            authService.logout(userId);
        } catch (Exception ex) {
            // ignore if not logged in
        }
        return ApiResponse.ok("Logged out", null);
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Gửi OTP quên mật khẩu về email")
    public ApiResponse<Map<String, Object>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest body) {
        String otp = authService.sendForgotPasswordOtp(body.email());
        return ApiResponse.ok("Mã OTP đã được gửi.", Map.of("otp", otp));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Đặt lại mật khẩu mới bằng OTP")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest body) {
        authService.resetPassword(body.email(), body.otp(), body.newPassword());
        return ApiResponse.ok("Đặt lại mật khẩu thành công", null);
    }

    // ── Voucher ──
    @GetMapping("/vouchers/available")
    @Operation(summary = "Lấy danh sách các voucher có sẵn để người dùng nhận")
    public ApiResponse<List<Map<String, Object>>> availableVouchers(HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        return ApiResponse.ok(shopService.availableVouchers(userId));
    }

    @GetMapping("/vouchers/my")
    @Operation(summary = "Lấy danh sách voucher trong ví của người dùng hiện tại")
    public ApiResponse<List<Map<String, Object>>> myVouchers(HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        return ApiResponse.ok(shopService.myVouchers(userId));
    }

    @PostMapping("/vouchers/collect/{couponId}")
    @Operation(summary = "Thu thập một voucher vào ví")
    public ApiResponse<Map<String, Object>> collectVoucher(@PathVariable long couponId, HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        return ApiResponse.ok(shopService.collectVoucher(userId, couponId));
    }
}
