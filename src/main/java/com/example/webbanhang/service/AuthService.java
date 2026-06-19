package com.example.webbanhang.service;

import com.example.webbanhang.domain.PasswordReset;
import com.example.webbanhang.domain.RefreshToken;
import com.example.webbanhang.domain.User;
import com.example.webbanhang.dto.Requests.LoginRequest;
import com.example.webbanhang.dto.Requests.ProfileRequest;
import com.example.webbanhang.dto.Requests.RegisterRequest;
import com.example.webbanhang.exception.BadRequestException;
import com.example.webbanhang.exception.ResourceNotFoundException;
import com.example.webbanhang.repository.PasswordResetRepository;
import com.example.webbanhang.repository.RefreshTokenRepository;
import com.example.webbanhang.repository.UserRepository;
import com.example.webbanhang.security.PasswordService;
import com.example.webbanhang.security.TokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetRepository passwordResetRepository;
    private final PasswordService passwordService;
    private final TokenService tokenService;
    private final String googleClientId;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordResetRepository passwordResetRepository,
                       PasswordService passwordService,
                       TokenService tokenService,
                       @Value("${app.google.client-id}") String googleClientId) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetRepository = passwordResetRepository;
        this.passwordService = passwordService;
        this.tokenService = tokenService;
        this.googleClientId = googleClientId;
    }

    @Transactional
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

        if (userRepository.findByUsername(request.username().trim()).isPresent()) {
            throw new BadRequestException("Tên đăng nhập đã tồn tại");
        }
        if (userRepository.findByEmail(request.email().trim()).isPresent()) {
            throw new BadRequestException("Email đã tồn tại");
        }

        User u = User.builder()
                .username(request.username().trim())
                .email(request.email().trim())
                .passwordHash(passwordService.hash(request.password()))
                .role("CUSTOMER")
                .fullName(request.fullName())
                .phone(blankToNull(request.phone()))
                .address(request.address())
                .avatarUrl(defaultAvatar(request.username()))
                .status("ACTIVE")
                .build();
        u = userRepository.save(u);

        return login(new LoginRequest(request.username(), request.password()));
    }

    @Transactional
    public Map<String, Object> login(LoginRequest request) {
        requireText(request.usernameOrEmail(), "Username or email is required");
        requireText(request.password(), "Password is required");

        User u = userRepository.findByUsernameOrEmail(request.usernameOrEmail(), request.usernameOrEmail())
                .orElseThrow(() -> new BadRequestException("Tên đăng nhập/email hoặc mật khẩu không đúng"));

        if ("BANNED".equals(u.getStatus())) {
            if (u.getBanUntil() != null && u.getBanUntil().isAfter(LocalDateTime.now())) {
                throw new BadRequestException("Tài khoản của bạn đang bị khóa cho đến " + u.getBanUntil());
            } else if (u.getBanUntil() != null) {
                // Hết hạn ban -> tự động kích hoạt lại
                u.setStatus("ACTIVE");
                u.setBanUntil(null);
                userRepository.save(u);
            } else {
                throw new BadRequestException("Tài khoản của bạn đã bị khóa vĩnh viễn");
            }
        }

        if (!passwordService.matches(request.password(), u.getPasswordHash())) {
            throw new BadRequestException("Tên đăng nhập/email hoặc mật khẩu không đúng");
        }

        String accessToken = tokenService.createToken(u.getId(), u.getUsername(), u.getRole());
        RefreshToken refreshToken = createRefreshToken(u);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("token", accessToken);
        response.put("refreshToken", refreshToken.getToken());
        response.put("user", sanitizeUser(mapUser(u)));
        return response;
    }

    @Transactional
    public Map<String, Object> loginWithGoogle(String credential) {
        requireText(credential, "Credential token is required");

        RestTemplate restTemplate = new RestTemplate();
        String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + credential;
        Map<?, ?> tokenInfo;
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

        User u = userRepository.findByEmail(email).orElse(null);

        if (u == null) {
            String username = email.split("@")[0];
            int attempt = 0;
            String uniqueUsername = username;
            while (true) {
                if (userRepository.findByUsername(uniqueUsername).isEmpty()) {
                    break;
                }
                attempt++;
                uniqueUsername = username + attempt;
            }

            String randomPassword = UUID.randomUUID().toString();
            u = User.builder()
                    .username(uniqueUsername)
                    .email(email)
                    .passwordHash(passwordService.hash(randomPassword))
                    .role("CUSTOMER")
                    .fullName(name)
                    .avatarUrl(picture)
                    .status("ACTIVE")
                    .build();
            u = userRepository.save(u);
        }

        String accessToken = tokenService.createToken(u.getId(), u.getUsername(), u.getRole());
        RefreshToken refreshToken = createRefreshToken(u);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("token", accessToken);
        res.put("refreshToken", refreshToken.getToken());
        res.put("user", sanitizeUser(mapUser(u)));
        return res;
    }

    public Map<String, Object> profile(long userId) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return sanitizeUser(mapUser(u));
    }

    @Transactional
    public void changePassword(long userId, com.example.webbanhang.dto.Requests.ChangePasswordRequest request) {
        validatePasswordComplexity(request.newPassword());
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!passwordService.matches(request.currentPassword(), u.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu hiện tại không đúng");
        }
        u.setPasswordHash(passwordService.hash(request.newPassword()));
        userRepository.save(u);
    }

    @Transactional
    public Map<String, Object> updateProfile(long userId, ProfileRequest request) {
        requireText(request.email(), "Email is required");
        requireText(request.fullName(), "Full name is required");
        if (!request.email().trim().matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            throw new BadRequestException("Địa chỉ email không đúng định dạng");
        }
        if (request.phone() != null && !request.phone().isBlank()) {
            validatePhoneNumber(request.phone());
        }
        
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Optional<User> emailOwner = userRepository.findByEmail(request.email().trim());
        if (emailOwner.isPresent() && !emailOwner.get().getId().equals(userId)) {
            throw new BadRequestException("Email đã được sử dụng bởi tài khoản khác");
        }

        u.setEmail(request.email().trim());
        u.setFullName(request.fullName().trim());
        u.setPhone(blankToNull(request.phone()));
        u.setAddress(blankToNull(request.address()));
        u.setAvatarUrl(blankToNull(request.avatarUrl()));
        
        u = userRepository.save(u);
        return sanitizeUser(mapUser(u));
    }

    @Transactional
    public String sendForgotPasswordOtp(String email) {
        requireText(email, "Email is required");
        userRepository.findByEmail(email.trim())
                .orElseThrow(() -> new BadRequestException("Email không tồn tại trên hệ thống"));

        String otp = String.format("%06d", new Random().nextInt(1000000));
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(1);

        PasswordReset reset = PasswordReset.builder()
                .email(email.trim())
                .otpCode(otp)
                .expiryTime(expiry)
                .build();
        passwordResetRepository.save(reset);

        System.out.println("\n==================================================");
        System.out.println("OTP CODE FOR RESETTING PASSWORD (" + email.trim() + "): " + otp);
        System.out.println("==================================================\n");
        return otp;
    }

    @Transactional
    public void resetPassword(String email, String otp, String newPassword) {
        requireText(email, "Email is required");
        requireText(otp, "OTP code is required");
        requireText(newPassword, "New password is required");
        validatePasswordComplexity(newPassword);

        PasswordReset reset = passwordResetRepository.findById(email.trim())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy yêu cầu đặt lại mật khẩu hoặc OTP đã hết hạn"));

        if (!reset.getOtpCode().equals(otp.trim())) {
            throw new BadRequestException("Mã OTP không chính xác");
        }

        if (reset.getExpiryTime().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Mã OTP đã hết hạn");
        }

        User u = userRepository.findByEmail(email.trim())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        u.setPasswordHash(passwordService.hash(newPassword));
        userRepository.save(u);

        passwordResetRepository.delete(reset);
    }

    @Transactional
    public RefreshToken createRefreshToken(User user) {
        refreshTokenRepository.deleteByUser(user);
        RefreshToken token = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiryDate(Instant.now().plus(7, java.time.temporal.ChronoUnit.DAYS))
                .build();
        return refreshTokenRepository.save(token);
    }

    @Transactional
    public Map<String, Object> refresh(String token) {
        RefreshToken rt = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new BadRequestException("Refresh token is not in database!"));

        if (rt.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepository.delete(rt);
            throw new BadRequestException("Refresh token was expired. Please make a new login request");
        }

        User u = rt.getUser();
        String accessToken = tokenService.createToken(u.getId(), u.getUsername(), u.getRole());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("token", accessToken);
        response.put("refreshToken", rt.getToken());
        response.put("user", sanitizeUser(mapUser(u)));
        return response;
    }

    @Transactional
    public void logout(long userId) {
        userRepository.findById(userId).ifPresent(refreshTokenRepository::deleteByUser);
    }

    private Map<String, Object> mapUser(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("username", u.getUsername());
        m.put("email", u.getEmail());
        m.put("password_hash", u.getPasswordHash());
        m.put("role", u.getRole());
        m.put("fullName", u.getFullName());
        m.put("phone", u.getPhone());
        m.put("address", u.getAddress());
        m.put("avatarUrl", u.getAvatarUrl());
        return m;
    }

    private Map<String, Object> sanitizeUser(Map<String, Object> user) {
        if (user == null || user.isEmpty()) {
            throw new ResourceNotFoundException("User not found");
        }
        Map<String, Object> clean = new LinkedHashMap<>(user);
        clean.remove("password_hash");
        return clean;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String defaultAvatar(String username) {
        String seed = username == null || username.isBlank() ? "customer" : username.trim();
        return "https://api.dicebear.com/8.x/initials/svg?seed=" + URLEncoder.encode(seed, StandardCharsets.UTF_8);
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
