package com.example.webbanhang.repository;

import com.example.webbanhang.domain.RecycleBin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RecycleBinRepository extends JpaRepository<RecycleBin, Long> {
    Optional<RecycleBin> findByEntityTypeAndEntityId(String entityType, Long entityId);
}
