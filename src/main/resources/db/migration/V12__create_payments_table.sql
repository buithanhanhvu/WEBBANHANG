-- Create payments table to separate payment details from orders
CREATE TABLE payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'COD',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    vnpay_txn_ref VARCHAR(100) NULL,
    vnpay_transaction_no VARCHAR(100) NULL,
    amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Migrate existing order payment details to payments table
INSERT INTO payments (order_id, payment_method, payment_status, vnpay_txn_ref, vnpay_transaction_no, amount)
SELECT id, payment_method, payment_status, vnpay_txn_ref, vnpay_transaction_no, total_amount FROM orders;

-- Drop payment columns from orders table to normalize the schema
ALTER TABLE orders
    DROP COLUMN payment_method,
    DROP COLUMN payment_status,
    DROP COLUMN vnpay_txn_ref,
    DROP COLUMN vnpay_transaction_no;
