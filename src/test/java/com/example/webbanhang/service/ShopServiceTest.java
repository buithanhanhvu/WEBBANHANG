package com.example.webbanhang.service;

import com.example.webbanhang.domain.CartItem;
import com.example.webbanhang.domain.Product;
import com.example.webbanhang.domain.User;
import com.example.webbanhang.dto.Requests.CartRequest;
import com.example.webbanhang.exception.BadRequestException;
import com.example.webbanhang.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ShopServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private CouponRepository couponRepository;
    @Mock
    private UserCouponRepository userCouponRepository;
    @Mock
    private CartItemRepository cartItemRepository;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private OrderItemRepository orderItemRepository;
    @Mock
    private ReviewRepository reviewRepository;
    @Mock
    private WishlistRepository wishlistRepository;
    @Mock
    private RecycleBinService recycleBinService;
    @Mock
    private VNPayService vnPayService;

    private ShopService shopService;

    @BeforeEach
    void setUp() {
        shopService = new ShopService(
                userRepository,
                categoryRepository,
                productRepository,
                couponRepository,
                userCouponRepository,
                cartItemRepository,
                orderRepository,
                orderItemRepository,
                reviewRepository,
                wishlistRepository,
                recycleBinService,
                vnPayService
        );
    }

    // 1. Test tính tổng tiền giỏ hàng chính xác
    @Test
    void cart_CalculateSubtotalCorrectly() {
        long userId = 1L;
        User user = User.builder().id(userId).username("customer").build();

        Product p1 = Product.builder()
                .id(101L)
                .name("Astra Phone X")
                .price(new BigDecimal("10000000"))
                .discountPercent(10) // Giá sau giảm: 9,000,000
                .stock(5)
                .build();

        CartItem item1 = CartItem.builder()
                .id(1L)
                .user(user)
                .product(p1)
                .quantity(2) // 2 * 9,000,000 = 18,000,000
                .build();

        when(cartItemRepository.findByUserId(userId)).thenReturn(List.of(item1));

        Map<String, Object> cartResult = shopService.cart(userId);

        assertNotNull(cartResult);
        assertEquals(new BigDecimal("18000000.00"), cartResult.get("subtotal"));
        List<?> items = (List<?>) cartResult.get("items");
        assertEquals(1, items.size());
    }

    // 2. Test thêm vào giỏ hàng thành công
    @Test
    void addToCart_Success() {
        long userId = 1L;
        CartRequest req = new CartRequest(101L, 2);

        User user = User.builder().id(userId).username("customer").build();
        Product product = Product.builder()
                .id(101L)
                .name("Laptop Gaming")
                .price(new BigDecimal("20000000"))
                .stock(10)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(productRepository.findById(101L)).thenReturn(Optional.of(product));
        when(cartItemRepository.findByUserIdAndProductId(userId, 101L)).thenReturn(Optional.empty());

        Map<String, Object> result = shopService.addToCart(userId, req);

        verify(cartItemRepository, times(1)).save(any(CartItem.class));
        assertNotNull(result);
    }

    // 3. Test thêm vào giỏ hàng thất bại do vượt quá tồn kho
    @Test
    void addToCart_Fail_ExceedStock() {
        long userId = 1L;
        CartRequest req = new CartRequest(102L, 10);

        User user = User.builder().id(userId).username("customer").build();
        Product product = Product.builder()
                .id(102L)
                .name("Tai nghe Bluetooth")
                .price(new BigDecimal("500000"))
                .stock(3) // Tồn kho chỉ có 3
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(productRepository.findById(102L)).thenReturn(Optional.of(product));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> shopService.addToCart(userId, req));
        assertTrue(ex.getMessage().toLowerCase().contains("exceeds stock") || ex.getMessage().contains("Vượt quá tồn kho"));
        verify(cartItemRepository, never()).save(any());
    }
}
