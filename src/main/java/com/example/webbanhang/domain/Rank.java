package com.example.webbanhang.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "ranks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rank {
    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 100)
    private String subtitle;

    @Column(length = 50)
    private String icon;

    @Column(length = 500)
    private String description;

    @Column(name = "min_spent", nullable = false, precision = 12, scale = 2)
    private BigDecimal minSpent;

    @Column(length = 50)
    private String color;

    @Column(name = "css_class", length = 50)
    private String cssClass;
}
