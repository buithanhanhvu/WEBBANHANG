const state = {
    token: localStorage.getItem("token"),
    user: JSON.parse(localStorage.getItem("user") || "null"),
    products: [],
    categories: [],
    adminTab: "products",
    selectedOrderId: null
};

const money = value => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value || 0));
const $ = selector => document.querySelector(selector);
const valueOf = (obj, ...keys) => keys.map(key => obj?.[key]).find(value => value !== undefined && value !== null);
const avatarFor = user => valueOf(user, "avatarUrl", "avatar_url") || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(valueOf(user, "fullName", "username") || "MiniShop")}`;
const formatDate = value => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "";

async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const response = await fetch(path, { ...options, headers });
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error(body.message || "Có lỗi xảy ra");
    return body.data;
}

function toast(message) {
    const node = $("#toast");
    node.textContent = message;
    node.classList.add("show");
    setTimeout(() => node.classList.remove("show"), 2600);
}

function show(view) {
    document.querySelectorAll(".view").forEach(node => node.classList.add("hidden"));
    $(`#${view}View`).classList.remove("hidden");
    if (view === "products") loadProducts();
    if (view === "cart") loadCart();
    if (view === "orders") loadOrders();
    if (view === "profile") loadProfile();
    if (view === "admin") loadAdmin();
}

function syncAuthUi() {
    const isLoggedIn = !!state.user;
    $("#authButton").classList.toggle("hidden", isLoggedIn);
    document.querySelectorAll(".user-only").forEach(node => node.classList.toggle("hidden", !isLoggedIn));
    document.querySelectorAll(".admin-only").forEach(node => {
        node.classList.toggle("hidden", !isLoggedIn || state.user.role !== "ADMIN");
    });
    if (isLoggedIn) {
        const profileBtn = $("#profileButton");
        profileBtn.innerHTML = `<img class="topbar-avatar" src="${avatarFor(state.user)}" alt=""> ${valueOf(state.user, "fullName", "username") || "Tài khoản"}`;
    }
}

async function loadBase() {
    state.categories = await api("/api/categories");
    $("#categoryFilter").innerHTML = `<option value="">Tất cả danh mục</option>` +
        state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
    await loadProducts();
    await loadHome();
    syncAuthUi();
}

async function loadHome() {
    const featured = await api("/api/products?featured=true");
    $("#featuredProducts").innerHTML = featured.map(productCard).join("");
}

async function loadProducts() {
    const query = new URLSearchParams();
    const search = $("#searchInput").value.trim();
    const categoryId = $("#categoryFilter").value;
    if (search) query.set("search", search);
    if (categoryId) query.set("categoryId", categoryId);
    state.products = await api(`/api/products?${query.toString()}`);
    $("#productsGrid").innerHTML = state.products.map(productCard).join("") || `<p class="muted">Không có sản phẩm phù hợp.</p>`;
}

function productCard(p) {
    const sale = Number(valueOf(p, "discount_percent", "discountPercent") || 0);
    const finalPrice = Number(p.price) * (100 - sale) / 100;
    const outOfStock = Number(p.stock) === 0;
    const rating = Number(valueOf(p, "average_rating", "averageRating") || 0);
    const reviewCount = Number(valueOf(p, "review_count", "reviewCount") || 0);
    return `
        <article class="product-card${outOfStock ? " out-of-stock" : ""}" data-product-id="${p.id}">
            <div class="product-img-wrap">
                <img src="${valueOf(p, "image_url", "imageUrl") || ""}" alt="${p.name}">
                ${outOfStock ? `<div class="oos-overlay"><span>Hết hàng</span></div>` : ""}
                ${sale && !outOfStock ? `<span class="sale-badge">-${sale}%</span>` : ""}
            </div>
            <div class="product-body">
                <span class="badge">${valueOf(p, "category_name", "categoryName") || "Sản phẩm"}</span>
                <h3>${p.name}</h3>
                <div class="rating-row">
                    ${ratingStars(rating)}
                    <span class="muted">(${reviewCount})</span>
                </div>
                <div class="price-row">
                    <span class="price">${money(finalPrice)}</span>
                    ${sale ? `<span class="original-price">${money(p.price)}</span>` : ""}
                </div>
                <div class="card-actions">
                    <button onclick="openProduct(${p.id})">Chi tiết</button>
                    <button class="primary${outOfStock ? " disabled-btn" : ""}" ${outOfStock ? "disabled" : `onclick="addCart(${p.id})"`}>
                        ${outOfStock ? "Hết hàng" : "Thêm vào giỏ"}
                    </button>
                </div>
            </div>
        </article>`;
}

function ratingStars(rating) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    let stars = "";
    for (let i = 0; i < 5; i++) {
        if (i < full) stars += `<span class="star full">★</span>`;
        else if (i === full && half) stars += `<span class="star half">★</span>`;
        else stars += `<span class="star empty">☆</span>`;
    }
    return `<span class="stars">${stars}</span>`;
}

async function openProduct(id) {
    const [p, reviews] = await Promise.all([api(`/api/products/${id}`), api(`/api/products/${id}/reviews`)]);
    const sale = Number(valueOf(p, "discount_percent", "discountPercent") || 0);
    const finalPrice = Number(p.price) * (100 - sale) / 100;
    const outOfStock = Number(p.stock) === 0;
    const rating = Number(valueOf(p, "average_rating", "averageRating") || 0);
    const reviewCount = Number(valueOf(p, "review_count", "reviewCount") || 0);

    // Kiểm tra user đã mua sản phẩm này chưa (để hiện form đánh giá)
    const userReview = state.user ? reviews.find(r => r.username === state.user.username) : null;

    $("#productDetail").innerHTML = `
        <div class="split detail-layout">
            <div class="detail-img-wrap${outOfStock ? " out-of-stock" : ""}">
                <img class="detail-image" src="${valueOf(p, "image_url", "imageUrl")}" alt="${p.name}">
                ${outOfStock ? `<div class="oos-overlay large"><span>Hết hàng</span></div>` : ""}
                ${sale && !outOfStock ? `<span class="sale-badge large">-${sale}%</span>` : ""}
            </div>
            <div class="panel form">
                <span class="badge">${valueOf(p, "category_name", "categoryName") || "Sản phẩm"}</span>
                <h2>${p.name}</h2>
                <p class="muted">${p.description || ""}</p>
                <div class="detail-rating">
                    ${ratingStars(rating)}
                    <span class="muted">${rating > 0 ? rating.toFixed(1) : "Chưa có"} · ${reviewCount} đánh giá</span>
                </div>
                <div class="price-row detail">
                    <strong class="price xl">${money(finalPrice)}</strong>
                    ${sale ? `<span class="original-price xl">${money(p.price)}</span><span class="discount-tag">Tiết kiệm ${sale}%</span>` : ""}
                </div>
                ${outOfStock
                    ? `<div class="oos-notice">Sản phẩm tạm hết hàng</div>`
                    : `<button class="primary add-to-cart-btn" onclick="addCart(${p.id})">🛒 Thêm vào giỏ hàng</button>`}
            </div>
        </div>
        <div class="panel reviews">
            <div class="reviews-header">
                <h3>Đánh giá (${reviewCount})</h3>
            </div>
            ${state.user ? `
            <div class="review-form-wrap" id="reviewFormWrap">
                <h4>${userReview ? "Sửa đánh giá của bạn" : "Viết đánh giá"}</h4>
                <div class="star-picker" id="starPicker" data-rating="${userReview ? userReview.rating : 0}">
                    ${[1,2,3,4,5].map(i => `<span class="pick-star${userReview && i <= userReview.rating ? " selected" : ""}" 
                        onclick="pickStar(${i})" onmouseover="hoverStar(${i})" onmouseout="unhoverStar()">★</span>`).join("")}
                    <span class="star-hint" id="starHint">${userReview ? `${userReview.rating}/5 sao` : "Chọn số sao"}</span>
                </div>
                <textarea id="reviewComment" placeholder="Nhận xét của bạn (không bắt buộc)..." rows="3">${userReview ? (userReview.comment || "") : ""}</textarea>
                <button class="primary" onclick="submitReview(${p.id})">
                    ${userReview ? "Cập nhật đánh giá" : "Gửi đánh giá"}
                </button>
                <p class="hint" id="reviewHint">Bạn cần đã mua sản phẩm và đơn hàng được xác nhận để đánh giá.</p>
            </div>` : `<p class="muted"><a href="#" onclick="$('#authDialog').showModal();return false;">Đăng nhập</a> để viết đánh giá.</p>`}
            <div id="reviewsList">
                ${reviews.length ? reviews.map(r => reviewCard(r)).join("") : `<p class="muted">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>`}
            </div>
        </div>`;
    show("detail");
    // Lưu productId vào form để submit
    if (state.user) {
        const picker = document.getElementById("starPicker");
        if (picker) picker.dataset.productId = p.id;
    }
}

function reviewCard(r) {
    return `
        <div class="review-item">
            <div class="review-header">
                <img class="review-avatar" src="https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(r.username)}" alt="${r.username}">
                <div>
                    <strong>${r.username}</strong>
                    <div>${ratingStars(r.rating)}</div>
                </div>
                <span class="muted review-date">${formatDate(valueOf(r, "created_at", "createdAt"))}</span>
            </div>
            ${r.comment ? `<p class="review-comment">${r.comment}</p>` : ""}
        </div>`;
}

function pickStar(n) {
    const picker = document.getElementById("starPicker");
    if (!picker) return;
    picker.dataset.rating = n;
    document.querySelectorAll(".pick-star").forEach((s, i) => s.classList.toggle("selected", i < n));
    const hint = document.getElementById("starHint");
    if (hint) hint.textContent = `${n}/5 sao`;
}

function hoverStar(n) {
    document.querySelectorAll(".pick-star").forEach((s, i) => s.classList.toggle("hover", i < n));
}

function unhoverStar() {
    document.querySelectorAll(".pick-star").forEach(s => s.classList.remove("hover"));
}

async function submitReview(productId) {
    requireLogin();
    const picker = document.getElementById("starPicker");
    const rating = parseInt(picker?.dataset.rating || "0");
    if (!rating) { toast("Vui lòng chọn số sao"); return; }
    const comment = document.getElementById("reviewComment")?.value || "";
    try {
        await api("/api/reviews", {
            method: "POST",
            body: JSON.stringify({ productId, rating, comment })
        });
        toast("Đã gửi đánh giá");
        await openProduct(productId);
    } catch (e) {
        toast(e.message);
    }
}

// Upload file từ máy, trả về URL
async function uploadFile(file) {
    const form = new FormData();
    form.append("file", file);
    const headers = {};
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const res = await fetch("/api/upload", { method: "POST", headers, body: form });
    const body = await res.json();
    if (!res.ok || !body.success) throw new Error(body.message || "Upload thất bại");
    return body.data.url;
}

async function addCart(productId) {
    requireLogin();
    await api("/api/cart/add", { method: "POST", body: JSON.stringify({ productId, quantity: 1 }) });
    toast("Đã thêm vào giỏ hàng");
}

async function loadCart() {
    requireLogin();
    const cart = await api("/api/cart");
    $("#cartItems").innerHTML = `
        <h3>Sản phẩm trong giỏ</h3>
        ${cart.items.map(item => `
            <div class="cart-row">
                <img src="${item.imageUrl}" alt="${item.name}">
                <div>
                    <strong>${item.name}</strong>
                    <div class="muted">${money(item.salePrice)} · SL: ${item.quantity}</div>
                    <div class="price">${money(item.lineTotal)}</div>
                </div>
                <div class="actions">
                    <button onclick="changeQty(${item.productId}, ${item.quantity - 1})">-</button>
                    <button onclick="changeQty(${item.productId}, ${item.quantity + 1})">+</button>
                    <button onclick="removeCart(${item.productId})">Xóa</button>
                </div>
            </div>`).join("") || `<p class="muted">Giỏ hàng đang trống.</p>`}
        <h3>Tạm tính: ${money(cart.subtotal)}</h3>`;
}

async function changeQty(productId, quantity) {
    if (quantity <= 0) return removeCart(productId);
    await api("/api/cart/update", { method: "PUT", body: JSON.stringify({ productId, quantity }) });
    await loadCart();
}

async function removeCart(productId) {
    await api(`/api/cart/remove/${productId}`, { method: "DELETE" });
    await loadCart();
}

async function loadOrders() {
    requireLogin();
    state.selectedOrderId = null;
    $("#orderDetail").classList.add("hidden");
    const orders = await api("/api/orders");
    if (!orders.length) {
        $("#ordersList").innerHTML = `
            <div class="empty-orders">
                <div class="empty-icon">📦</div>
                <p>Bạn chưa có đơn hàng nào.</p>
                <button class="primary" data-view="products">Mua sắm ngay</button>
            </div>`;
        return;
    }
    renderOrdersList(orders);
}

function renderOrdersList(orders) {
    const statusLabel = { PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", SHIPPING: "Đang giao", DELIVERED: "Đã nhận", CANCELLED: "Đã hủy" };
    $("#ordersList").innerHTML = orders.map(order => {
        const active = state.selectedOrderId === order.id ? "active" : "";
        const status = String(order.status);
        return `
            <div class="order-row panel ${active}" data-order-id="${order.id}" onclick="openOrder(${order.id})">
                <div class="order-row-left">
                    <strong class="order-id">#${order.id}</strong>
                    <span class="muted order-date">${formatDate(valueOf(order, "created_at", "createdAt"))}</span>
                </div>
                <div class="order-row-right">
                    <span class="price">${money(valueOf(order, "total_amount", "totalAmount"))}</span>
                    <span class="badge status-${status.toLowerCase()}">${statusLabel[status] || status}</span>
                    <span class="chevron">${state.selectedOrderId === order.id ? "▲" : "▼"}</span>
                </div>
            </div>`;
    }).join("");
}

async function openOrder(id) {
    requireLogin();
    if (state.selectedOrderId === id) {
        state.selectedOrderId = null;
        $("#orderDetail").classList.add("hidden");
        const orders = await api("/api/orders");
        renderOrdersList(orders);
        return;
    }
    state.selectedOrderId = id;
    const [order, orders] = await Promise.all([api(`/api/orders/${id}`), api("/api/orders")]);
    renderOrdersList(orders);

    const items = order.items || [];
    const status = String(order.status);
    const statusLabel = { PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", SHIPPING: "Đang giao", DELIVERED: "Đã nhận", CANCELLED: "Đã hủy" };
    const steps = ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED"];
    const currentStep = steps.indexOf(status);
    const isCancelled = status === "CANCELLED";

    const detailEl = $("#orderDetail");
    detailEl.classList.remove("hidden");
    detailEl.innerHTML = `
        <div class="order-detail-inner">
            <div class="order-detail-head">
                <div>
                    <p class="eyebrow">Chi tiết đơn hàng</p>
                    <h3>#${order.id}</h3>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <span class="badge status-${status.toLowerCase()}">${statusLabel[status] || status}</span>
                    <button onclick="closeOrderDetail()" class="close-btn">✕</button>
                </div>
            </div>
            ${isCancelled
                ? `<div class="cancelled-notice">❌ Đơn hàng đã bị hủy</div>`
                : `<div class="order-progress">
                    ${steps.map((s, i) => `
                        <div class="progress-step ${i <= currentStep ? "done" : ""} ${i === currentStep ? "current" : ""}">
                            <div class="step-dot">${i < currentStep ? "✓" : i + 1}</div>
                            <span>${statusLabel[s]}</span>
                        </div>
                        ${i < steps.length - 1 ? `<div class="progress-line ${i < currentStep ? "done" : ""}"></div>` : ""}`).join("")}
                </div>`}
            <div class="order-meta">
                <div><span class="meta-label">Ngày đặt</span><span>${formatDate(valueOf(order, "created_at", "createdAt"))}</span></div>
                <div><span class="meta-label">Người nhận</span><span>${valueOf(order, "shipping_name", "shippingName") || ""}</span></div>
                <div><span class="meta-label">Điện thoại</span><span>${valueOf(order, "shipping_phone", "shippingPhone") || ""}</span></div>
                <div><span class="meta-label">Địa chỉ</span><span>${valueOf(order, "shipping_address", "shippingAddress") || ""}</span></div>
            </div>
            <h4 class="items-heading">Sản phẩm đã đặt (${items.length})</h4>
            <div class="order-items">
                ${items.map(item => `
                    <div class="order-item">
                        <img src="${item.imageUrl || "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=300"}"
                             alt="${valueOf(item, "product_name", "productName") || ""}"
                             onerror="this.src='https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=300'">
                        <div class="order-item-info">
                            <strong>${valueOf(item, "product_name", "productName")}</strong>
                            <p class="muted">${item.productDescription || ""}</p>
                            <span class="muted">Đơn giá: ${money(item.price)} × ${item.quantity}</span>
                        </div>
                        <strong class="order-item-total">${money(Number(item.price) * Number(item.quantity))}</strong>
                    </div>`).join("")}
            </div>
            <div class="order-summary">
                <div class="summary-row"><span>Tạm tính</span><span>${money(Number(valueOf(order, "total_amount", "totalAmount")) + Number(valueOf(order, "discount_amount", "discountAmount")))}</span></div>
                ${Number(valueOf(order, "discount_amount", "discountAmount")) > 0 ? `<div class="summary-row discount"><span>Giảm giá</span><span>-${money(valueOf(order, "discount_amount", "discountAmount"))}</span></div>` : ""}
                <div class="summary-row total"><strong>Tổng thanh toán</strong><strong class="price">${money(valueOf(order, "total_amount", "totalAmount"))}</strong></div>
            </div>
        </div>`;
    detailEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeOrderDetail() {
    state.selectedOrderId = null;
    $("#orderDetail").classList.add("hidden");
    api("/api/orders").then(renderOrdersList).catch(() => {});
}

async function loadOrdersListActiveOnly() {
    const orders = await api("/api/orders");
    renderOrdersList(orders);
}

async function loadProfile() {
    requireLogin();
    state.user = await api("/api/auth/me");
    localStorage.setItem("user", JSON.stringify(state.user));
    const u = state.user;
    const avatarUrl = avatarFor(u);
    $("#profileAvatarPreview").src = avatarUrl;
    $("#profileNamePreview").textContent = valueOf(u, "fullName", "username") || u.username;
    $("#profileEmailPreview").textContent = u.email || "";
    $("#profileRoleBadge").textContent = u.role === "ADMIN" ? "👑 Admin" : "🛍️ Khách hàng";
    $("#profileRoleBadge").style.background = u.role === "ADMIN" ? "#fef3c7" : "#e8f7f4";
    $("#profileRoleBadge").style.color = u.role === "ADMIN" ? "#b45309" : "var(--primary-dark)";
    const infoItems = [
        ["Username", u.username],
        ["SĐT", u.phone || "Chưa cập nhật"],
        ["Địa chỉ", u.address || "Chưa cập nhật"],
    ];
    $("#profileInfoList").innerHTML = infoItems.map(([label, value]) =>
        `<div class="profile-info-item"><span>${label}</span><span>${value}</span></div>`).join("");
    const form = $("#profileForm");
    form.fullName.value = valueOf(u, "fullName") || "";
    form.email.value = u.email || "";
    form.phone.value = u.phone || "";
    form.address.value = u.address || "";
    form.avatarUrl.value = valueOf(u, "avatarUrl") || "";
    syncAuthUi();
    await loadRankCard();
}

async function loadAdmin() {
    requireAdmin();
    const dashboard = await api("/api/admin/dashboard");
    $("#adminStats").innerHTML = [
        ["Sản phẩm", dashboard.products],
        ["Đơn hàng", dashboard.orders],
        ["Khách hàng", dashboard.customers],
        ["Doanh thu", money(dashboard.revenue)]
    ].map(([label, value]) => `<div class="stat"><span class="muted">${label}</span><strong>${value}</strong></div>`).join("");
    await renderAdminTab(dashboard);
}

async function renderAdminTab(dashboard) {
    const panel = $("#adminPanel");
    if (state.adminTab === "products") {
        const products = await api("/api/products");
        panel.innerHTML = productForm() + table(["Tên", "Giá", "Kho", "Danh mục", ""], products.map(p => [
            p.name, money(p.price), p.stock, valueOf(p, "category_name", "categoryName") || "", `<button onclick="deleteAdmin('/api/admin/products/${p.id}')">Xóa</button>`
        ]));
        $("#productForm").onsubmit = submitProduct;
    }
    if (state.adminTab === "categories") {
        const cats = await api("/api/categories");
        panel.innerHTML = `
            <form id="categoryForm" class="admin-form"><input name="name" placeholder="Tên danh mục" required><input name="description" placeholder="Mô tả"><button class="primary">Thêm</button></form>
            ${table(["Tên", "Mô tả", ""], cats.map(c => [c.name, c.description || "", `<button onclick="deleteAdmin('/api/admin/categories/${c.id}')">Xóa</button>`]))}`;
        $("#categoryForm").onsubmit = submitCategory;
    }
    if (state.adminTab === "coupons") {
        const coupons = await api("/api/admin/coupons");
        panel.innerHTML = `
            <form id="couponForm" class="admin-form">
                <input name="code" placeholder="Code" required><input name="discountPercent" type="number" placeholder="% giảm" required>
                <input name="startDate" type="date"><input name="endDate" type="date"><button class="primary">Thêm</button>
            </form>
            ${table(["Code", "%", "Active", "Từ", "Đến", ""], coupons.map(c => [c.code, c.discount_percent, c.active, c.start_date || "", c.end_date || "", `<button onclick="deleteAdmin('/api/admin/coupons/${c.id}')">Xóa</button>`]))}`;
        $("#couponForm").onsubmit = submitCoupon;
    }
    if (state.adminTab === "orders") {
        const orders = await api("/api/admin/orders");
        panel.innerHTML = table(["Mã", "Khách", "Tổng", "Trạng thái", ""], orders.map(o => [
            `#${o.id}`, o.username, money(o.total_amount), o.status,
            `<select onchange="updateOrder(${o.id}, this.value)">
                ${["PENDING","CONFIRMED","SHIPPING","DELIVERED","CANCELLED"].map(s => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
            </select>`
        ]));
    }
    if (state.adminTab === "stock") {
        panel.innerHTML = table(["Mã", "Sản phẩm", "Tồn kho"], (dashboard.lowStock || []).map(p => [p.id, p.name, p.stock]));
    }
}

function productForm() {
    return `
        <form id="productForm" class="admin-form">
            <input name="name" placeholder="Tên sản phẩm" required>
            <input name="price" type="number" placeholder="Giá" required>
            <input name="stock" type="number" placeholder="Tồn kho" required>
            <select name="categoryId">${state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}</select>
            <input name="discountPercent" type="number" placeholder="% giảm" value="0">
            <div class="upload-field">
                <input name="imageUrl" id="productImageUrl" placeholder="URL ảnh sản phẩm">
                <label class="upload-btn">
                    📁 Tải lên
                    <input type="file" accept="image/*" onchange="uploadProductImage(this)" class="hidden">
                </label>
            </div>
            <label><input name="featured" type="checkbox"> Nổi bật</label>
            <textarea name="description" placeholder="Mô tả"></textarea>
            <button class="primary">Thêm sản phẩm</button>
        </form>`;
}

async function uploadProductImage(input) {
    const file = input.files[0];
    if (!file) return;
    try {
        toast("Đang tải ảnh lên...");
        const url = await uploadFile(file);
        document.getElementById("productImageUrl").value = url;
        toast("Ảnh đã sẵn sàng");
    } catch (err) {
        toast(err.message);
    }
}

function table(headers, rows) {
    return `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

async function submitProduct(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    await api("/api/admin/products", {
        method: "POST",
        body: JSON.stringify({
            name: form.get("name"),
            description: form.get("description"),
            price: Number(form.get("price")),
            stock: Number(form.get("stock")),
            imageUrl: form.get("imageUrl") || "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=900",
            categoryId: Number(form.get("categoryId")),
            featured: form.get("featured") === "on",
            discountPercent: Number(form.get("discountPercent") || 0)
        })
    });
    toast("Đã thêm sản phẩm");
    await loadAdmin();
}

async function submitCategory(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    await api("/api/admin/categories", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
    await loadBase();
    await loadAdmin();
}

async function submitCoupon(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    await api("/api/admin/coupons", {
        method: "POST",
        body: JSON.stringify({
            code: form.get("code"),
            discountPercent: Number(form.get("discountPercent")),
            active: true,
            startDate: form.get("startDate") || null,
            endDate: form.get("endDate") || null
        })
    });
    await loadAdmin();
}

async function deleteAdmin(path) {
    await api(path, { method: "DELETE" });
    toast("Đã xóa");
    await loadBase();
    await loadAdmin();
}

async function updateOrder(id, status) {
    await api(`/api/admin/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
    toast("Đã cập nhật đơn hàng");
    await loadAdmin();
}

function requireLogin() {
    if (!state.user) {
        $("#authDialog").showModal();
        throw new Error("Cần đăng nhập");
    }
}

function requireAdmin() {
    requireLogin();
    if (state.user.role !== "ADMIN") throw new Error("Cần quyền admin");
}

document.body.addEventListener("click", event => {
    const button = event.target.closest("[data-view]");
    if (button) show(button.dataset.view);
});

$("#authButton").onclick = () => {
    $("#authDialog").showModal();
};

$("#logoutButton").onclick = () => {
    localStorage.clear();
    state.token = null;
    state.user = null;
    state.selectedOrderId = null;
    syncAuthUi();
    show("home");
};

$("#closeAuth").onclick = () => $("#authDialog").close();
$("#switchAuth").onclick = () => {
    const register = $("#authTitle").textContent === "Đăng nhập";
    $("#authTitle").textContent = register ? "Đăng ký" : "Đăng nhập";
    $("#switchAuth").textContent = register ? "Tôi đã có tài khoản" : "Tạo tài khoản mới";
    document.querySelectorAll(".register-field").forEach(node => node.classList.toggle("hidden", !register));
};

$("#authForm").onsubmit = async event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const register = $("#authTitle").textContent === "Đăng ký";
    const payload = register ? {
        username: form.get("usernameOrEmail"),
        email: form.get("email"),
        password: form.get("password"),
        fullName: form.get("fullName"),
        phone: form.get("phone"),
        address: form.get("address")
    } : {
        usernameOrEmail: form.get("usernameOrEmail"),
        password: form.get("password")
    };
    const data = await api(register ? "/api/auth/register" : "/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("token", state.token);
    localStorage.setItem("user", JSON.stringify(state.user));
    $("#authDialog").close();
    syncAuthUi();
    toast("Đăng nhập thành công");
};

$("#profileForm").onsubmit = async event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target));
    state.user = await api("/api/auth/me", { method: "PUT", body: JSON.stringify(payload) });
    localStorage.setItem("user", JSON.stringify(state.user));
    await loadProfile();
    toast("Đã cập nhật hồ sơ");
};

$("#checkoutForm").onsubmit = async event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target));
    const order = await api("/api/orders", { method: "POST", body: JSON.stringify(payload) });
    state.selectedOrderId = order.id;
    toast("Đặt hàng thành công");
    event.target.reset();
    show("orders");
};

$("#reloadProducts").onclick = loadProducts;
$("#searchInput").addEventListener("input", () => loadProducts().catch(console.error));
$("#categoryFilter").addEventListener("change", () => loadProducts().catch(console.error));
document.querySelectorAll("[data-admin-tab]").forEach(button => {
    button.onclick = async () => {
        document.querySelectorAll("[data-admin-tab]").forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        state.adminTab = button.dataset.adminTab;
        await loadAdmin();
    };
});

window.addEventListener("error", event => {
    if (event.message !== "Cần đăng nhập") toast(event.message);
});

// ══════════════════════════════════════════════
//  REALTIME — WebSocket / STOMP
// ══════════════════════════════════════════════
let stompClient = null;
let wsRetryDelay = 3000;

function connectWebSocket() {
    const socket = new SockJS("/ws");
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // tắt log spam

    stompClient.connect({}, () => {
        // Kết nối thành công
        wsRetryDelay = 3000;
        setWsIndicator("connected");

        // ── Subscribe /topic/products ──
        stompClient.subscribe("/topic/products", msg => {
            const event = JSON.parse(msg.body);
            handleProductEvent(event);
        });

        // ── Subscribe /topic/categories ──
        stompClient.subscribe("/topic/categories", msg => {
            const event = JSON.parse(msg.body);
            handleCategoryEvent(event);
        });

        // ── Subscribe /topic/orders ──
        stompClient.subscribe("/topic/orders", msg => {
            const event = JSON.parse(msg.body);
            handleOrderEvent(event);
        });

        // ── Subscribe /topic/stock ──
        stompClient.subscribe("/topic/stock", () => {
            // Tồn kho thay đổi sau checkout — reload sản phẩm nếu đang xem
            if (!document.getElementById("productsView").classList.contains("hidden")) {
                loadProducts().catch(() => {});
            }
            if (!document.getElementById("homeView").classList.contains("hidden")) {
                loadHome().catch(() => {});
            }
        });

    }, () => {
        // Kết nối thất bại hoặc bị đứt → tự reconnect
        setWsIndicator("disconnected");
        setTimeout(connectWebSocket, wsRetryDelay);
        wsRetryDelay = Math.min(wsRetryDelay * 1.5, 30000);
    });
}

function setWsIndicator(status) {
    const dot = document.getElementById("wsIndicator");
    if (!dot) return;
    dot.className = "ws-dot ws-" + status;
    dot.title = status === "connected" ? "Realtime: đang kết nối" : "Realtime: mất kết nối";
}

// Xử lý sự kiện sản phẩm
function handleProductEvent(event) {
    const { action, payload } = event;
    const homeVisible   = !document.getElementById("homeView").classList.contains("hidden");
    const prodVisible   = !document.getElementById("productsView").classList.contains("hidden");
    const detailVisible = !document.getElementById("detailView").classList.contains("hidden");

    if (action === "deleted") {
        // Xóa card ngay lập tức trên cả home và products view
        document.querySelectorAll(`[data-product-id="${payload.id}"]`).forEach(el => {
            el.style.transition = "opacity .3s ease, transform .3s ease";
            el.style.opacity = "0";
            el.style.transform = "scale(.95)";
            setTimeout(() => el.remove(), 320);
        });
        // Nếu đang xem detail của sản phẩm bị xóa → về trang sản phẩm
        if (detailVisible) {
            const detailEl = document.getElementById("productDetail");
            if (detailEl && detailEl.querySelector(`[data-product-id="${payload.id}"]`)) {
                toast("Sản phẩm này đã bị xóa");
                show("products");
            }
        }
    } else if (action === "created" || action === "updated") {
        // Reload danh sách nếu đang xem
        if (homeVisible)  loadHome().catch(() => {});
        if (prodVisible)  loadProducts().catch(() => {});
    }
}

// Xử lý sự kiện danh mục
function handleCategoryEvent(event) {
    // Reload categories filter và các view liên quan
    loadBase().catch(() => {});
}

// Xử lý sự kiện đơn hàng
function handleOrderEvent(event) {
    const { action, payload } = event;
    const ordersVisible = !document.getElementById("ordersView").classList.contains("hidden");

    if (action === "status_updated" && ordersVisible) {
        // Cập nhật badge trạng thái trong danh sách đơn đang hiển thị
        const statusLabel = { PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", SHIPPING: "Đang giao", DELIVERED: "Đã nhận", CANCELLED: "Đã hủy" };
        const statusCls   = String(payload.status).toLowerCase();
        const label       = statusLabel[payload.status] || payload.status;

        // Cập nhật badge trong order-row list
        document.querySelectorAll(`.order-row[data-order-id="${payload.id}"] .badge`).forEach(badge => {
            badge.className = `badge status-${statusCls}`;
            badge.textContent = label;
        });

        // Nếu đang xem chi tiết đơn đó → cập nhật badge header + progress bar
        if (state.selectedOrderId === payload.id) {
            loadOrders().catch(() => {});
        }

        toast(`Đơn #${payload.id}: ${label}`);
    }

    if (action === "created" && ordersVisible && state.user?.role === "ADMIN") {
        // Admin đang xem orders → reload để thấy đơn mới
        loadOrders().catch(() => {});
        toast("Có đơn hàng mới!");
    }
}

// Khởi động kết nối WebSocket khi trang load
connectWebSocket();

// ── Scroll-reveal: IntersectionObserver cho .scroll-reveal ──
const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); revealObserver.unobserve(e.target); } });
}, { threshold: 0.12 });

document.querySelectorAll(".scroll-reveal").forEach(el => revealObserver.observe(el));

// ── Staggered product card entrance ──
function observeCards(container) {
    const cards = container.querySelectorAll(".product-card");
    cards.forEach((card, i) => {
        card.classList.add("card-animate");
        card.style.transitionDelay = `${i * 90}ms`;
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } });
        }, { threshold: 0.08 });
        obs.observe(card);
    });
}

// Patch loadHome để trigger stagger sau khi render
const _origLoadHome = loadHome;
window.loadHome = async function() {
    await _origLoadHome();
    observeCards(document.getElementById("featuredProducts"));
};

// Patch loadProducts
const _origLoadProducts = loadProducts;
window.loadProducts = async function() {
    await _origLoadProducts();
    observeCards(document.getElementById("productsGrid"));
};

// Avatar file picker cho profile
document.getElementById("avatarFileInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        toast("Đang tải ảnh lên...");
        const url = await uploadFile(file);
        // Hiển thị preview ngay
        $("#profileAvatarPreview").src = url;
        // Điền URL vào input để form submit
        document.getElementById("avatarUrlInput").value = url;
        toast("Ảnh đã tải lên, nhấn Lưu hồ sơ để cập nhật");
    } catch (err) {
        toast(err.message);
    }
});

// ============================================================
// HỆ THỐNG DANH HIỆU - RANK SYSTEM
// ============================================================

const RANKS = [
    {
        id: "shopper",
        name: "Shopper",
        subtitle: "Người qua đường",
        icon: "🛍️",
        desc: "Mới chân ướt chân ráo — mọi hành trình đều bắt đầu từ đây.",
        minSpent: 0,
        maxSpent: 500000,
        color: "#334155",
        cssClass: "rank-shopper"
    },
    {
        id: "shark",
        name: "Shark",
        subtitle: "Cá mập tập sự",
        icon: "🦈",
        desc: "Đã bắt đầu chi tiêu mạnh tay — bản năng thị trường đang thức tỉnh.",
        minSpent: 500000,
        maxSpent: 2000000,
        color: "#93c5fd",
        cssClass: "rank-shark"
    },
    {
        id: "angel",
        name: "Angel Investor",
        subtitle: "Nhà đầu tư thiên thần",
        icon: "👼",
        desc: "Chi tiêu hào phóng, tầm nhìn xa. Những deal tốt không bao giờ bỏ qua.",
        minSpent: 2000000,
        maxSpent: 5000000,
        color: "#c4b5fd",
        cssClass: "rank-angel"
    },
    {
        id: "unicorn",
        name: "Unicorn",
        subtitle: "Kỳ lân công nghệ",
        icon: "🦄",
        desc: "Hiếm có khó tìm. Danh hiệu lấp lánh dành cho những tâm hồn mua sắm đặc biệt.",
        minSpent: 5000000,
        maxSpent: 15000000,
        color: "#f0abfc",
        cssClass: "rank-unicorn"
    },
    {
        id: "tycoon",
        name: "Tycoon",
        subtitle: "Trùm tài phiệt",
        icon: "💰",
        desc: "Vàng chảy theo bước chân. Chỉ những tay chi tiêu đẳng cấp mới chạm tới đây.",
        minSpent: 15000000,
        maxSpent: 50000000,
        color: "#fbbf24",
        cssClass: "rank-tycoon"
    },
    {
        id: "monopoly",
        name: "Monopoly",
        subtitle: "Kẻ thao túng thị trường",
        icon: "👑",
        desc: "Đỉnh cao hoàng gia. Thị trường này — là của bạn.",
        minSpent: 50000000,
        maxSpent: Infinity,
        color: "#ef4444",
        cssClass: "rank-monopoly"
    }
];

function getRank(totalSpent) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (totalSpent >= RANKS[i].minSpent) return RANKS[i];
    }
    return RANKS[0];
}

function getRankProgress(totalSpent) {
    const rank = getRank(totalSpent);
    const idx = RANKS.indexOf(rank);
    if (idx === RANKS.length - 1) return { rank, pct: 100, spent: totalSpent, nextName: null, needed: 0 };
    const next = RANKS[idx + 1];
    const range = next.minSpent - rank.minSpent;
    const progress = totalSpent - rank.minSpent;
    const pct = Math.min(100, Math.round((progress / range) * 100));
    return { rank, pct, spent: totalSpent, nextName: next.name, needed: next.minSpent - totalSpent };
}

function renderGoldParticles() {
    const count = 18;
    let html = '<div class="rank-particles">';
    for (let i = 0; i < count; i++) {
        const left = Math.random() * 100;
        const dur  = (2.5 + Math.random() * 2.5).toFixed(2);
        const delay= (Math.random() * 3).toFixed(2);
        const drift= (Math.random() * 40 - 20).toFixed(0);
        const size = (3 + Math.random() * 4).toFixed(1);
        html += `<span class="gold-particle" style="
            left:${left}%;
            top:-6px;
            width:${size}px;
            height:${size}px;
            --dur:${dur}s;
            --delay:${delay}s;
            --sx:${(Math.random()*30-15).toFixed(0)}px;
            --drift:${drift}px;
        "></span>`;
    }
    html += '</div>';
    return html;
}

function renderRankCard(totalSpent) {
    const { rank, pct, nextName, needed } = getRankProgress(totalSpent);
    const isTycoon   = rank.id === "tycoon";
    const isMonopoly = rank.id === "monopoly";
    const isMaxRank  = rank.id === "monopoly";

    const xpLabel = isMaxRank
        ? "Đã đạt cấp tối đa"
        : `${pct}% → ${nextName}`;

    const nextHint = isMaxRank
        ? "Bạn đã chinh phục MiniShop."
        : `Còn ${money(needed)} để lên <strong>${nextName}</strong>`;

    const tierPips = RANKS.map((r, i) => {
        const current  = r.id === rank.id;
        const unlocked = totalSpent >= r.minSpent;
        return `<span class="rank-tier-pip ${current ? "current" : ""} ${unlocked && !current ? "unlocked" : ""}">
            ${r.icon} ${r.name}
        </span>`;
    }).join("");

    return `
    <div class="rank-card ${rank.cssClass}">
        ${isTycoon || isMonopoly ? renderGoldParticles() : ""}
        <div class="rank-badge-wrap">
            <span class="rank-icon">${rank.icon}</span>
            <span class="rank-title-label">${rank.id.toUpperCase()}</span>
        </div>
        <div class="rank-middle">
            <h3 class="rank-name">${rank.name} <span style="font-size:14px;font-weight:600;opacity:.6">· ${rank.subtitle}</span></h3>
            <p class="rank-desc">${rank.desc}</p>
            <div class="rank-xp-row">
                <span class="rank-xp-label">${xpLabel}</span>
                <div class="rank-xp-bar-wrap">
                    <div class="rank-xp-bar" id="rankXpBar" style="width:0%"></div>
                </div>
                <span class="rank-xp-pct">${pct}%</span>
            </div>
            <span class="rank-next-hint">${nextHint}</span>
            <div class="rank-all-tiers">${tierPips}</div>
        </div>
        <div class="rank-spent-wrap">
            <span class="rank-spent-value">${money(totalSpent)}</span>
            <span class="rank-spent-label">Tổng chi tiêu</span>
        </div>
    </div>`;
}

// Hook vào loadProfile để load rank card cùng lúc
async function loadRankCard() {
    const rankCardEl = document.getElementById("rankCard");
    if (!rankCardEl || !state.user) return;
    try {
        const orders = await api("/api/orders");
        const totalSpent = orders
            .filter(o => String(o.status) === "DELIVERED")
            .reduce((sum, o) => sum + Number(valueOf(o, "total_amount", "totalAmount") || 0), 0);
        rankCardEl.innerHTML = renderRankCard(totalSpent);
        rankCardEl.classList.remove("hidden");
        requestAnimationFrame(() => {
            setTimeout(() => {
                const bar = document.getElementById("rankXpBar");
                if (bar) {
                    const { pct } = getRankProgress(totalSpent);
                    bar.style.width = pct + "%";
                }
            }, 120);
        });
    } catch (e) {
        rankCardEl.classList.add("hidden");
    }
}

loadBase().catch(error => toast(error.message));
