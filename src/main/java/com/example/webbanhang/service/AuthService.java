package com.example.webbanhang.service;

import com.example.webbanhang.dto.Requests.LoginRequest;
import com.example.webbanhang.dto.Requests.ProfileRequest;
import com.example.webbanhang.dto.Requests.RegisterRequest;
import com.example.webbanhang.exception.BadRequestException;
import com.example.webbanhang.exception.ResourceNotFoundException;
import com.example.webbanhang.security.PasswordService;
import com.example.webbanhang.security.TokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {
    private final JdbcTemplate jdbc;
    private final PasswordService passwordService;
    private final TokenService tokenService;
    private final String googleClientId;

    public AuthService(JdbcTemplate jdbc, PasswordService passwordService, TokenService tokenService,
                       @Value("${app.google.client-id}") String googleClientId) {
        this.jdbc = jdbc;
        this.passwordService = passwordService;
        this.tokenService = tokenService;
        this.googleClientId = googleClientId;
    }


    public Map<String, Object> register(RegisterRequest request) {
        requireText(request.username(), "Username is required");
        requireText(request.email(), "Email is required");
        requireText(request.password(), "Password is required");

        if (request.username().trim().length() < 3) {
            throw new BadRequestException("Tên đăng nhập phải có ít nhất 3 ký tự");
        }
        if (!request.email().trim().matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            throw new BadRequestException("Địa chỉ email không đúng định dạng");
        }
        validatePasswordComplexity(request.password());
        if (request.phone() != null && !request.phone().isBlank()) {
            validatePhoneNumber(request.phone());
        }

        try {
            jdbc.update("""
                            INSERT INTO users(username,email,password_hash,role,full_name,phone,address,avatar_url)
                            VALUES(?,?,?,?,?,?,?,?)
                            """,
                    request.username().trim(), request.email().trim(), passwordService.hash(request.password()), "CUSTOMER",
                    request.fullName(), blankToNull(request.phone()), request.address(), defaultAvatar(request.username()));
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

    public Map<String, Object> loginWithGoogle(String credential) {
        requireText(credential, "Credential token is required");

        RestTemplate restTemplate = new RestTemplate();
        String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + credential;
        Map<String, Object> tokenInfo;
        try {
            tokenInfo = restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            throw new BadRequestException("Xác thực tài khoản Google thất bại: Token không hợp lệ");
        }

        if (tokenInfo == null) {
            throw new BadRequestException("Không nhận được phản hồi từ Google");
        }

        String aud = String.valueOf(tokenInfo.get("aud"));
        if (!googleClientId.equals(aud)) {
            throw new BadRequestException("Xác thực tài khoản Google thất bại: Client ID không khớp");
        }

        String email = String.valueOf(tokenInfo.get("email"));
        String name = String.valueOf(tokenInfo.get("name"));
        String picture = String.valueOf(tokenInfo.get("picture"));

        java.util.List<Map<String, Object>> list = jdbc.queryForList("SELECT * FROM users WHERE email = ?", email);
        Map<String, Object> user = list.isEmpty() ? null : list.get(0);

        if (user == null) {
            String username = email.split("@")[0];
            int attempt = 0;
            String uniqueUsername = username;
            while (true) {
                Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE username = ?", Integer.class, uniqueUsername);
                if (count == null || count == 0) {
                    break;
                }
                attempt++;
                uniqueUsername = username + attempt;
            }

            String randomPassword = UUID.randomUUID().toString();
            jdbc.update("""
                INSERT INTO users(username, email, password_hash, role, full_name, avatar_url)
                VALUES(?, ?, ?, ?, ?, ?)
                """,
                uniqueUsername, email, passwordService.hash(randomPassword), "CUSTOMER", name, picture);

            list = jdbc.queryForList("SELECT * FROM users WHERE email = ?", email);
            user = list.isEmpty() ? null : list.get(0);
        }

        String token = tokenService.createToken(
            ((Number) user.get("id")).longValue(),
            String.valueOf(user.get("username")),
            String.valueOf(user.get("role"))
        );

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("token", token);
        res.put("user", sanitizeUser(user));
        return res;
    }

    public Map<String, Object> profile(long userId) {
        return sanitizeUser(jdbc.queryForMap("SELECT * FROM users WHERE id=?", userId));
    }

    public void changePassword(long userId, com.example.webbanhang.dto.Requests.ChangePasswordRequest request) {
        validatePasswordComplexity(request.newPassword());
        Map<String, Object> user = jdbc.queryForMap("SELECT * FROM users WHERE id=?", userId);
        if (!passwordService.matches(request.currentPassword(), String.valueOf(user.get("password_hash")))) {
            throw new BadRequestException("Mật khẩu hiện tại không đúng");
        }
        jdbc.update("UPDATE users SET password_hash=? WHERE id=?",
            passwordService.hash(request.newPassword()), userId);
    }

    public Map<String, Object> updateProfile(long userId, ProfileRequest request) {
        requireText(request.email(), "Email is required");
        requireText(request.fullName(), "Full name is required");
        if (!request.email().trim().matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            throw new BadRequestException("Địa chỉ email không đúng định dạng");
        }
        if (request.phone() != null && !request.phone().isBlank()) {
            validatePhoneNumber(request.phone());
        }
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

    public String sendForgotPasswordOtp(String email) {
        requireText(email, "Email is required");
        Integer exists = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE email=?", Integer.class, email.trim());
        if (exists == null || exists == 0) {
            throw new BadRequestException("Email không tồn tại trên hệ thống");
        }

        String otp = String.format("%06d", new java.util.Random().nextInt(1000000));
        java.time.LocalDateTime expiry = java.time.LocalDateTime.now().plusMinutes(1);

        jdbc.update("""
                INSERT INTO password_resets(email, otp_code, expiry_time)
                VALUES(?, ?, ?)
                ON DUPLICATE KEY UPDATE otp_code=VALUES(otp_code), expiry_time=VALUES(expiry_time)
                """, email.trim(), otp, expiry);

        System.out.println("\n==================================================");
        System.out.println("OTP CODE FOR RESETTING PASSWORD (" + email.trim() + "): " + otp);
        System.out.println("==================================================\n");
        return otp;
    }

    public void resetPassword(String email, String otp, String newPassword) {
        requireText(email, "Email is required");
        requireText(otp, "OTP code is required");
        requireText(newPassword, "New password is required");
        validatePasswordComplexity(newPassword);

        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM password_resets WHERE email=?", email.trim());
        if (rows.isEmpty()) {
            throw new BadRequestException("Không tìm thấy yêu cầu đặt lại mật khẩu hoặc OTP đã hết hạn");
        }

        Map<String, Object> reset = rows.get(0);
        String dbOtp = String.valueOf(reset.get("otp_code"));
        java.sql.Timestamp expiry = (java.sql.Timestamp) reset.get("expiry_time");

        if (!dbOtp.equals(otp.trim())) {
            throw new BadRequestException("Mã OTP không chính xác");
        }

        if (expiry.before(new java.util.Date())) {
            throw new BadRequestException("Mã OTP đã hết hạn");
        }

        jdbc.update("UPDATE users SET password_hash=? WHERE email=?",
                passwordService.hash(newPassword), email.trim());

        jdbc.update("DELETE FROM password_resets WHERE email=?", email.trim());
    }

    private void validatePasswordComplexity(String password) {
        if (password == null || password.length() < 6) {
            throw new BadRequestException("Mật khẩu phải có ít nhất 6 ký tự");
        }
        if (!password.matches(".*[a-zA-Z].*") || !password.matches(".*\\d.*")) {
            throw new BadRequestException("Mật khẩu phải chứa cả chữ cái và chữ số");
        }
    }

    private void validatePhoneNumber(String phone) {
        String cleaned = phone.replaceAll("\\s+", "");
        if (!cleaned.matches("^\\d{9,11}$")) {
            throw new BadRequestException("Số điện thoại không hợp lệ (phải gồm 9 đến 11 chữ số)");
        }
    }

    private void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(message);
        }
    }
}
