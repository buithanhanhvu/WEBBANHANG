-- Add payment method and VNPAY transaction fields to orders table
ALTER TABLE orders
    ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'COD' AFTER note,
    ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' AFTER payment_method,
    ADD COLUMN vnpay_txn_ref VARCHAR(100) NULL AFTER payment_status,
    ADD COLUMN vnpay_transaction_no VARCHAR(100) NULL AFTER vnpay_txn_ref;
