CREATE TABLE IF NOT EXISTS ranks (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    subtitle VARCHAR(100),
    icon VARCHAR(50),
    description VARCHAR(500),
    min_spent DECIMAL(12,2) NOT NULL,
    color VARCHAR(50),
    css_class VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
