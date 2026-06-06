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

    const tabTitles = { products: "Sản phẩm", categories: "Danh mục", coupons: "Coupon", orders: "Đơn hàng", users: "Người dùng", stock: "Tồn kho thấp" };
    const titleEl = document.getElementById("adminTabTitle");
    if (titleEl) titleEl.textContent = tabTitles[state.adminTab] || "Dashboard";

    $("#adminStats").innerHTML = [
        ["📦", "Sản phẩm", dashboard.products, "#0f766e"],
        ["🛒", "Đơn hàng", dashboard.orders, "#2563eb"],
        ["👥", "Khách hàng", dashboard.customers, "#7c3aed"],
        ["💰", "Doanh thu", money(dashboard.revenue), "#d97706"]
    ].map(([icon, label, value, color]) => `
        <div class="admin-stat-card">
            <div class="admin-stat-icon" style="background:${color}18;color:${color}">${icon}</div>
            <div>
                <p class="admin-stat-label">${label}</p>
                <strong class="admin-stat-value">${value}</strong>
            </div>
        </div>`).join("");

    await renderAdminTab(dashboard);
}

async function renderAdminTab(dashboard) {
    const panel = $("#adminPanel");
    panel.innerHTML = `<div style="padding:20px;color:var(--muted)">Đang tải...</div>`;

    if (state.adminTab === "products") {
        const products = await api("/api/products");
        panel.innerHTML = `
            <div class="admin-form-card">
                <h3>➕ Thêm sản phẩm mới</h3>
                ${productForm()}
            </div>` +
            table(
                ["Ảnh", "Tên", "Giá", "Kho", "Danh mục", "Nổi bật", "Thao tác"],
                products.map(p => [
                    `<img src="${valueOf(p,"image_url","imageUrl")||""}" style="width:52px;height:44px;object-fit:cover;border-radius:6px;background:#e5e7eb">`,
                    `<strong>${p.name}</strong>`,
                    money(p.price),
                    p.stock,
                    valueOf(p, "category_name", "categoryName") || "—",
                    valueOf(p, "featured") ? `<span style="color:#16a34a;font-weight:700">✓</span>` : `<span style="color:#d1d5db">—</span>`,
                    `<div style="display:flex;gap:6px">
                        <button onclick="openEditProduct(${p.id})" style="background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8">Sửa</button>
                        <button onclick="deleteAdmin('/api/admin/products/${p.id}')" style="background:#fef2f2;border-color:#fecaca;color:#b42318">Xóa</button>
                    </div>`
                ])
            );
        document.getElementById("productForm").onsubmit = submitProduct;
    }
    if (state.adminTab === "categories") {
        const cats = await api("/api/categories");
        panel.innerHTML = `
            <div class="admin-form-card">
                <h3>➕ Thêm danh mục</h3>
                <form id="categoryForm" class="admin-form" style="margin:0;border:none;box-shadow:none;padding:0;background:transparent">
                    <input name="name" placeholder="Tên danh mục" required>
                    <input name="description" placeholder="Mô tả">
                    <button class="primary">Thêm</button>
                </form>
            </div>
            ${table(["Tên", "Mô tả", "Thao tác"], cats.map(c => [
                `<strong>${c.name}</strong>`,
                c.description || `<span class="muted">—</span>`,
                `<div style="display:flex;gap:6px">
                    <button onclick="openEditCategory(${c.id},'${encodeURIComponent(c.name)}','${encodeURIComponent(c.description||'')}' )" style="background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8">Sửa</button>
                    <button onclick="deleteAdmin('/api/admin/categories/${c.id}')" style="background:#fef2f2;border-color:#fecaca;color:#b42318">Xóa</button>
                </div>`
            ]))}`;
        document.getElementById("categoryForm").onsubmit = submitCategory;
    }
    if (state.adminTab === "coupons") {
        const coupons = await api("/api/admin/coupons");
        const fmtDate = d => d ? new Date(d).toLocaleDateString("vi-VN") : "—";
        panel.innerHTML = `
            <div class="admin-form-card">
                <h3>➕ Thêm mã giảm giá</h3>
                <form id="couponForm" class="admin-form" style="margin:0;border:none;box-shadow:none;padding:0;background:transparent">
                    <input name="code" placeholder="Mã code (VD: SALE20)" required>
                    <input name="discountPercent" type="number" min="1" max="100" placeholder="% giảm" required>
                    <label style="font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:3px">Ngày bắt đầu<input name="startDate" type="date" style="margin:0"></label>
                    <label style="font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:3px">Ngày kết thúc<input name="endDate" type="date" style="margin:0"></label>
                    <button class="primary">Thêm</button>
                </form>
            </div>
            ${table(["Code", "% Giảm", "Trạng thái", "Từ ngày", "Đến ngày", "Thao tác"], coupons.map(c => [
                `<strong style="font-family:monospace;font-size:14px">${c.code}</strong>`,
                `<span style="font-weight:800;color:var(--primary-dark)">${c.discount_percent}%</span>`,
                c.active
                    ? `<span class="badge" style="background:#ecfdf3;color:#027a48">✓ Đang bật</span>`
                    : `<span class="badge" style="background:#f3f4f6;color:#6b7280">✗ Tắt</span>`,
                fmtDate(c.start_date),
                fmtDate(c.end_date),
                `<div style="display:flex;gap:6px;flex-wrap:wrap">
                    <button onclick="openEditCoupon(${c.id})" style="background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8">Sửa</button>
                    <button onclick="toggleCoupon(${c.id},${c.active})" style="background:${c.active?'#fff7ed':'#ecfdf3'};border-color:${c.active?'#fed7aa':'#bbf7d0'};color:${c.active?'#b45309':'#027a48'}">${c.active ? 'Tắt' : 'Bật'}</button>
                    <button onclick="deleteAdmin('/api/admin/coupons/${c.id}')" style="background:#fef2f2;border-color:#fecaca;color:#b42318">Xóa</button>
                </div>`
            ]))}`;
        document.getElementById("couponForm").onsubmit = submitCoupon;
    }
    if (state.adminTab === "orders") {
        const orders = await api("/api/admin/orders");
        const statusLabel = { PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", SHIPPING: "Đang giao", DELIVERED: "Đã nhận", CANCELLED: "Đã hủy" };
        const statusOpts = [
            ["PENDING",   "Chờ xác nhận"],
            ["CONFIRMED", "Đã xác nhận"],
            ["SHIPPING",  "Đang giao"],
            ["DELIVERED", "Đã nhận hàng"],
            ["CANCELLED", "Đã hủy"]
        ];
        panel.innerHTML = table(["Mã", "Khách", "Tổng", "Trạng thái", "Cập nhật"], orders.map(o => [
            `#${o.id}`, o.username, money(o.total_amount),
            `<span class="badge status-${String(o.status).toLowerCase()}">${statusLabel[o.status] || o.status}</span>`,
            `<select onchange="updateOrder(${o.id}, this.value)">
                ${statusOpts.map(([val, label]) => `<option value="${val}" ${val === o.status ? "selected" : ""}>${label}</option>`).join("")}
            </select>`
        ]));
    }
    if (state.adminTab === "users") {
        try {
            const users = await api("/api/admin/users");
            if (!users || users.length === 0) {
                panel.innerHTML = `<div style="padding:32px;text-align:center;color:var(--muted)">Chưa có người dùng nào.</div>`;
                return;
            }
            panel.innerHTML = table(
                ["ID", "Avatar", "Username", "Họ tên", "Email", "SĐT", "Vai trò", "Thao tác"],
                users.map(u => [
                    u.id,
                    `<img src="${u.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(u.username)}`}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;background:#e5e7eb">`,
                    `<strong>${u.username}</strong>`,
                    u.full_name || u.fullName || "—",
                    u.email,
                    u.phone || "—",
                    `<span class="badge ${u.role === "ADMIN" ? "badge-admin" : ""}">${u.role === "ADMIN" ? "👑 Admin" : "🛍️ Khách hàng"}</span>`,
                    u.role !== "ADMIN"
                        ? `<div style="display:flex;gap:6px">
                            <button onclick="openUserDetail(${u.id})" style="background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8">Chi tiết</button>
                            <button onclick="deleteAdmin('/api/admin/users/${u.id}')" style="background:#fef2f2;border-color:#fecaca;color:#b42318">Xóa</button>
                           </div>`
                        : `<button onclick="openUserDetail(${u.id})" style="background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8">Chi tiết</button>`
                ])
            );
        } catch (err) {
            panel.innerHTML = `<div style="padding:24px;background:#fef2f2;border-radius:8px;color:#b42318;border:1px solid #fecaca">
                <strong>Lỗi tải danh sách người dùng:</strong> ${err.message}<br>
                <small style="color:var(--muted);margin-top:6px;display:block">Hãy restart server để áp dụng API mới.</small>
            </div>`;
        }
    }
    if (state.adminTab === "stock") {
        panel.innerHTML = table(["Mã", "Sản phẩm", "Tồn kho"], (dashboard.lowStock || []).map(p => [p.id, p.name, p.stock]));
    }
}

function productForm() {
    return `
        <form id="productForm" class="admin-form">
            <input name="name" placeholder="Tên sản phẩm" required>
            <input name="price" type="number" min="0" placeholder="Giá (VNĐ)" required>
            <input name="stock" type="number" min="0" placeholder="Tồn kho" required>
            <select name="categoryId">${state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}</select>
            <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--muted)">
                % Giảm giá
                <input name="discountPercent" type="number" min="0" max="100" value="0" style="margin:0">
            </label>
            <div class="upload-field">
                <input name="imageUrl" id="productImageUrl" placeholder="URL ảnh sản phẩm">
                <label class="upload-btn">
                    📁 Tải lên
                    <input type="file" accept="image/*" onchange="uploadProductImage(this)" class="hidden">
                </label>
            </div>
            <label style="display:flex;align-items:center;gap:6px"><input name="featured" type="checkbox"> Nổi bật</label>
            <textarea name="description" placeholder="Mô tả" style="grid-column:span 2"></textarea>
            <button class="primary" style="grid-column:span 4">Thêm sản phẩm</button>
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

async function openEditProduct(id) {
    const p = await api(`/api/products/${id}`);
    // Xóa modal cũ nếu có
    document.getElementById("editProductModal")?.remove();

    const modal = document.createElement("dialog");
    modal.id = "editProductModal";
    modal.style.cssText = "width:min(640px,calc(100vw - 24px));border:1px solid var(--line);border-radius:12px;padding:0;box-shadow:var(--shadow)";
    modal.innerHTML = `
        <form id="editProductForm" class="form dialog-form" style="padding:20px;display:grid;gap:12px">
            <div class="section-head" style="margin-bottom:4px">
                <h3 style="margin:0">Sửa sản phẩm #${p.id}</h3>
                <button type="button" onclick="document.getElementById('editProductModal').close()">✕</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                <input name="name" placeholder="Tên sản phẩm" value="${p.name || ""}" required>
                <input name="price" type="number" min="0" placeholder="Giá" value="${p.price || 0}" required>
                <input name="stock" type="number" min="0" placeholder="Tồn kho" value="${p.stock || 0}" required>
                <select name="categoryId">
                    ${state.categories.map(c => `<option value="${c.id}" ${c.id == valueOf(p,"category_id","categoryId") ? "selected" : ""}>${c.name}</option>`).join("")}
                </select>
                <input name="discountPercent" type="number" min="0" max="100" placeholder="% giảm (0-100)" value="${valueOf(p,"discount_percent","discountPercent") || 0}">
                <label style="display:flex;align-items:center;gap:8px;font-size:14px">
                    <input name="featured" type="checkbox" ${p.featured ? "checked" : ""}> Nổi bật
                </label>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
                <img id="editImgPreview" src="${valueOf(p,"image_url","imageUrl")||""}"
                     style="width:64px;height:56px;object-fit:cover;border-radius:8px;background:#e5e7eb;flex-shrink:0">
                <div class="upload-field" style="flex:1">
                    <input name="imageUrl" id="editProductImageUrl" placeholder="URL ảnh" value="${valueOf(p,"image_url","imageUrl")||""}">
                    <label class="upload-btn">
                        📁 Tải lên
                        <input type="file" accept="image/*" onchange="uploadEditProductImage(this)" class="hidden">
                    </label>
                </div>
            </div>
            <textarea name="description" placeholder="Mô tả" rows="3">${p.description || ""}</textarea>
            <div style="display:flex;gap:10px;justify-content:flex-end">
                <button type="button" onclick="document.getElementById('editProductModal').close()">Hủy</button>
                <button type="submit" class="primary">Lưu thay đổi</button>
            </div>
        </form>`;
    document.body.appendChild(modal);
    modal.showModal();
    document.getElementById("editProductForm").onsubmit = async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        await api(`/api/admin/products/${id}`, {
            method: "PUT",
            body: JSON.stringify({
                name: form.get("name"),
                description: form.get("description"),
                price: Number(form.get("price")),
                stock: Number(form.get("stock")),
                imageUrl: form.get("imageUrl") || valueOf(p,"image_url","imageUrl") || "",
                categoryId: Number(form.get("categoryId")),
                featured: form.get("featured") === "on",
                discountPercent: Math.min(100, Math.max(0, Number(form.get("discountPercent") || 0)))
            })
        });
        modal.close();
        toast("Đã cập nhật sản phẩm");
        await loadAdmin();
    };
}

async function uploadEditProductImage(input) {
    const file = input.files[0];
    if (!file) return;
    try {
        toast("Đang tải ảnh...");
        const url = await uploadFile(file);
        document.getElementById("editProductImageUrl").value = url;
        document.getElementById("editImgPreview").src = url;
        toast("Ảnh đã sẵn sàng");
    } catch (err) {
        toast(err.message);
    }
}

// ── Modal sửa danh mục ──
function openEditCategory(id, encodedName, encodedDesc) {
    const name = decodeURIComponent(encodedName);
    const desc = decodeURIComponent(encodedDesc);
    document.getElementById("editCategoryModal")?.remove();
    const modal = document.createElement("dialog");
    modal.id = "editCategoryModal";
    modal.style.cssText = "width:min(440px,calc(100vw - 24px));border:1px solid var(--line);border-radius:12px;padding:0;box-shadow:var(--shadow)";
    modal.innerHTML = `
        <form id="editCategoryForm" class="form dialog-form" style="padding:20px;display:grid;gap:12px">
            <div class="section-head" style="margin-bottom:4px">
                <h3 style="margin:0">Sửa danh mục</h3>
                <button type="button" onclick="document.getElementById('editCategoryModal').close()">✕</button>
            </div>
            <input name="name" placeholder="Tên danh mục" value="${name}" required>
            <input name="description" placeholder="Mô tả" value="${desc}">
            <div style="display:flex;gap:10px;justify-content:flex-end">
                <button type="button" onclick="document.getElementById('editCategoryModal').close()">Hủy</button>
                <button type="submit" class="primary">Lưu</button>
            </div>
        </form>`;
    document.body.appendChild(modal);
    modal.showModal();
    document.getElementById("editCategoryForm").onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await api(`/api/admin/categories/${id}`, { method: "PUT", body: JSON.stringify(Object.fromEntries(fd)) });
        modal.close();
        toast("Đã cập nhật danh mục");
        await loadBase();
        await loadAdmin();
    };
}

// ── Modal sửa coupon ──
async function openEditCoupon(id) {
    const coupons = await api("/api/admin/coupons");
    const c = coupons.find(x => x.id === id);
    if (!c) return;
    const toInput = d => d ? new Date(d).toISOString().split("T")[0] : "";
    document.getElementById("editCouponModal")?.remove();
    const modal = document.createElement("dialog");
    modal.id = "editCouponModal";
    modal.style.cssText = "width:min(500px,calc(100vw - 24px));border:1px solid var(--line);border-radius:12px;padding:0;box-shadow:var(--shadow)";
    modal.innerHTML = `
        <form id="editCouponForm" class="form dialog-form" style="padding:20px;display:grid;gap:12px">
            <div class="section-head" style="margin-bottom:4px">
                <h3 style="margin:0">Sửa coupon</h3>
                <button type="button" onclick="document.getElementById('editCouponModal').close()">✕</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                <input name="code" placeholder="Mã code" value="${c.code}" required>
                <input name="discountPercent" type="number" min="1" max="100" placeholder="% giảm" value="${c.discount_percent}" required>
                <label style="font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:3px">
                    Ngày bắt đầu<input name="startDate" type="date" value="${toInput(c.start_date)}" style="margin:0">
                </label>
                <label style="font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:3px">
                    Ngày kết thúc<input name="endDate" type="date" value="${toInput(c.end_date)}" style="margin:0">
                </label>
            </div>
            <label style="display:flex;align-items:center;gap:8px;font-size:14px">
                <input name="active" type="checkbox" ${c.active ? "checked" : ""}> Kích hoạt coupon
            </label>
            <div style="display:flex;gap:10px;justify-content:flex-end">
                <button type="button" onclick="document.getElementById('editCouponModal').close()">Hủy</button>
                <button type="submit" class="primary">Lưu thay đổi</button>
            </div>
        </form>`;
    document.body.appendChild(modal);
    modal.showModal();
    document.getElementById("editCouponForm").onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await api(`/api/admin/coupons/${id}`, {
            method: "PUT",
            body: JSON.stringify({
                code: fd.get("code"),
                discountPercent: Number(fd.get("discountPercent")),
                active: fd.get("active") === "on",
                startDate: fd.get("startDate") || null,
                endDate: fd.get("endDate") || null
            })
        });
        modal.close();
        toast("Đã cập nhật coupon");
        await loadAdmin();
    };
}

async function toggleCoupon(id, currentActive) {
    const coupons = await api("/api/admin/coupons");
    const c = coupons.find(x => x.id === id);
    if (!c) return;
    const toInput = d => d ? new Date(d).toISOString().split("T")[0] : null;
    await api(`/api/admin/coupons/${id}`, {
        method: "PUT",
        body: JSON.stringify({
            code: c.code, discountPercent: c.discount_percent,
            active: !currentActive,
            startDate: toInput(c.start_date), endDate: toInput(c.end_date)
        })
    });
    toast(currentActive ? "Đã tắt coupon" : "Đã bật coupon");
    await loadAdmin();
}

// ── Modal chi tiết người dùng ──
async function openUserDetail(userId) {
    let users, orders;
    try {
        [users, orders] = await Promise.all([api("/api/admin/users"), api("/api/admin/orders")]);
    } catch (e) { toast(e.message); return; }
    const u = users.find(x => x.id === userId);
    if (!u) return;
    const userOrders = orders.filter(o => (o.user_id || o.userId) === userId);
    const totalSpent = userOrders.filter(o => String(o.status) === "DELIVERED")
        .reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const { rank, pct, nextName, needed } = getRankProgress(totalSpent);
    document.getElementById("userDetailModal")?.remove();
    const modal = document.createElement("dialog");
    modal.id = "userDetailModal";
    modal.style.cssText = "width:min(520px,calc(100vw - 24px));border:1px solid var(--line);border-radius:16px;padding:0;box-shadow:var(--shadow)";
    const avatarSrc = u.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(u.username)}`;
    const rankNextHint = nextName ? `Cần thêm ${money(needed)} để lên <strong>${nextName}</strong>` : "Đã đạt cấp tối đa";
    modal.innerHTML = `
        <div style="padding:24px;display:grid;gap:20px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div style="display:flex;align-items:center;gap:16px">
                    <img src="${avatarSrc}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid var(--line)">
                    <div>
                        <h3 style="margin:0;font-size:20px">${u.full_name || u.fullName || u.username}</h3>
                        <p style="margin:2px 0 0;color:var(--muted);font-size:13px">@${u.username} · ${u.email}</p>
                        <span class="badge ${u.role === "ADMIN" ? "badge-admin" : ""}" style="margin-top:6px;display:inline-flex">${u.role === "ADMIN" ? "👑 Admin" : "🛍️ Khách hàng"}</span>
                    </div>
                </div>
                <button type="button" onclick="document.getElementById('userDetailModal').close()" style="min-height:32px;padding:4px 12px">✕</button>
            </div>
            <div class="rank-card ${rank.cssClass}" style="grid-template-columns:auto 1fr;gap:16px;padding:20px 24px">
                <div class="rank-badge-wrap" style="min-width:70px">
                    <span class="rank-icon" style="font-size:40px">${rank.icon}</span>
                    <span class="rank-title-label">${rank.id.toUpperCase()}</span>
                </div>
                <div class="rank-middle" style="gap:8px">
                    <h3 class="rank-name" style="font-size:18px">${rank.name} <span style="font-size:13px;font-weight:500;opacity:.6">· ${rank.subtitle}</span></h3>
                    <div class="rank-xp-row">
                        <div class="rank-xp-bar-wrap" style="flex:1"><div class="rank-xp-bar" style="width:${pct}%"></div></div>
                        <span class="rank-xp-pct">${pct}%</span>
                    </div>
                    <span class="rank-next-hint" style="font-size:12px">${rankNextHint}</span>
                    <div style="display:flex;align-items:baseline;gap:6px;margin-top:2px">
                        <strong style="font-size:17px">${money(totalSpent)}</strong>
                        <span style="font-size:11px;opacity:.5;text-transform:uppercase;letter-spacing:.06em">Tổng chi tiêu</span>
                    </div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                ${[["SĐT", u.phone||"Chưa cập nhật"],["Địa chỉ", u.address||"Chưa cập nhật"],
                   ["Tổng đơn", userOrders.length+" đơn"],["Đã nhận", userOrders.filter(o=>o.status==="DELIVERED").length+" đơn"]
                  ].map(([l,v])=>`<div style="background:#f8fafc;border-radius:8px;padding:12px 14px;border:1px solid var(--line)">
                    <p style="margin:0;font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.06em">${l}</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600">${v}</p></div>`).join("")}
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.showModal();
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
// Admin nav — event delegation để tránh stale closure
document.getElementById("adminView").addEventListener("click", async e => {
    const btn = e.target.closest("[data-admin-tab]");
    if (!btn) return;
    document.querySelectorAll("[data-admin-tab]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.adminTab = btn.dataset.adminTab;
    await loadAdmin();
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
    const isMaxRank  = rank.id === "monopoly";

    const xpLabel = isMaxRank
        ? "Đã đạt cấp tối đa"
        : `${pct}% → ${nextName}`;

    const nextHint = isMaxRank
        ? "Bạn đã chinh phục MiniShop."
        : `Còn ${money(needed)} để lên <strong>${nextName}</strong>`;

    const tierPips = RANKS.map(r => {
        const current  = r.id === rank.id;
        const unlocked = totalSpent >= r.minSpent;
        return `<span class="rank-tier-pip ${current ? "current" : ""} ${unlocked && !current ? "unlocked" : ""}">
            ${r.icon} ${r.name}
        </span>`;
    }).join("");

    // Trả về nội dung, wrapper div sẽ nhận class từ loadRankCard
    return {
        cssClass: rank.cssClass,
        html: `
        ${isTycoon || rank.id === "monopoly" ? renderGoldParticles() : ""}
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
        </div>`
    };
}

// Hook vào loadProfile để load rank card cùng lúc
async function loadRankCard() {
    const rankCardEl = document.getElementById("rankCard");
    if (!rankCardEl || !state.user) return;

    let totalSpent = 0;
    try {
        const orders = await api("/api/orders");
        totalSpent = orders
            .filter(o => String(o.status) === "DELIVERED")
            .reduce((sum, o) => sum + Number(valueOf(o, "total_amount", "totalAmount") || 0), 0);
    } catch (_) {
        // Chưa có đơn hoặc lỗi → giữ 0, vẫn hiện Shopper
    }

    const { cssClass, html } = renderRankCard(totalSpent);

    // Reset classes, áp đúng tier class
    rankCardEl.className = "rank-card " + cssClass;
    rankCardEl.innerHTML = html;

    // Animate XP bar
    requestAnimationFrame(() => {
        setTimeout(() => {
            const bar = document.getElementById("rankXpBar");
            if (bar) bar.style.width = getRankProgress(totalSpent).pct + "%";
        }, 100);
    });
}

loadBase().catch(error => toast(error.message));
