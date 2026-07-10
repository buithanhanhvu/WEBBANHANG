const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log("Starting missing report screenshots capture...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const imagesDir = "e:\\WEBBANHANG\\images";
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  try {
    // 1. Capture Swagger UI - API Groups and Endpoints
    console.log("Navigating to Swagger UI...");
    await page.goto("http://localhost:8080/swagger-ui/index.html");
    await page.waitForTimeout(3000); // Wait for Swagger to load APIs

    // Expand the Admin API and Cart & Orders groups to show endpoints
    console.log("Expanding some Swagger groups...");
    await page.click('span:has-text("Cart & Orders"), h3:has-text("Cart & Orders")').catch(() => {});
    await page.click('span:has-text("Admin API"), h3:has-text("Admin API")').catch(() => {});
    await page.waitForTimeout(1000);

    // Capture Swagger UI Groups (full page screenshot to make it comprehensive)
    await page.setViewportSize({ width: 1440, height: 1200 });
    const swaggerPath = path.join(imagesDir, "swagger_api_groups.png");
    await page.screenshot({ path: swaggerPath, fullPage: true });
    console.log("Saved Swagger UI screenshot to: " + swaggerPath);

    // 2. Capture Surefire HTML Report (showing all 14 test cases)
    console.log("Navigating to Surefire Report...");
    const reportPath = "file:///e:/WEBBANHANG/target/reports/surefire.html";
    await page.goto(reportPath);
    await page.waitForTimeout(2000);

    // Capture the Surefire Report
    await page.setViewportSize({ width: 1440, height: 1000 });
    const reportImgPath = path.join(imagesDir, "surefire_test_cases.png");
    await page.screenshot({ path: reportImgPath, fullPage: true });
    console.log("Saved Surefire Report screenshot to: " + reportImgPath);

    console.log("Screenshots captured successfully!");
  } catch (err) {
    console.error("Error during screen capture: ", err);
  } finally {
    await browser.close();
  }
})();
