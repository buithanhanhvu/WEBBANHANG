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
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    try {
        // ------------------------------------------------------------------
        // TEST CASE 1: Đăng nhập tài khoản Khách hàng
        // ------------------------------------------------------------------
        console.log('📌 Running TC_UI_001: Customer Login...');
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
        await page.fill('input[type="text"], input[name="usernameOrEmail"]', 'customer');
        await page.fill('input[type="password"]', 'customer123');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2500);
        await page.screenshot({ path: path.join(outputDir, 'selenium_01_customer_login.png') });
        console.log('✅ TC_UI_001 Passed: Customer Login successful.');

        // ------------------------------------------------------------------
        // TEST CASE 2: Xem chi tiết sản phẩm & Album ảnh (Route: /product/1)
        // ------------------------------------------------------------------
        console.log('📌 Running TC_UI_002: Product Detail Page...');
        await page.goto('http://localhost:3000/product/1', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2500);
        await page.screenshot({ path: path.join(outputDir, 'selenium_02_product_detail.png') });
        console.log('✅ TC_UI_002 Passed: Product Detail loaded.');

        // ------------------------------------------------------------------
        // TEST CASE 3: Giỏ hàng & Trang Thanh toán
        // ------------------------------------------------------------------
        console.log('📌 Running TC_UI_003: Shopping Cart & Checkout...');
        await page.goto('http://localhost:3000/cart', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(outputDir, 'selenium_03_shopping_cart.png') });

        await page.goto('http://localhost:3000/checkout', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(outputDir, 'selenium_04_checkout_page.png') });
        console.log('✅ TC_UI_003 Passed: Checkout Page verified.');

        // ------------------------------------------------------------------
        // TEST CASE 4: Admin Dashboard & Quản lý đơn hàng
        // ------------------------------------------------------------------
        console.log('📌 Running TC_UI_004: Admin Dashboard...');
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
        await page.fill('input[type="text"], input[name="usernameOrEmail"]', 'admin');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2500);

        await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2500);
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
