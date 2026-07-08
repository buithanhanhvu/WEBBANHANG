package com.example.webbanhang.controller;

import com.example.webbanhang.dto.Requests.*;
import com.example.webbanhang.security.TokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
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

    // =========================================================================
    // I. CÁC TRƯỜNG HỢP KIỂM THỬ THÀNH CÔNG (7 SUCCESS CASES)
    // =========================================================================

    // 1. Đăng ký tài khoản thành công
    @Test
    void registerSuccess() throws Exception {
        RegisterRequest request = new RegisterRequest(
                "newuser_junit",
                "newuser_junit@shop.local",
                "Password123",
                "New User JUnit",
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

    // 2. Đăng nhập thành công và nhận JWT
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

    // 3. Xem thông tin chi tiết một sản phẩm (Công khai)
    @Test
    void getProductDetail() throws Exception {
        mockMvc.perform(get("/api/products/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data.id").value(1));
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

    // 5. Thêm sản phẩm vào giỏ hàng (Yêu cầu Token)
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

    // 6. Áp dụng Coupon hợp lệ
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

    // 8. Admin đăng nhập và thêm mới sản phẩm thành công
    @Test
    void adminAddProductSuccess() throws Exception {
        String adminToken = tokenService.createToken(1L, "admin", "ADMIN");
        ProductRequest request = new ProductRequest(
                "New Test Product Junit",
                "Description test",
                new java.math.BigDecimal("120000"),
                20,
                "image_junit.png",
                1L,
                true,
                0,
                "JUnitBrand",
                java.util.List.of()
        );

        mockMvc.perform(post("/api/admin/products")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data.id").exists());
    }

    // =========================================================================
    // II. CÁC TRƯỜNG HỢP KIỂM THỬ THẤT BẠI/LỖI (5 FAILURE CASES)
    // =========================================================================

    // 9. Đăng ký tài khoản thất bại (trùng username/email)
    @Test
    void registerFailDuplicate() throws Exception {
        RegisterRequest request = new RegisterRequest(
                "admin", // trùng username đã có sẵn
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

    // 10. Đăng nhập thất bại (sai mật khẩu)
    @Test
    void loginFailWrongPassword() throws Exception {
        LoginRequest request = new LoginRequest("customer", "WrongPassword123");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("error"));
    }

    // 11. Thêm giỏ hàng thất bại khi chưa đăng nhập (Thiếu Token)
    @Test
    void addToCartUnauthenticated() throws Exception {
        CartRequest request = new CartRequest(1L, 1);

        mockMvc.perform(post("/api/cart/add")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    // 12. Truy cập API Admin bị từ chối do không đủ quyền (403 Forbidden)
    @Test
    void adminAccessForbidden() throws Exception {
        String token = tokenService.createToken(2L, "customer", "CUSTOMER");

        mockMvc.perform(get("/api/admin/dashboard")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // 13. Đánh giá sản phẩm thất bại do chưa mua hàng (Ràng buộc logic)
    @Test
    void reviewFailUnpurchased() throws Exception {
        String token = tokenService.createToken(2L, "customer", "CUSTOMER");
        ReviewRequest request = new ReviewRequest(3L, 5, "Sản phẩm tốt nhưng tôi chưa mua!");

        mockMvc.perform(post("/api/reviews")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("error"));
    }
}
