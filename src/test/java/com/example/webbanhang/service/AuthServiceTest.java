package com.example.webbanhang.service;

import com.example.webbanhang.domain.RefreshToken;
import com.example.webbanhang.domain.User;
import com.example.webbanhang.dto.Requests.LoginRequest;
import com.example.webbanhang.dto.Requests.RegisterRequest;
import com.example.webbanhang.exception.BadRequestException;
import com.example.webbanhang.repository.PasswordResetRepository;
import com.example.webbanhang.repository.RefreshTokenRepository;
import com.example.webbanhang.repository.UserRepository;
import com.example.webbanhang.security.PasswordService;
import com.example.webbanhang.security.TokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordResetRepository passwordResetRepository;

    @Mock
    private PasswordService passwordService;

    @Mock
    private TokenService tokenService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                refreshTokenRepository,
                passwordResetRepository,
                passwordService,
                tokenService,
                "dummy-google-client-id"
        );
    }

    // 1. Test đăng ký thành công
    @Test
    void register_Success() {
        RegisterRequest req = new RegisterRequest(
                "newuser",
                "newuser@example.com",
                "Password123",
                "New User",
                "0912345678",
                "Hanoi"
        );

        when(userRepository.findByUsername("newuser")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("newuser@example.com")).thenReturn(Optional.empty());
        when(passwordService.hash(anyString())).thenReturn("hashedPassword123");

        User savedUser = User.builder()
                .id(10L)
                .username("newuser")
                .email("newuser@example.com")
                .passwordHash("hashedPassword123")
                .role("CUSTOMER")
                .status("ACTIVE")
                .build();

        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(userRepository.findByUsernameOrEmail("newuser", "newuser")).thenReturn(Optional.of(savedUser));
        when(passwordService.matches("Password123", "hashedPassword123")).thenReturn(true);
        when(tokenService.createToken(10L, "newuser", "CUSTOMER")).thenReturn("mock-jwt-token");
        
        RefreshToken mockRefreshToken = RefreshToken.builder()
                .id(1L)
                .user(savedUser)
                .token("mock-refresh-token")
                .expiryDate(Instant.now().plusSeconds(3600))
                .build();
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenReturn(mockRefreshToken);

        Map<String, Object> response = authService.register(req);

        assertNotNull(response);
        assertEquals("mock-jwt-token", response.get("token"));
        assertEquals("mock-refresh-token", response.get("refreshToken"));
        verify(userRepository, times(1)).save(any(User.class));
    }

    // 2. Test đăng ký thất bại do trùng tên username
    @Test
    void register_Fail_DuplicateUsername() {
        RegisterRequest req = new RegisterRequest(
                "existinguser",
                "email@example.com",
                "Password123",
                "Full Name",
                "0912345678",
                "Address"
        );

        User existingUser = User.builder().id(1L).username("existinguser").build();
        when(userRepository.findByUsername("existinguser")).thenReturn(Optional.of(existingUser));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.register(req));
        assertTrue(ex.getMessage().contains("Tên đăng nhập đã tồn tại"));
        verify(userRepository, never()).save(any());
    }

    // 3. Test đăng nhập thành công
    @Test
    void login_Success() {
        LoginRequest req = new LoginRequest("customer", "customer123");
        User user = User.builder()
                .id(2L)
                .username("customer")
                .email("customer@example.com")
                .passwordHash("hashedPass")
                .role("CUSTOMER")
                .status("ACTIVE")
                .build();

        when(userRepository.findByUsernameOrEmail("customer", "customer")).thenReturn(Optional.of(user));
        when(passwordService.matches("customer123", "hashedPass")).thenReturn(true);
        when(tokenService.createToken(2L, "customer", "CUSTOMER")).thenReturn("jwt-token-123");

        RefreshToken mockRefreshToken = RefreshToken.builder()
                .id(2L)
                .user(user)
                .token("refresh-token-123")
                .expiryDate(Instant.now().plusSeconds(3600))
                .build();
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenReturn(mockRefreshToken);

        Map<String, Object> result = authService.login(req);

        assertNotNull(result);
        assertEquals("jwt-token-123", result.get("token"));
        assertEquals("refresh-token-123", result.get("refreshToken"));
    }

    // 4. Test đăng nhập thất bại do tài khoản bị khóa (BANNED)
    @Test
    void login_Fail_BannedUser() {
        LoginRequest req = new LoginRequest("banned_user", "pass123");
        User bannedUser = User.builder()
                .id(3L)
                .username("banned_user")
                .status("BANNED")
                .build();

        when(userRepository.findByUsernameOrEmail("banned_user", "banned_user")).thenReturn(Optional.of(bannedUser));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.login(req));
        assertTrue(ex.getMessage().contains("bị khóa"));
    }
}
