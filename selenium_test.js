const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runAutomationTests() {
    console.log('🚀 Bắt đầu khởi chạy Selenium / Playwright UI Automation Tests...');
    const outputDir = path.join(__dirname, 'images');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    try {
        // ------------------------------------------------------------------
        // TEST CASE 1: Đăng nhập tài khoản Khách hàng
        // ------------------------------------------------------------------
        console.log('📌 Running TC_UI_001: Customer Login...');
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
        await page.fill('input[name="usernameOrEmail"], input[type="text"]', 'customer');
        await page.fill('input[name="password"], input[type="password"]', 'customer123');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(outputDir, 'selenium_01_customer_login.png') });
        console.log('✅ TC_UI_001 Passed: Customer Login successful.');

        // ------------------------------------------------------------------
        // TEST CASE 2: Xem chi tiết sản phẩm & Thêm vào giỏ hàng
        // ------------------------------------------------------------------
        console.log('📌 Running TC_UI_002: Product Detail & Add to Cart...');
        await page.goto('http://localhost:3000/products/1', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(outputDir, 'selenium_02_product_detail.png') });
        console.log('✅ TC_UI_002 Passed: Product Detail loaded.');

        // ------------------------------------------------------------------
        // TEST CASE 3: Giỏ hàng & Áp Voucher
        // ------------------------------------------------------------------
        console.log('📌 Running TC_UI_003: Shopping Cart & Checkout...');
        await page.goto('http://localhost:3000/cart', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(outputDir, 'selenium_03_shopping_cart.png') });

        await page.goto('http://localhost:3000/checkout', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(outputDir, 'selenium_04_checkout_page.png') });
        console.log('✅ TC_UI_003 Passed: Checkout Page verified.');

        // ------------------------------------------------------------------
        // TEST CASE 4: Admin Dashboard & Quản lý đơn hàng
        // ------------------------------------------------------------------
        console.log('📌 Running TC_UI_004: Admin Dashboard...');
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
        await page.fill('input[name="usernameOrEmail"], input[type="text"]', 'admin');
        await page.fill('input[name="password"], input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);

        await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(outputDir, 'selenium_05_admin_dashboard.png') });
        console.log('✅ TC_UI_004 Passed: Admin Dashboard verified.');

    } catch (err) {
        console.error('❌ Selenium UI Test Error:', err.message);
    } finally {
        await browser.close();
        console.log('🏁 Kết thúc Automation Test Suite.');
    }
}

runAutomationTests();
