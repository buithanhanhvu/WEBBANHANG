package com.example.webbanhang.service;

import com.example.webbanhang.dto.Requests.LoginRequest;
import com.example.webbanhang.dto.Requests.ProfileRequest;
import com.example.webbanhang.dto.Requests.RegisterRequest;
import com.example.webbanhang.exception.BadRequestException;
import com.example.webbanhang.exception.ResourceNotFoundException;
import com.example.webbanhang.security.PasswordService;
import com.example.webbanhang.security.TokenService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AuthService {
    private final JdbcTemplate jdbc;
    private final PasswordService passwordService;
    private final TokenService tokenService;

    public AuthService(JdbcTemplate jdbc, PasswordService passwordService, TokenService tokenService) {
        this.jdbc = jdbc;
        this.passwordService = passwordService;
        this.tokenService = tokenService;
    }

    public Map<String, Object> register(RegisterRequest request) {
        requireText(request.username(), "Username is required");
        requireText(request.email(), "Email is required");
        requireText(request.password(), "Password is required");
        try {
            jdbc.update("""
                            INSERT INTO users(username,email,password_hash,role,full_name,phone,address,avatar_url)
                            VALUES(?,?,?,?,?,?,?,?)
                            """,
                    request.username(), request.email(), passwordService.hash(request.password()), "CUSTOMER",
                    request.fullName(), request.phone(), request.address(), defaultAvatar(request.username()));
        } catch (DuplicateKeyException ex) {
            throw new BadRequestException("Username or email already exists");
        }
        return login(new LoginRequest(request.username(), request.password()));
    }

    public Map<String, Object> login(LoginRequest request) {
        requireText(request.usernameOrEmail(), "Username or email is required");
        requireText(request.password(), "Password is required");
        Map<String, Object> user = findUser(request.usernameOrEmail());
        if (!passwordService.matches(request.password(), String.valueOf(user.get("password_hash")))) {
            throw new BadRequestException("Invalid username/email or password");
        }
        String token = tokenService.createToken(((Number) user.get("id")).longValue(), String.valueOf(user.get("username")), String.valueOf(user.get("role")));
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("token", token);
        response.put("user", sanitizeUser(user));
        return response;
    }

    public Map<String, Object> profile(long userId) {
        return sanitizeUser(jdbc.queryForMap("SELECT * FROM users WHERE id=?", userId));
    }

    public Map<String, Object> updateProfile(long userId, ProfileRequest request) {
        requireText(request.email(), "Email is required");
        requireText(request.fullName(), "Full name is required");
        try {
            jdbc.update("""
                            UPDATE users
                            SET email=?, full_name=?, phone=?, address=?, avatar_url=?
                            WHERE id=?
                            """,
                    request.email().trim(),
                    request.fullName().trim(),
                    blankToNull(request.phone()),
                    blankToNull(request.address()),
                    blankToNull(request.avatarUrl()),
                    userId);
        } catch (DuplicateKeyException ex) {
            throw new BadRequestException("Email already exists");
        }
        return profile(userId);
    }

    private Map<String, Object> findUser(String usernameOrEmail) {
        return jdbc.query("SELECT * FROM users WHERE username=? OR email=?",
                rs -> {
                    if (!rs.next()) {
                        throw new BadRequestException("Invalid username/email or password");
                    }
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", rs.getLong("id"));
                    row.put("username", rs.getString("username"));
                    row.put("email", rs.getString("email"));
                    row.put("password_hash", rs.getString("password_hash"));
                    row.put("role", rs.getString("role"));
                    row.put("fullName", rs.getString("full_name"));
                    row.put("phone", rs.getString("phone"));
                    row.put("address", rs.getString("address"));
                    row.put("avatarUrl", rs.getString("avatar_url"));
                    return row;
                }, usernameOrEmail, usernameOrEmail);
    }

    private Map<String, Object> sanitizeUser(Map<String, Object> user) {
        if (user == null || user.isEmpty()) {
            throw new ResourceNotFoundException("User not found");
        }
        Map<String, Object> clean = new LinkedHashMap<>(user);
        clean.remove("password_hash");
        clean.remove("passwordHash");
        clean.put("fullName", firstPresent(user, "fullName", "full_name"));
        clean.put("avatarUrl", firstPresent(user, "avatarUrl", "avatar_url"));
        clean.remove("full_name");
        clean.remove("avatar_url");
        return clean;
    }

    private Object firstPresent(Map<String, Object> user, String camel, String snake) {
        Object value = user.get(camel);
        return value != null ? value : user.get(snake);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String defaultAvatar(String username) {
        String seed = username == null || username.isBlank() ? "customer" : username.trim();
        return "https://api.dicebear.com/8.x/initials/svg?seed=" + URLEncoder.encode(seed, StandardCharsets.UTF_8);
    }

    private void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(message);
        }
    }
}
