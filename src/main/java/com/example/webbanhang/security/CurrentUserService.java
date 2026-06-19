package com.example.webbanhang.security;

import com.example.webbanhang.exception.ForbiddenException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    public TokenService.AuthUser requireUser(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof TokenService.AuthUser)) {
            throw new ForbiddenException("Missing or invalid credentials");
        }
        return (TokenService.AuthUser) auth.getPrincipal();
    }

    public TokenService.AuthUser requireAdmin(HttpServletRequest request) {
        TokenService.AuthUser user = requireUser(request);
        if (!"ADMIN".equals(user.role())) {
            throw new ForbiddenException("Admin permission required");
        }
        return user;
    }
}
