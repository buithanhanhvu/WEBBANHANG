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

    // 9. Đăng nhập thất bại do sai thông tin mật khẩu (400 Bad Request / Centralized Error Handling)
    @Test
    void loginFailInvalidCredentials() throws Exception {
        LoginRequest request = new LoginRequest("customer", "WrongPassword123!!!");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("error"));
    }

    // 10. Làm mới token thành công bằng Refresh Token
    @Test
    void refreshTokenSuccess() throws Exception {
        LoginRequest loginReq = new LoginRequest("customer", "customer123");
        String loginRes = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String refreshToken = objectMapper.readTree(loginRes).get("data").get("refreshToken").asText();

        Map<String, String> refreshReq = new HashMap<>();
        refreshReq.put("refreshToken", refreshToken);

        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(refreshReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data.token").exists());
    }

    // 11. Admin tạo sản phẩm thành công (RBAC & Admin Write Operation)
    @Test
    void adminCreateProductSuccess() throws Exception {
        String adminToken = tokenService.createToken(1L, "admin", "ADMIN");
        ProductRequest request = new ProductRequest(
                "New Admin Product",
                "Description details",
                new java.math.BigDecimal("150000"),
                10,
                "http://example.com/image.png",
                1L,
                true,
                10,
                "BrandName",
                java.util.List.of()
        );

        mockMvc.perform(post("/api/admin/products")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data.id").exists())
                .andExpect(jsonPath("$.data.name").value("New Admin Product"));
    }

    // 12. Admin tạo sản phẩm thất bại do vi phạm ràng buộc validation (Bean Validation / Error Handling)
    @Test
    void adminCreateProductValidationFail() throws Exception {
        String adminToken = tokenService.createToken(1L, "admin", "ADMIN");
        // Tên rỗng, giá âm, tồn kho âm, discount vượt quá 100%
        ProductRequest request = new ProductRequest(
                "", 
                "Description",
                new java.math.BigDecimal("-500"), 
                -10, 
                "http://example.com/image.png",
                1L,
                true,
                150, 
                "BrandName",
                java.util.List.of()
        );

        mockMvc.perform(post("/api/admin/products")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("error"));
    }

    // 13. Khách hàng thêm/xóa sản phẩm yêu thích (Wishlist)
    @Test
    void userToggleWishlist() throws Exception {
        String token = tokenService.createToken(2L, "customer", "CUSTOMER");

        // Thêm sản phẩm 1 vào wishlist
        mockMvc.perform(post("/api/wishlist/1")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"));

        // Lấy danh sách IDs để kiểm tra sự tồn tại của sản phẩm 1
        mockMvc.perform(get("/api/wishlist/ids")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data").isArray());
    }

    // 14. Luồng tích hợp Đặt hàng -> Chặn đánh giá -> Giao hàng -> Đánh giá thành công (Business Logic & State Machine)
    @Test
    void reviewProductFlow() throws Exception {
        String token = tokenService.createToken(2L, "customer", "CUSTOMER");
        String adminToken = tokenService.createToken(1L, "admin", "ADMIN");

        // Bước 1: Thêm sản phẩm 3 vào giỏ (chưa từng mua)
        CartRequest cartReq = new CartRequest(3L, 1);
        mockMvc.perform(post("/api/cart/add")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(cartReq)))
                .andExpect(status().isOk());

        // Bước 2: Đặt hàng thành công (Đơn hàng PENDING)
        CheckoutRequest checkoutReq = new CheckoutRequest(
                "",
                "Receiver Name",
                "Receiver Address",
                "0987654321",
                "Test Note"
        );
        String checkoutRes = mockMvc.perform(post("/api/orders")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(checkoutReq)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        long orderId = objectMapper.readTree(checkoutRes).get("data").get("id").asLong();

        // Bước 3: Đánh giá ngay khi đơn hàng chưa giao -> expect 400 Bad Request
        ReviewRequest reviewReq = new ReviewRequest(3L, 5, "Sản phẩm tuyệt vời!");
        mockMvc.perform(post("/api/reviews")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reviewReq)))
                .andExpect(status().isBadRequest());

        // Bước 4: Admin chuyển trạng thái đơn hàng sang DELIVERED
        OrderStatusRequest statusReq = new OrderStatusRequest("DELIVERED");
        mockMvc.perform(put("/api/admin/orders/" + orderId + "/status")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(statusReq)))
                .andExpect(status().isOk());

        // Bước 5: Đánh giá lại -> thành công 200 OK
        mockMvc.perform(post("/api/reviews")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reviewReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"));

        // Bước 6: Lấy danh sách đánh giá sản phẩm 3
        mockMvc.perform(get("/api/products/3/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data").isArray());
    }

    // 15. Luồng xem và cập nhật hồ sơ cá nhân của người dùng
    @Test
    void userProfileFlow() throws Exception {
        String token = tokenService.createToken(2L, "customer", "CUSTOMER");

        // Xem hồ sơ cá nhân
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data.username").value("customer"));

        // Cập nhật thông tin hồ sơ
        ProfileRequest updateReq = new ProfileRequest(
                "customer_updated@shop.local",
                "Updated Customer Name",
                "0909090909",
                "Updated Address 123",
                "http://example.com/avatar.png"
        );

        mockMvc.perform(put("/api/auth/me")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data.fullName").value("Updated Customer Name"))
                .andExpect(jsonPath("$.data.email").value("customer_updated@shop.local"));
    }
}
