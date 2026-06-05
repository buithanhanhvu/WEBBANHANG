package com.example.webbanhang.controller;

import com.example.webbanhang.common.ApiResponse;
import com.example.webbanhang.dto.Requests.LoginRequest;
import com.example.webbanhang.dto.Requests.ProfileRequest;
import com.example.webbanhang.dto.Requests.RegisterRequest;
import com.example.webbanhang.security.CurrentUserService;
import com.example.webbanhang.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final CurrentUserService currentUserService;

    public AuthController(AuthService authService, CurrentUserService currentUserService) {
        this.authService = authService;
        this.currentUserService = currentUserService;
    }

    @PostMapping("/register")
    public ApiResponse<Map<String, Object>> register(@RequestBody RegisterRequest request) {
        return ApiResponse.ok("Registered", authService.register(request));
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@RequestBody LoginRequest request) {
        return ApiResponse.ok("Logged in", authService.login(request));
    }

    @GetMapping("/me")
    public ApiResponse<Map<String, Object>> me(HttpServletRequest request) {
        return ApiResponse.ok(authService.profile(currentUserService.requireUser(request).id()));
    }

    @PutMapping("/me")
    public ApiResponse<Map<String, Object>> updateMe(@RequestBody ProfileRequest body, HttpServletRequest request) {
        return ApiResponse.ok("Profile updated", authService.updateProfile(currentUserService.requireUser(request).id(), body));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout() {
        return ApiResponse.ok("Logged out", null);
    }
}
