package com.example.webbanhang.service;

import com.example.webbanhang.domain.Category;
import com.example.webbanhang.domain.PriceHistory;
import com.example.webbanhang.domain.Product;
import com.example.webbanhang.domain.Rank;
import com.example.webbanhang.dto.Requests.CategoryRequest;
import com.example.webbanhang.dto.Requests.ProductRequest;
import com.example.webbanhang.exception.BadRequestException;
import com.example.webbanhang.exception.ResourceNotFoundException;
import com.example.webbanhang.repository.CategoryRepository;
import com.example.webbanhang.repository.PriceHistoryRepository;
import com.example.webbanhang.repository.ProductRepository;
import com.example.webbanhang.repository.RankRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
public class CatalogService {
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final PriceHistoryRepository priceHistoryRepository;
    private final RankRepository rankRepository;
    private final RecycleBinService recycleBinService;

    @PersistenceContext
    private EntityManager entityManager;

    public CatalogService(CategoryRepository categoryRepository,
                          ProductRepository productRepository,
                          PriceHistoryRepository priceHistoryRepository,
                          RankRepository rankRepository,
                          RecycleBinService recycleBinService) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.priceHistoryRepository = priceHistoryRepository;
        this.rankRepository = rankRepository;
        this.recycleBinService = recycleBinService;
    }

    public List<Map<String, Object>> categories() {
        return categoryRepository.findAll().stream().map(this::mapCategory).toList();
    }

    public Map<String, Object> category(long id) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        return mapCategory(cat);
    }

    @Transactional
    public Map<String, Object> createCategory(CategoryRequest request) {
        requireText(request.name(), "Category name is required");
        if (categoryRepository.existsByName(request.name())) {
            throw new BadRequestException("Danh mục đã tồn tại");
        }
        Category cat = Category.builder()
                .name(request.name())
                .description(request.description())
                .build();
        cat = categoryRepository.save(cat);
        return mapCategory(cat);
    }

    @Transactional
    public Map<String, Object> updateCategory(long id, CategoryRequest request) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        requireText(request.name(), "Category name is required");
        cat.setName(request.name());
        cat.setDescription(request.description());
        cat = categoryRepository.save(cat);
        return mapCategory(cat);
    }

    @Transactional
    public void deleteCategory(long id) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        
        List<Product> products = entityManager.createQuery("SELECT p FROM Product p WHERE p.category.id = :catId", Product.class)
                .setParameter("catId", id)
                .getResultList();

        List<Long> productIds = products.stream().map(Product::getId).toList();
        Map<String, Object> catBackup = new HashMap<>(mapCategory(cat));
        catBackup.put("product_ids", productIds);
        recycleBinService.saveToRecycleBin("CATEGORY", id, cat.getName(), catBackup);

        for (Product p : products) {
            p.setCategory(null);
            productRepository.save(p);
        }
        categoryRepository.delete(cat);
    }

    public List<Map<String, Object>> products(String search, Long categoryId, Boolean featured,
                                               BigDecimal minPrice, BigDecimal maxPrice,
                                               Double minRating, String brand, String sortBy, int page, int size) {
        StringBuilder jpql = new StringBuilder("""
            SELECT p, COALESCE(ROUND(AVG(r.rating), 1), 0.0) as avgRating
            FROM Product p
            LEFT JOIN p.category c
            LEFT JOIN Review r ON r.product.id = p.id
            WHERE 1=1
        """);
        Map<String, Object> params = new HashMap<>();
        if (search != null && !search.isBlank()) {
            jpql.append(" AND (LOWER(p.name) LIKE LOWER(:search) OR LOWER(p.description) LIKE LOWER(:search) OR LOWER(c.name) LIKE LOWER(:search))");
            params.put("search", "%" + search.trim() + "%");
        }
        if (categoryId != null) {
            jpql.append(" AND p.category.id = :categoryId");
            params.put("categoryId", categoryId);
        }
        if (featured != null) {
            jpql.append(" AND p.featured = :featured");
            params.put("featured", featured);
        }
        if (minPrice != null) {
            jpql.append(" AND (p.price * (100 - p.discountPercent) / 100) >= :minPrice");
            params.put("minPrice", minPrice);
        }
        if (maxPrice != null) {
            jpql.append(" AND (p.price * (100 - p.discountPercent) / 100) <= :maxPrice");
            params.put("maxPrice", maxPrice);
        }
        if (brand != null && !brand.isBlank()) {
            jpql.append(" AND LOWER(p.brand) = LOWER(:brand)");
            params.put("brand", brand.trim());
        }

        jpql.append(" GROUP BY p.id, c.id");

        if (minRating != null) {
            jpql.append(" HAVING COALESCE(ROUND(AVG(r.rating), 1), 0.0) >= :minRating");
        }

        // Sorting – frontend sends 'price,asc' / 'price,desc' / 'name,asc' / 'createdAt,desc'
        if (sortBy != null) {
            switch (sortBy) {
                case "price,asc"  -> jpql.append(" ORDER BY (p.price * (100 - p.discountPercent) / 100) ASC");
                case "price,desc" -> jpql.append(" ORDER BY (p.price * (100 - p.discountPercent) / 100) DESC");
                case "name,asc"   -> jpql.append(" ORDER BY p.name ASC");
                case "rating"     -> jpql.append(" ORDER BY avgRating DESC");
                default           -> jpql.append(" ORDER BY p.createdAt DESC");
            }
        } else {
            jpql.append(" ORDER BY p.createdAt DESC");
        }

        var query = entityManager.createQuery(jpql.toString());
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            query.setParameter(entry.getKey(), entry.getValue());
        }
        if (minRating != null) {
            query.setParameter("minRating", minRating);
        }

        query.setFirstResult(page * size);
        query.setMaxResults(size);

        List<?> rows = query.getResultList();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object row : rows) {
            Object[] arr = (Object[]) row;
            Product p = (Product) arr[0];
            Map<String, Object> map = mapProduct(p);
            result.add(map);
        }
        return result;
    }

    public Map<String, Object> product(long id) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        return mapProduct(p);
    }

    @Transactional
    public Map<String, Object> createProduct(ProductRequest request) {
        validateProduct(request);
        Category cat = null;
        if (request.categoryId() != null) {
            cat = categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        }
        Product p = Product.builder()
                .name(request.name())
                .description(request.description())
                .price(request.price())
                .stock(request.stock())
                .imageUrl(request.imageUrl())
                .category(cat)
                .featured(Boolean.TRUE.equals(request.featured()))
                .discountPercent(safeDiscount(request.discountPercent()))
                .brand(request.brand())
                .build();
        p = productRepository.save(p);

        if (request.images() != null && !request.images().isEmpty()) {
            for (String imgUrl : request.images()) {
                if (imgUrl != null && !imgUrl.isBlank()) {
                    entityManager.persist(com.example.webbanhang.domain.ProductImage.builder()
                            .product(p)
                            .imageUrl(imgUrl.trim())
                            .build());
                }
            }
            entityManager.flush();
        }

        return mapProduct(p);
    }

    @Transactional
    public Map<String, Object> updateProduct(long id, ProductRequest request) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        validateProduct(request);

        BigDecimal oldPrice = p.getPrice();
        int oldDiscount = p.getDiscountPercent();
        int newDiscount = safeDiscount(request.discountPercent());

        boolean priceChanged = request.price() != null && !request.price().equals(oldPrice);
        boolean discountChanged = newDiscount != oldDiscount;

        Category cat = null;
        if (request.categoryId() != null) {
            cat = categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        }

        p.setName(request.name());
        p.setDescription(request.description());
        p.setPrice(request.price());
        p.setStock(request.stock());
        p.setImageUrl(request.imageUrl());
        p.setCategory(cat);
        p.setFeatured(Boolean.TRUE.equals(request.featured()));
        p.setDiscountPercent(newDiscount);
        p.setBrand(request.brand());

        p = productRepository.save(p);

        // Delete old gallery images and persist new ones
        entityManager.createQuery("DELETE FROM ProductImage pi WHERE pi.product.id = :prodId")
                .setParameter("prodId", p.getId())
                .executeUpdate();

        if (request.images() != null) {
            for (String imgUrl : request.images()) {
                if (imgUrl != null && !imgUrl.isBlank()) {
                    entityManager.persist(com.example.webbanhang.domain.ProductImage.builder()
                            .product(p)
                            .imageUrl(imgUrl.trim())
                            .build());
                }
            }
        }
        entityManager.flush();

        if (priceChanged || discountChanged) {
            PriceHistory history = PriceHistory.builder()
                    .product(p)
                    .oldPrice(oldPrice)
                    .newPrice(request.price())
                    .oldDiscount(oldDiscount)
                    .newDiscount(newDiscount)
                    .build();
            priceHistoryRepository.save(history);
        }

        return mapProduct(p);
    }

    public List<Map<String, Object>> priceHistory(long productId) {
        product(productId); // validate exists
        List<PriceHistory> historyList = priceHistoryRepository.findByProductIdOrderByChangedAtDesc(productId, PageRequest.of(0, 20));
        return historyList.stream().map(h -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", h.getId());
            m.put("product_id", h.getProduct().getId());
            m.put("old_price", h.getOldPrice());
            m.put("new_price", h.getNewPrice());
            m.put("old_discount", h.getOldDiscount());
            m.put("new_discount", h.getNewDiscount());
            m.put("changed_at", h.getChangedAt());
            return m;
        }).toList();
    }

    @Transactional
    public void deleteProduct(long id) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        
        Number orderedCount = (Number) entityManager.createQuery("SELECT COUNT(oi.id) FROM OrderItem oi WHERE oi.product.id = :prodId")
                .setParameter("prodId", id)
                .getSingleResult();

        if (orderedCount != null && orderedCount.intValue() > 0) {
            throw new BadRequestException("Không thể xóa sản phẩm này vì đã có đơn hàng đặt mua. Hãy cập nhật trạng thái hoặc chỉnh sửa tồn kho về 0 thay vì xóa.");
        }

        recycleBinService.saveToRecycleBin("PRODUCT", id, p.getName(), mapProduct(p));

        // Cascade delete wishlists and history manually
        entityManager.createQuery("DELETE FROM Wishlist w WHERE w.product.id = :prodId").setParameter("prodId", id).executeUpdate();
        entityManager.createQuery("DELETE FROM PriceHistory ph WHERE ph.product.id = :prodId").setParameter("prodId", id).executeUpdate();
        entityManager.createQuery("DELETE FROM CartItem ci WHERE ci.product.id = :prodId").setParameter("prodId", id).executeUpdate();
        entityManager.createQuery("DELETE FROM Review r WHERE r.product.id = :prodId").setParameter("prodId", id).executeUpdate();

        productRepository.delete(p);
    }

    @Transactional
    public void bulkUpdateCategory(List<Long> productIds, Long categoryId) {
        if (productIds == null || productIds.isEmpty()) {
            return;
        }
        Category cat = null;
        if (categoryId != null) {
            cat = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        }
        for (Long prodId : productIds) {
            Product p = productRepository.findById(prodId).orElse(null);
            if (p != null) {
                p.setCategory(cat);
                productRepository.save(p);
            }
        }
    }

    private Map<String, Object> mapCategory(Category cat) {
        if (cat == null) return null;
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", cat.getId());
        map.put("name", cat.getName());
        map.put("description", cat.getDescription());

        long count = 0;
        if (cat.getId() != null) {
            count = (long) entityManager.createQuery("SELECT COUNT(p.id) FROM Product p WHERE p.category.id = :catId")
                    .setParameter("catId", cat.getId())
                    .getSingleResult();
        }
        map.put("product_count", count);

        return map;
    }

    private Map<String, Object> mapProduct(Product p) {
        if (p == null) return null;
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", p.getId());
        map.put("name", p.getName());
        map.put("description", p.getDescription());
        map.put("price", p.getPrice());
        map.put("stock", p.getStock());
        map.put("image_url", p.getImageUrl());
        map.put("category_id", p.getCategory() != null ? p.getCategory().getId() : null);
        map.put("category_name", p.getCategory() != null ? p.getCategory().getName() : null);
        map.put("featured", p.getFeatured());
        map.put("discount_percent", p.getDiscountPercent());
        map.put("brand", p.getBrand());
        map.put("created_at", p.getCreatedAt());

        List<com.example.webbanhang.domain.ProductImage> productImages = Collections.emptyList();
        if (p.getId() != null) {
            productImages = entityManager.createQuery(
                "SELECT pi FROM ProductImage pi WHERE pi.product.id = :prodId", com.example.webbanhang.domain.ProductImage.class
            )
            .setParameter("prodId", p.getId())
            .getResultList();
        }

        if (productImages != null && !productImages.isEmpty()) {
            List<Map<String, Object>> imgList = productImages.stream().map(img -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", img.getId());
                m.put("imageUrl", img.getImageUrl());
                return m;
            }).toList();
            map.put("images", imgList);
        } else {
            map.put("images", Collections.emptyList());
        }

        double avg = 0.0;
        long count = 0;
        if (p.getId() != null) {
            Object[] stats = (Object[]) entityManager.createQuery(
                "SELECT COALESCE(ROUND(AVG(r.rating), 1), 0.0), COUNT(r.id) FROM Review r WHERE r.product.id = :prodId"
            )
            .setParameter("prodId", p.getId())
            .getSingleResult();
            avg = ((Number) stats[0]).doubleValue();
            count = ((Number) stats[1]).longValue();
        }
        map.put("average_rating", avg);
        map.put("review_count", count);

        BigDecimal salePrice = p.getPrice().multiply(BigDecimal.valueOf(100 - p.getDiscountPercent())).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        map.put("sale_price", salePrice);

        return map;
    }

    private void validateProduct(ProductRequest request) {
        requireText(request.name(), "Product name is required");
        if (request.price() == null || request.price().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Product price must be positive");
        }
        if (request.stock() == null || request.stock() < 0) {
            throw new BadRequestException("Product stock must be zero or positive");
        }
    }

    private int safeDiscount(Integer discount) {
        return discount == null ? 0 : Math.max(0, Math.min(100, discount));
    }

    private void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(message);
        }
    }
}
