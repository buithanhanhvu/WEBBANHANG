package com.example.webbanhang.repository;

import com.example.webbanhang.domain.Rank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RankRepository extends JpaRepository<Rank, String> {
    List<Rank> findAllByOrderByMinSpentAsc();
}
