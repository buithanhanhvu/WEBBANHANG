package com.example.webbanhang;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.flywaydb.core.Flyway;

@SpringBootTest(properties = "app.seed.enabled=false")
class WebbanhangApplicationTests {

    @Autowired
    private Flyway flyway;

    @Test
    void contextLoads() {
    }

}

