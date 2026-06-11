package com.example.webbanhang.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;
import java.util.List;

/**
 * Interceptor xác thực JWT cho tất cả /api/** endpoints
 * trừ những endpoint public (products, categories, auth/login, auth/register).
 */
@Component
public class JwtAuthInterceptor implements HandlerInterceptor {

    private final TokenService tokenService;
    private final JdbcTemplate jdbc;

    public JwtAuthInterceptor(TokenService tokenService, JdbcTemplate jdbc) {
        this.tokenService = tokenService;
        this.jdbc = jdbc;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String path = request.getRequestURI();
        String method = request.getMethod();

        // Preflight CORS requests → luôn cho qua
        if ("OPTIONS".equalsIgnoreCase(method)) return true;

        // Public endpoints — không cần JWT
        if (isPublicEndpoint(path, method)) return true;

        // Yêu cầu JWT token
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"success\":false,\"message\":\"Vui lòng đăng nhập\"}");
            return false;
        }

        try {
            TokenService.AuthUser authUser = tokenService.parseBearer(authHeader);
            List<Map<String, Object>> users = jdbc.queryForList("SELECT status, ban_until FROM users WHERE id=?", authUser.id());
            if (users.isEmpty()) {
                response.setStatus(HttpStatus.UNAUTHORIZED.value());
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"success\":false,\"message\":\"Tài khoản của bạn không tồn tại hoặc đã bị xóa. Vui lòng đăng xuất.\"}");
                return false;
            }
            Map<String, Object> u = users.get(0);
            String status = String.valueOf(u.get("status"));
            java.sql.Timestamp banUntil = (java.sql.Timestamp) u.get("ban_until");

            if ("BANNED".equals(status)) {
                if (banUntil == null) {
                    response.setStatus(HttpStatus.UNAUTHORIZED.value());
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"success\":false,\"message\":\"Tài khoản của bạn đã bị khóa vĩnh viễn.\"}");
                    return false;
                } else if (banUntil.after(new java.util.Date())) {
                    java.text.SimpleDateFormat df = new java.text.SimpleDateFormat("dd/MM/yyyy HH:mm");
                    response.setStatus(HttpStatus.UNAUTHORIZED.value());
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"success\":false,\"message\":\"Tài khoản của bạn đã bị khóa đến ngày " + df.format(banUntil) + ".\"}");
                    return false;
                } else {
                    jdbc.update("UPDATE users SET status='ACTIVE', ban_until=NULL WHERE id=?", authUser.id());
                }
            }
            return true;
        } catch (Exception e) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"success\":false,\"message\":\"Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.\"}");
            return false;
        }
    }

    private boolean isPublicEndpoint(String path, String method) {
        // Static resources
        if (!path.startsWith("/api/")) return true;

        // Auth endpoints
        if (path.equals("/api/auth/login") || path.equals("/api/auth/register") || 
            path.equals("/api/auth/google") || path.equals("/api/auth/forgot-password") || 
            path.equals("/api/auth/reset-password")) return true;

        // Public catalog (GET only)
        if ("GET".equalsIgnoreCase(method)) {
            if (path.equals("/api/products") || path.matches("/api/products/\\d+")) return true;
            if (path.matches("/api/products/\\d+/reviews")) return true;
            if (path.matches("/api/products/\\d+/price-history")) return true;
            if (path.equals("/api/categories") || path.matches("/api/categories/\\d+")) return true;
            if (path.equals("/api/ranks")) return true;
        }

        return false;
    }
}
