const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log("Starting clean screenshot capture...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const reportDir = "e:\\WEBBANHANG\\images\\report";
  
  // Create report dir if it doesn't exist
  const fs = require('fs');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Helper function to capture the viewport cleanly
  async function capture(fileName, width = 1920, height = 890) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(2000); // Wait for animations/transitions
    const filePath = path.join(reportDir, fileName);
    await page.screenshot({ path: filePath });
    console.log(`Saved screenshot: ${fileName} (${width}x${height})`);
  }

  try {
    // 1. Unauthenticated Login page
    console.log("Navigating to login page...");
    await page.goto("http://localhost:3000/login");
    await capture("hinh3_1_login.png", 1920, 888);

    // Login as Customer
    console.log("Logging in as customer...");
    await page.fill('input[type="text"], input[placeholder*="tên"], input[placeholder*="username"]', 'customer');
    await page.fill('input[type="password"]', 'customer123');
    await page.click('button[type="submit"], button:has-text("Đăng nhập")');
    await page.waitForURL("http://localhost:3000/");
    console.log("Logged in as customer successfully!");

    // 2. Customer Homepage
    await page.goto("http://localhost:3000/");
    await capture("hinh3_2_trang_chu.png", 1920, 888);

    // 3. Customer Catalog
    await page.goto("http://localhost:3000/products");
    await capture("hinh3_3_danh_sach_san_pham.png", 1920, 888);

    // 4. Product Detail (e.g. product 1)
    await page.goto("http://localhost:3000/product/1");
    await capture("hinh3_4_chi_tiet_san_pham.png", 1920, 888);

    // 5. Collect Voucher page
    await page.goto("http://localhost:3000/vouchers");
    await capture("hinh3_5_collect_voucher.png", 1920, 890);

    // 6. Wishlist page
    await page.goto("http://localhost:3000/wishlist");
    await capture("hinh3_9_wishlist.png", 1920, 890);

    // 7. Customer Profile page (info tab)
    await page.goto("http://localhost:3000/profile");
    await capture("hinh3_8_1_profile.png", 1920, 1766);

    // 8. Change Password tab
    console.log("Switching to password tab...");
    await page.click('button:has-text("Đổi mật khẩu")');
    await capture("hinh3_8_2_doi_mat_khau.png", 1920, 1661);

    // 9. Shopping Cart / Checkout with voucher applied
    // Add product 1 to cart
    console.log("Adding product 1 to cart...");
    await page.goto("http://localhost:3000/product/1");
    await page.click('button:has-text("Thêm vào giỏ hàng")');
    await page.waitForTimeout(1000);

    // Go to Checkout
    console.log("Navigating to checkout...");
    await page.goto("http://localhost:3000/checkout");
    await page.waitForTimeout(1500);

    // Apply voucher
    console.log("Applying voucher...");
    await page.fill('input[placeholder*="mã"], input[placeholder*="voucher"], input[placeholder*="Voucher"]', 'WELCOME10');
    await page.click('button:has-text("Áp dụng")');
    await page.waitForTimeout(1500);
    await capture("hinh3_6_use_voucher.png", 1920, 890);

    // 10. Place order (Payment Success)
    console.log("Placing order...");
    await page.click('button:has-text("Xác nhận đặt hàng")');
    await page.waitForTimeout(3000);
    await capture("hinh3_7_thanh_toan.png", 1920, 890);

    // 11. Order Tracking page
    await page.goto("http://localhost:3000/orders");
    await capture("hinh3_8_theo_doi_don_hang.png", 1920, 890);

    // Logout customer
    console.log("Logging out customer...");
    await page.goto("http://localhost:3000/profile");
    await page.click('button[title="Đăng xuất"], button:has-text("Đăng xuất")').catch(async () => {
      await page.evaluate(() => localStorage.clear());
    });

    // Login as Admin
    console.log("Logging in as admin...");
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="text"], input[placeholder*="tên"], input[placeholder*="username"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"], button:has-text("Đăng nhập")');
    await page.waitForURL("http://localhost:3000/");
    console.log("Logged in as admin successfully!");

    // 12. Admin Dashboard (Overview tab)
    await page.goto("http://localhost:3000/admin");
    await capture("hinh3_10_dashboard_admin.png", 1920, 890);

    // 13. Admin Product Management (Products tab)
    console.log("Navigating to admin products tab...");
    await page.click('button:has-text("Sản phẩm")').catch(async () => {
      await page.click('nav button:nth-child(2)');
    });
    await capture("hinh3_11_quan_ly_san_pham.png", 1920, 890);

    // 14. Admin Order Management (Orders tab)
    console.log("Navigating to admin orders tab...");
    await page.click('button:has-text("Đơn hàng")').catch(async () => {
      await page.click('nav button:nth-child(5)');
    });
    await capture("hinh3_12_quan_ly_don_hang.png", 1920, 890);

    // 15. Admin Voucher Management (Coupons tab)
    console.log("Navigating to admin coupons tab...");
    await page.click('button:has-text("Mã giảm giá"), button:has-text("Voucher")').catch(async () => {
      await page.click('nav button:nth-child(4)');
    });
    await capture("hinh3_13_quan_ly_voucher.png", 1920, 890);

    // 16. Admin Recycle Bin (Recycle tab)
    console.log("Navigating to admin recycle bin tab...");
    await page.click('button:has-text("Thùng rác")').catch(async () => {
      await page.click('nav button:nth-child(6)');
    });
    await capture("hinh3_14_recycle_bin.png", 1920, 890);

    console.log("All screenshots captured cleanly without borders!");
  } catch (err) {
    console.error("Error during capturing process: ", err);
  } finally {
    await browser.close();
  }
})();
