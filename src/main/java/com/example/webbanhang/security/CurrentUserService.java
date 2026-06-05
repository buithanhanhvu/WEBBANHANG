package com.example.webbanhang.security;

import com.example.webbanhang.exception.ForbiddenException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {
    private final TokenService tokenService;

    public CurrentUserService(TokenService tokenService) {
        this.tokenService = tokenService;
    }

    public TokenService.AuthUser requireUser(HttpServletRequest request) {
        return tokenService.parseBearer(request.getHeader("Authorization"));
    }

    public TokenService.AuthUser requireAdmin(HttpServletRequest request) {
        TokenService.AuthUser user = requireUser(request);
        if (!"ADMIN".equals(user.role())) {
            throw new ForbiddenException("Admin permission required");
        }
        return user;
    }
}
