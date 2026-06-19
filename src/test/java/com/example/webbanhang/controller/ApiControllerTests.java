package com.example.webbanhang.controller;

import com.example.webbanhang.common.JsonHelper;
import com.example.webbanhang.dto.Requests.*;
import com.example.webbanhang.security.TokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashMap;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.seed.enabled=true")
@AutoConfigureMockMvc
@Transactional
public class ApiControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TokenService tokenService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // 1. Đăng ký tài khoản thành công
    @Test
    void registerSuccess() throws Exception {
        RegisterRequest request = new RegisterRequest(
                "newuser",
                "newuser@shop.local",
                "Password123",
                "New User",
                "0987654321",
                "Hanoi"
        );

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data.token").exists());
    }

    // 2. Đăng ký tài khoản thất bại (trùng username/email)
    @Test
    void registerFailDuplicate() throws Exception {
        RegisterRequest request = new RegisterRequest(
                "admin", // duplicate username
                "admin@shop.local",
                "Password123",
                "Admin Copy",
                "0987654321",
                "Hanoi"
        );

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("error"));
    }

    // 3. Đăng nhập thành công và nhận JWT
    @Test
    void loginSuccess() throws Exception {
        LoginRequest request = new LoginRequest("customer", "customer123");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data.token").exists())
                .andExpect(jsonPath("$.data.refreshToken").exists());
    }

    // 4. Lấy danh sách sản phẩm có bộ lọc và phân trang
    @Test
    void getProductsFilteredAndPaged() throws Exception {
        mockMvc.perform(get("/api/products")
                .param("search", "Phone")
                .param("page", "0")
                .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data").isArray());
    }

    // 5. Thêm sản phẩm vào giỏ hàng
    @Test
    void addToCart() throws Exception {
        String token = tokenService.createToken(2L, "customer", "CUSTOMER");
        CartRequest request = new CartRequest(1L, 2);

        mockMvc.perform(post("/api/cart/add")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data.items").isArray());
    }

    // 6. Áp dụng Coupon hợp lệ / không hợp lệ
    @Test
    void applyCoupon() throws Exception {
        String token = tokenService.createToken(2L, "customer", "CUSTOMER");
        
        // Nhận coupon vào ví trước
        mockMvc.perform(post("/api/auth/vouchers/collect/1")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // Thêm vào giỏ
        CartRequest cartReq = new CartRequest(1L, 1);
        mockMvc.perform(post("/api/cart/add")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(cartReq)))
                .andExpect(status().isOk());

        // Áp mã giảm giá
        Map<String, String> couponReq = new HashMap<>();
        couponReq.put("code", "WELCOME10");

        mockMvc.perform(post("/api/coupons/apply")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(couponReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data.discount").exists());
    }

    // 7. Đặt hàng thành công (trừ tồn kho)
    @Test
    void checkoutSuccess() throws Exception {
        String token = tokenService.createToken(2L, "customer", "CUSTOMER");

        // Thêm sản phẩm vào giỏ
        CartRequest cartReq = new CartRequest(2L, 1);
        mockMvc.perform(post("/api/cart/add")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(cartReq)))
                .andExpect(status().isOk());

        // Đặt hàng
        CheckoutRequest checkoutReq = new CheckoutRequest(
                "",
                "Receiver Name",
                "Receiver Address",
                "0987654321",
                "Test Note"
        );

        mockMvc.perform(post("/api/orders")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(checkoutReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    // 8. Truy cập API Admin bị từ chối do không đủ quyền (403 Forbidden)
    @Test
    void adminAccessForbidden() throws Exception {
        String token = tokenService.createToken(2L, "customer", "CUSTOMER");

        mockMvc.perform(get("/api/admin/dashboard")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }
}
