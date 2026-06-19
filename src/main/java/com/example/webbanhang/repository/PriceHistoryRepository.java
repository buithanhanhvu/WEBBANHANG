package com.example.webbanhang.repository;

import com.example.webbanhang.domain.PriceHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PriceHistoryRepository extends JpaRepository<PriceHistory, Long> {
    List<PriceHistory> findByProductIdOrderByChangedAtDesc(Long productId, Pageable pageable);
    void deleteByProductId(Long productId);
}
