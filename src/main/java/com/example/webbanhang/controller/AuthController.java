package com.example.webbanhang.controller;

import com.example.webbanhang.common.ApiResponse;
import com.example.webbanhang.dto.Requests.LoginRequest;
import com.example.webbanhang.dto.Requests.ProfileRequest;
import com.example.webbanhang.dto.Requests.RegisterRequest;
import com.example.webbanhang.security.CurrentUserService;
import com.example.webbanhang.service.AuthService;
import com.example.webbanhang.service.ShopService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import com.example.webbanhang.dto.Requests.ChangePasswordRequest;

@RestController
@RequestMapping("/api/auth")
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
    public ApiResponse<Map<String, Object>> register(@RequestBody RegisterRequest request) {
        return ApiResponse.ok("Registered", authService.register(request));
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@RequestBody LoginRequest request) {
        return ApiResponse.ok("Logged in", authService.login(request));
    }

    @PostMapping("/google")
    public ApiResponse<Map<String, Object>> loginWithGoogle(@RequestBody com.example.webbanhang.dto.Requests.GoogleLoginRequest request) {
        return ApiResponse.ok("Logged in with Google", authService.loginWithGoogle(request.credential()));
    }

    @GetMapping("/me")
    public ApiResponse<Map<String, Object>> me(HttpServletRequest request) {
        return ApiResponse.ok(authService.profile(currentUserService.requireUser(request).id()));
    }

    @PutMapping("/me")
    public ApiResponse<Map<String, Object>> updateMe(@RequestBody ProfileRequest body, HttpServletRequest request) {
        return ApiResponse.ok("Profile updated", authService.updateProfile(currentUserService.requireUser(request).id(), body));
    }

    @PostMapping("/change-password")
    public ApiResponse<Void> changePassword(@RequestBody ChangePasswordRequest body, HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        authService.changePassword(userId, body);
        return ApiResponse.ok("Password changed", null);
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout() {
        return ApiResponse.ok("Logged out", null);
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Map<String, Object>> forgotPassword(@RequestBody com.example.webbanhang.dto.Requests.ForgotPasswordRequest body) {
        String otp = authService.sendForgotPasswordOtp(body.email());
        return ApiResponse.ok("Mã OTP đã được gửi.", Map.of("otp", otp));
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@RequestBody com.example.webbanhang.dto.Requests.ResetPasswordRequest body) {
        authService.resetPassword(body.email(), body.otp(), body.newPassword());
        return ApiResponse.ok("Đặt lại mật khẩu thành công", null);
    }

    // ── Voucher ──
    @GetMapping("/vouchers/available")
    public ApiResponse<List<Map<String, Object>>> availableVouchers(HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        return ApiResponse.ok(shopService.availableVouchers(userId));
    }

    @GetMapping("/vouchers/my")
    public ApiResponse<List<Map<String, Object>>> myVouchers(HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        return ApiResponse.ok(shopService.myVouchers(userId));
    }

    @PostMapping("/vouchers/collect/{couponId}")
    public ApiResponse<Map<String, Object>> collectVoucher(@PathVariable long couponId, HttpServletRequest request) {
        long userId = currentUserService.requireUser(request).id();
        return ApiResponse.ok(shopService.collectVoucher(userId, couponId));
    }
}
