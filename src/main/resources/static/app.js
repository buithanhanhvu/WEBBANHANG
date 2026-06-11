const state = {
    token: localStorage.getItem("token"),
    user: (() => { try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; } })(),
    products: [],
    categories: [],
    adminTab: "dashboard",
    selectedOrderId: null
};

const money = value => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value || 0));
const $ = selector => document.querySelector(selector);
const valueOf = (obj, ...keys) => keys.map(key => obj?.[key]).find(value => value !== undefined && value !== null);
const avatarFor = user => valueOf(user, "avatarUrl", "avatar_url") || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(valueOf(user, "fullName", "username") || "MiniShop")}`;
const formatDate = value => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "";

// XSS prevention — escape tất cả user content trước khi render vào innerHTML
const esc = str => String(str ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");

// Debounce helper
function debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const response = await fetch(path, { ...options, headers });
    const body = await response.json();
    if (!response.ok || !body.success) {
        if (state.user && (response.status === 401 || (body.message && (body.message.includes("không tồn tại") || body.message.includes("bị khóa") || body.message.includes("bị xóa"))))) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            state.token = null;
            state.user = null;
            state.selectedOrderId = null;
            syncAuthUi();
            show("home");
            alert(body.message || "Tài khoản của bạn đã bị khóa hoặc bị xóa. Vui lòng đăng nhập lại.");
            throw new Error("SESSION_EXPIRED");
        }
        throw new Error(body.message || "Có lỗi xảy ra");
    }
    return body.data;
}

function toast(message) {
    const node = $("#toast");
    node.textContent = message;
    node.classList.add("show");
    setTimeout(() => node.classList.remove("show"), 2600);
}

function show(view) {
    const target = document.getElementById(`${view}View`);
    document.querySelectorAll(".view").forEach(node => node.classList.add("hidden"));
    if (!target) {
        const notFound = document.getElementById("notFoundView");
        if (notFound) {
            notFound.classList.remove("hidden");
        }
        return;
    }
    target.classList.remove("hidden");
    if (view === "products") loadProducts();
    if (view === "cart") loadCart();
    if (view === "wishlist") loadWishlist();
    if (view === "orders") loadOrders();
    if (view === "vouchers") loadVouchers();
    if (view === "userStats") loadUserStats();
    if (view === "reviews") loadReviews();
    if (view === "profile") loadProfile();
    if (view === "admin") { state.adminPage = 1; loadAdmin(); }
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
        profileBtn.innerHTML = `<img class="topbar-avatar" src="${esc(avatarFor(state.user))}" alt=""> ${esc(valueOf(state.user, "fullName", "username") || "Tài khoản")}`;
        loadWishlistNotifications().catch(() => {});
    } else {
        const badge = document.getElementById("notifCount");
        if (badge) badge.style.display = "none";
    }
}

async function loadBase() {
    state.categories = await api("/api/categories");
    try {
        const dbRanks = await api("/api/ranks");
        if (dbRanks && dbRanks.length > 0) {
            RANKS = dbRanks.map(r => ({
                id: r.id,
                name: r.name,
                subtitle: r.subtitle,
                icon: r.icon,
                desc: r.description,
                minSpent: Number(r.min_spent || 0),
                color: r.color,
                cssClass: r.css_class
            }));
        }
    } catch (_) {}
    $("#categoryFilter").innerHTML = `<option value="">Tất cả danh mục</option>` +
        state.categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
    await loadProducts();
    await loadHome();
    syncAuthUi();
    updateCartBadge();
    initGoogleSignIn();
}

async function loadHome() {
    const featured = await api("/api/products?featured=true");
    $("#featuredProducts").innerHTML = featured.map(productCard).join("");
    updateWishlistButtons().catch(() => {});
}

async function loadProducts() {
    const query = new URLSearchParams();
    const search    = $("#searchInput").value.trim();
    const categoryId = $("#categoryFilter").value;
    const minPrice  = document.getElementById("filterMinPrice")?.value.trim();
    const maxPrice  = document.getElementById("filterMaxPrice")?.value.trim();
    const minRating = document.getElementById("filterMinRating")?.value;
    const sortBy    = document.getElementById("filterSort")?.value || "newest";
    if (search)     query.set("search", search);
    if (categoryId) query.set("categoryId", categoryId);
    if (minPrice)   query.set("minPrice", minPrice);
    if (maxPrice)   query.set("maxPrice", maxPrice);
    if (minRating)  query.set("minRating", minRating);
    if (sortBy)     query.set("sortBy", sortBy);
    state.products = await api(`/api/products?${query.toString()}`);
    $("#productsGrid").innerHTML = state.products.map(productCard).join("") || `
        <div class="empty-state">
            <div class="empty-icon" style="font-size:48px">🔍</div>
            <p>Không tìm thấy sản phẩm phù hợp.</p>
            <button class="cta-ghost" onclick="document.getElementById('clearFilters')?.click()">Xóa bộ lọc</button>
        </div>`;
    updateWishlistButtons().catch(() => {});
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
                <img src="${esc(valueOf(p, "image_url", "imageUrl") || "")}" alt="${esc(p.name)}">
                ${state.user ? `<button class="wishlist-btn" data-product-id="${p.id}" onclick="toggleWishlist(${p.id}, event)">🤍</button>` : ""}
                ${outOfStock ? `<div class="oos-overlay"><span>Hết hàng</span></div>` : ""}
                ${sale && !outOfStock ? `<span class="sale-badge">-${sale}%</span>` : ""}
            </div>
            <div class="product-body">
                <span class="badge">${esc(valueOf(p, "category_name", "categoryName") || "Sản phẩm")}</span>
                <h3>${esc(p.name)}</h3>
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
                    <button class="primary${outOfStock ? " disabled-btn" : ""}"
                        data-cart-btn="${p.id}"
                        ${outOfStock ? "disabled" : `onclick="addCart(${p.id})"`}>
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
    const [p, reviews, history] = await Promise.all([
        api(`/api/products/${id}`),
        api(`/api/products/${id}/reviews`),
        api(`/api/products/${id}/price-history`).catch(() => [])
    ]);
    const sale = Number(valueOf(p, "discount_percent", "discountPercent") || 0);
    const finalPrice = Number(p.price) * (100 - sale) / 100;
    const outOfStock = Number(p.stock) === 0;
    const rating = Number(valueOf(p, "average_rating", "averageRating") || 0);
    const reviewCount = Number(valueOf(p, "review_count", "reviewCount") || 0);

    // Kiểm tra user đã mua sản phẩm này chưa (để hiện form đánh giá)
    const userReview = state.user ? reviews.find(r => r.username === state.user.username) : null;

    let historyHtml = "";
    if (history && history.length > 0) {
        historyHtml = `
            <div class="price-history-wrap">
                <h4 class="price-history-title">📈 Lịch sử thay đổi giá</h4>
                <div class="price-history-list">
                    ${history.map(h => {
                        const oldP = Number(h.old_price || h.oldPrice || 0);
                        const newP = Number(h.new_price || h.newPrice || 0);
                        const drop = newP < oldP;
                        const label = drop ? "Giảm giá" : "Tăng giá";
                        const cls = drop ? "price-history-price-drop" : "price-history-price-up";
                        return `
                            <div class="price-history-item">
                                <div>
                                    <span class="price-history-time">${formatDate(valueOf(h, "changed_at", "changedAt"))}</span>
                                    <span style="margin-left: 8px; font-weight: 600;">${label}</span>
                                </div>
                                <div>
                                    <span class="muted">${money(oldP)}</span> → 
                                    <strong class="${cls}">${money(newP)}</strong>
                                </div>
                            </div>`;
                    }).join("")}
                </div>
            </div>`;
    }

    $("#productDetail").innerHTML = `
        <div class="split detail-layout">
            <div class="detail-img-wrap${outOfStock ? " out-of-stock" : ""}">
                <img class="detail-image" src="${esc(valueOf(p, "image_url", "imageUrl"))}" alt="${esc(p.name)}">
                ${state.user ? `<button class="wishlist-btn" data-product-id="${p.id}" onclick="toggleWishlist(${p.id}, event)">🤍</button>` : ""}
                ${outOfStock ? `<div class="oos-overlay large"><span>Hết hàng</span></div>` : ""}
                ${sale && !outOfStock ? `<span class="sale-badge large">-${sale}%</span>` : ""}
            </div>
            <div class="panel form">
                <span class="badge">${esc(valueOf(p, "category_name", "categoryName") || "Sản phẩm")}</span>
                <h2>${esc(p.name)}</h2>
                <p class="muted">${esc(p.description || "")}</p>
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
                    : `<button class="primary add-to-cart-btn" data-cart-btn="${p.id}" onclick="addCart(${p.id})">🛒 Thêm vào giỏ hàng</button>`}
                ${historyHtml}
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
                <textarea id="reviewComment" placeholder="Nhận xét của bạn (không bắt buộc)..." rows="3">${esc(userReview ? (userReview.comment || "") : "")}</textarea>
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
    updateWishlistButtons().catch(() => {});
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
                <img class="review-avatar" src="https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(r.username)}" alt="${esc(r.username)}">
                <div>
                    <strong>${esc(r.username)}</strong>
                    <div>${ratingStars(r.rating)}</div>
                </div>
                <span class="muted review-date">${formatDate(valueOf(r, "created_at", "createdAt"))}</span>
            </div>
            ${r.comment ? `<p class="review-comment">${esc(r.comment)}</p>` : ""}
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
    const btn = document.querySelector(`[data-cart-btn="${productId}"]`);
    const originalHtml = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = "Đang thêm..."; }
    try {
        await api("/api/cart/add", { method: "POST", body: JSON.stringify({ productId, quantity: 1 }) });
        toast("Đã thêm vào giỏ hàng");
        updateCartBadge();
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
    }
}

function drawCartBadge(cart) {
    const count = (cart.items || []).reduce((s, i) => s + Number(i.quantity||0), 0);
    let badge = document.getElementById("cartBadge");
    if (!badge) {
        const cartBtn = document.querySelector('[data-view="cart"]');
        if (cartBtn) {
            badge = document.createElement("span");
            badge.id = "cartBadge";
            badge.className = "cart-badge";
            cartBtn.appendChild(badge);
        }
    }
    if (badge) { badge.textContent = count; badge.style.display = count > 0 ? "inline-flex" : "none"; }
}

async function updateCartBadge() {
    if (!state.user) { const b = document.getElementById("cartBadge"); if(b) b.style.display="none"; return; }
    try {
        const cart = await api("/api/cart");
        drawCartBadge(cart);
    } catch (_) {}
}

async function loadCart() {
    requireLogin();
    const [cart, myVouchers] = await Promise.all([
        api("/api/cart"),
        state.user ? api("/api/auth/vouchers/my").catch(() => []) : Promise.resolve([])
    ]);
    drawCartBadge(cart);
    const subtotal = Number(cart.subtotal) || 0;

    $("#cartItems").innerHTML = `
        <h3>Sản phẩm trong giỏ</h3>
        ${cart.items.map(item => `
            <div class="cart-row">
                <img src="${esc(item.imageUrl)}" alt="${esc(item.name)}">
                <div>
                    <strong>${esc(item.name)}</strong>
                    <div class="muted">${money(item.salePrice)} · SL: ${item.quantity}</div>
                    <div class="price">${money(item.lineTotal)}</div>
                </div>
                <div class="actions">
                    <button onclick="changeQty(${item.productId}, ${item.quantity - 1})">-</button>
                    <button onclick="changeQty(${item.productId}, ${item.quantity + 1})">+</button>
                    <button onclick="removeCart(${item.productId})">Xóa</button>
                </div>
            </div>`).join("") || `<p class="muted">Giỏ hàng đang trống.</p>`}
        <div id="cartSummary" class="cart-summary">
            <div class="summary-row"><span>Tạm tính</span><span id="cartSubtotal">${money(subtotal)}</span></div>
            <div class="summary-row" id="cartDiscountRow" style="display:none">
                <span>Giảm (<span id="cartCouponCode"></span>)</span>
                <span id="cartDiscount" style="color:#16a34a;font-weight:700"></span>
            </div>
            <div class="summary-row cart-total"><strong>Tổng thanh toán</strong><strong id="cartTotal">${money(subtotal)}</strong></div>
        </div>`;

    // Lọc voucher còn hiệu lực
    const today = new Date();
    const validVouchers = myVouchers.filter(v => {
        const end = v.end_date ? new Date(v.end_date) : null;
        return v.active && (!end || today <= end);
    });

    const btn  = document.getElementById("voucherPickerBtn");
    const list = document.getElementById("voucherPickerList");
    const hiddenInput = document.getElementById("couponCodeHidden");
    if (!btn || !list || !hiddenInput) return;

    // Render danh sách voucher
    if (!validVouchers.length) {
        list.innerHTML = `<div class="vp-empty">Bạn chưa có mã giảm giá nào.<br><a href="#" onclick="show('vouchers');return false">Thu thập ngay →</a></div>`;
    } else {
        list.innerHTML = validVouchers.map(v => {
            const save = Math.round(subtotal * v.discount_percent / 100);
            return `<div class="vp-item" data-code="${v.code}" onclick="applyVoucher('${v.code}', ${subtotal})">
                <div class="vp-item-left">
                    <span class="vp-pct">-${v.discount_percent}%</span>
                </div>
                <div class="vp-item-mid">
                    <strong class="vp-code">${v.code}</strong>
                    <span class="vp-save">Tiết kiệm ${money(save)}</span>
                </div>
                <span class="vp-check" id="vp-check-${v.code}" style="display:none">✓</span>
            </div>`;
        }).join("") +
        `<div class="vp-remove" onclick="applyVoucher('', ${subtotal})">✕ Bỏ mã giảm giá</div>`;
    }

    // Toggle list
    btn.onclick = () => {
        const open = list.style.display !== "none";
        list.style.display = open ? "none" : "block";
        btn.classList.toggle("vp-open", !open);
    };

    // Nếu đã có mã từ trước (copyAndUse), preview lại
    if (hiddenInput.value) {
        applyVoucher(hiddenInput.value, subtotal);
    }
}

function applyVoucher(code, subtotal) {
    // Lấy subtotal thực từ DOM nếu có (tránh stale closure)
    const subtotalEl = document.getElementById("cartSubtotal");
    if (subtotalEl) {
        const parsed = Number(subtotalEl.textContent.replace(/[^\d]/g, ""));
        if (parsed > 0) subtotal = parsed;
    }
    const hiddenInput = document.getElementById("couponCodeHidden");
    const label       = document.getElementById("voucherPickerLabel");
    const list        = document.getElementById("voucherPickerList");
    const btn         = document.getElementById("voucherPickerBtn");

    // Reset check marks
    document.querySelectorAll(".vp-check").forEach(el => el.style.display = "none");

    if (!code) {
        if (hiddenInput) hiddenInput.value = "";
        if (label) label.innerHTML = "🎫 Chọn mã giảm giá";
        if (list)  list.style.display = "none";
        if (btn)   btn.classList.remove("vp-open", "vp-applied");
        resetCouponPreview(subtotal);
        return;
    }

    if (hiddenInput) hiddenInput.value = code;
    if (label) label.innerHTML = `🎫 <strong>${code}</strong>`;
    if (list)  list.style.display = "none";
    if (btn)   { btn.classList.remove("vp-open"); btn.classList.add("vp-applied"); }

    const checkEl = document.getElementById(`vp-check-${code}`);
    if (checkEl) checkEl.style.display = "";

    previewCoupon(code, subtotal);
}




async function previewCoupon(code, subtotal) {
    try {
        const result = await api(`/api/cart/apply-coupon?code=${encodeURIComponent(code)}`);
        const discount = Number(result.discount) || 0;
        const total    = Number(result.total)    || subtotal;
        const row = document.getElementById("cartDiscountRow");
        if (row) row.style.display = "";
        const codeEl = document.getElementById("cartCouponCode");
        if (codeEl) codeEl.textContent = code;
        const discEl = document.getElementById("cartDiscount");
        if (discEl) discEl.textContent = "-" + money(discount);
        const totalEl = document.getElementById("cartTotal");
        if (totalEl) { totalEl.textContent = money(total); totalEl.style.color = "var(--primary-dark)"; }
    } catch (err) {
        resetCouponPreview(subtotal);
        toast(err.message || "Mã giảm giá không hợp lệ");
    }
}

function resetCouponPreview(subtotal) {
    const row = document.getElementById("cartDiscountRow");
    if (row) row.style.display = "none";
    const total = document.getElementById("cartTotal");
    if (total) { total.textContent = money(subtotal); total.style.color = ""; }
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
                    ${status === "PENDING" ? `<button onclick="cancelMyOrder(${order.id})" style="background:#fef2f2;border-color:#fecaca;color:#b42318;min-height:auto;padding:6px 14px;font-size:13px">Hủy đơn</button>` : ""}
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
                <div><span class="meta-label">Người nhận</span><span>${esc(valueOf(order, "shipping_name", "shippingName") || "")}</span></div>
                <div><span class="meta-label">Điện thoại</span><span>${esc(valueOf(order, "shipping_phone", "shippingPhone") || "")}</span></div>
                <div><span class="meta-label">Địa chỉ</span><span>${esc(valueOf(order, "shipping_address", "shippingAddress") || "")}</span></div>
            </div>
            <h4 class="items-heading">Sản phẩm đã đặt (${items.length})</h4>
            <div class="order-items">
                ${items.length ? items.map(item => `
                    <div class="order-item">
                        <img src="${esc(item.imageUrl || "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=300")}"
                             alt="${esc(valueOf(item, "product_name", "productName") || "")}"
                             onerror="this.src='https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=300'">
                        <div class="order-item-info">
                            <strong>${esc(valueOf(item, "product_name", "productName") || "")}</strong>
                            <p class="muted">${esc(item.productDescription || "")}</p>
                            <span class="muted">Đơn giá: ${money(item.price)} × ${item.quantity}</span>
                        </div>
                        <strong class="order-item-total">${money(Number(item.price) * Number(item.quantity))}</strong>
                    </div>`).join("") : `<div style="padding: 16px; text-align: center; color: var(--muted); font-size: 13.5px;">Sản phẩm đã bị xóa khỏi hệ thống</div>`}
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

async function cancelMyOrder(orderId) {
    // Dùng custom modal thay vì confirm() vì nút "Hủy" của Chrome gây nhầm lẫn
    const confirmed = await new Promise(resolve => {
        const existing = document.getElementById("cancelConfirmModal");
        if (existing) existing.remove();
        const modal = document.createElement("dialog");
        modal.id = "cancelConfirmModal";
        modal.style.cssText = "width:min(400px,calc(100vw - 32px));border:1px solid var(--line);border-radius:16px;padding:28px 24px;box-shadow:var(--shadow);text-align:center;";
        modal.innerHTML = `
            <div style="font-size:40px;margin-bottom:12px">⚠️</div>
            <h3 style="margin:0 0 8px;font-size:18px">Hủy đơn hàng #${orderId}?</h3>
            <p style="color:var(--muted);margin:0 0 20px;font-size:14px">Thao tác này không thể hoàn tác. Đơn hàng sẽ bị hủy vĩnh viễn.</p>
            <div style="display:flex;gap:10px;justify-content:center">
                <button id="cancelConfirmNo" style="min-height:auto;padding:8px 20px;font-size:14px;">Quay lại</button>
                <button id="cancelConfirmYes" class="primary" style="min-height:auto;padding:8px 20px;font-size:14px;background:#dc2626;border-color:#dc2626;">Xác nhận hủy</button>
            </div>`;
        document.body.appendChild(modal);
        modal.showModal();
        modal.querySelector("#cancelConfirmNo").onclick = () => { modal.close(); modal.remove(); resolve(false); };
        modal.querySelector("#cancelConfirmYes").onclick = () => { modal.close(); modal.remove(); resolve(true); };
        modal.addEventListener("close", () => { modal.remove(); resolve(false); });
    });
    if (!confirmed) return;
    try {
        await api(`/api/orders/${orderId}/cancel`, { method: "DELETE" });
        toast("Đã hủy đơn hàng #" + orderId + " thành công");
        await loadOrders();
    } catch (e) {
        toast(e.message || "Không thể hủy đơn hàng");
    }
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

async function loadUserStats() {
    requireLogin();
    const panel = $("#userStatsPanel");
    panel.innerHTML = `<div style="padding:20px;color:var(--muted)">Đang tải...</div>`;
    
    const periodSelect = document.getElementById("userStatsPeriodFilter");
    const period = periodSelect ? periodSelect.value : "all";
    
    try {
        const stats = await api(`/api/user/spending-stats?period=${period}`);
        
        panel.innerHTML = `
            <div class="stats-dashboard" style="display:flex; flex-direction:column; gap:24px;">
                <!-- 1. Stats Cards Grid -->
                <div class="user-stats-cards">
                    <div class="user-stat-card" style="--accent:#0f766e">
                        <div class="user-stat-icon">💰</div>
                        <div class="user-stat-info">
                            <span class="user-stat-label">Tổng chi tiêu</span>
                            <strong class="user-stat-value">${money(stats.totalSpent)}</strong>
                        </div>
                    </div>
                    <div class="user-stat-card" style="--accent:#2563eb">
                        <div class="user-stat-icon">📅</div>
                        <div class="user-stat-info">
                            <span class="user-stat-label">Hôm nay</span>
                            <strong class="user-stat-value">${money(stats.spentToday)}</strong>
                        </div>
                    </div>
                    <div class="user-stat-card" style="--accent:#7c3aed">
                        <div class="user-stat-icon">📆</div>
                        <div class="user-stat-info">
                            <span class="user-stat-label">Tháng này</span>
                            <strong class="user-stat-value">${money(stats.spentThisMonth)}</strong>
                        </div>
                    </div>
                    <div class="user-stat-card" style="--accent:#d97706">
                        <div class="user-stat-icon">📊</div>
                        <div class="user-stat-info">
                            <span class="user-stat-label">Năm nay</span>
                            <strong class="user-stat-value">${money(stats.spentThisYear)}</strong>
                        </div>
                    </div>
                </div>

                <!-- 2. Spending Chart (daily/period) -->
                <div class="admin-form-card" style="margin:0;">
                    <h3>📈 Biểu đồ chi tiêu ${period === "today" ? "hôm nay" : period === "week" ? "tuần này" : period === "month" ? "tháng này" : period === "year" ? "năm nay" : "tất cả"}</h3>
                    <div style="position:relative; height:300px; width:100%;">
                        <canvas id="userSpendingChart"></canvas>
                    </div>
                </div>

                <!-- 3. Category distribution & Top Purchased Products -->
                <div style="display:grid; grid-template-columns: 1fr 1.5fr; gap:20px;">
                    <div class="admin-form-card" style="margin:0; display:flex; flex-direction:column;">
                        <h3>📊 Phân loại chi tiêu</h3>
                        <div style="position:relative; height:240px; width:100%; margin:auto; display:flex; align-items:center; justify-content:center;">
                            ${stats.categorySpending && stats.categorySpending.length > 0 ? 
                                '<canvas id="userCategoryChart"></canvas>' : 
                                '<span class="muted" style="font-size:13px;">Chưa có dữ liệu phân loại</span>'}
                        </div>
                    </div>
                    <div class="admin-form-card" style="margin:0; display:flex; flex-direction:column;">
                        <h3>🛍️ Sản phẩm mua nhiều nhất</h3>
                        <div class="table-wrap" style="flex:1; margin-top:8px;">
                            <table style="width:100%;">
                                <thead>
                                    <tr>
                                        <th>Ảnh</th>
                                        <th>Sản phẩm</th>
                                        <th>Số lượng</th>
                                        <th>Tổng tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(stats.topProducts || []).map(p => `
                                        <tr>
                                            <td><img src="${esc(p.imageUrl || "")}" style="width:40px; height:40px; object-fit:cover; border-radius:6px; background:#e5e7eb"></td>
                                            <td><strong>${esc(p.name)}</strong></td>
                                            <td style="font-weight:600;">${p.quantity}</td>
                                            <td style="font-weight:600; color:var(--primary-dark);">${money(p.totalSpent)}</td>
                                        </tr>
                                    `).join("") || '<tr><td colspan="4" style="text-align:center; color:var(--muted)">Bạn chưa mua sản phẩm nào</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- 4. Recent Orders History -->
                <div class="admin-form-card" style="margin:0;">
                    <h3>🧾 Lịch sử đơn hàng gần đây <span style="font-weight:400;color:var(--muted);font-size:14px;">(${stats.totalOrders || 0} đơn)</span></h3>
                    <div class="table-wrap" style="margin-top:8px; max-height:500px; overflow-y:auto;">
                        <table style="width:100%;">
                            <thead style="position:sticky;top:0;background:var(--surface);z-index:1;">
                                <tr>
                                    <th>Mã đơn</th>
                                    <th>Sản phẩm</th>
                                    <th>Tổng tiền</th>
                                    <th>Trạng thái</th>
                                    <th>Ngày đặt</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(stats.recentOrders || []).map(o => {
                                    const statusMap = { PENDING:"Chờ xử lý", CONFIRMED:"Đã xác nhận", SHIPPING:"Đang giao", DELIVERED:"Thành công", CANCELLED:"Đã hủy" };
                                    const colorMap = { PENDING:"#f59e0b", CONFIRMED:"#3b82f6", SHIPPING:"#8b5cf6", DELIVERED:"#10b981", CANCELLED:"#ef4444" };
                                    const itemsSummary = (o.items || []).map(i => `${esc(i.name)} x${i.quantity}`).join(", ");
                                    return `<tr>
                                        <td><strong>#${o.id}</strong></td>
                                        <td style="max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px;" title="${esc(itemsSummary) || "Sản phẩm đã bị xóa khỏi hệ thống"}">${esc(itemsSummary) || "Sản phẩm đã bị xóa khỏi hệ thống"}</td>
                                        <td style="font-weight:600;color:var(--primary-dark);">${money(o.totalAmount)}</td>
                                        <td><span style="background:${colorMap[o.status] || "#6b7280"}22;color:${colorMap[o.status] || "#6b7280"};padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;">${statusMap[o.status] || o.status}</span></td>
                                        <td style="font-size:13px;color:var(--muted);white-space:nowrap;">${formatDate(o.createdAt)}</td>
                                    </tr>`;
                                }).join("") || '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px;">Chưa có đơn hàng nào trong khoảng thời gian này</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <style>
                @media (max-width: 860px) {
                    .stats-dashboard > div[style*="grid-template-columns"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            </style>
        `;

        setTimeout(() => {
            // Draw Spending Chart (daily/period based)
            const spendCtx = document.getElementById("userSpendingChart")?.getContext("2d");
            if (spendCtx) {
                const chartData = stats.dailySpending || [];
                const labels = chartData.map(d => d.label);
                const values = chartData.map(d => d.value);

                const gradient = spendCtx.createLinearGradient(0, 0, 0, 280);
                gradient.addColorStop(0, "rgba(15, 118, 110, 0.35)");
                gradient.addColorStop(1, "rgba(15, 118, 110, 0.0)");

                new Chart(spendCtx, {
                    type: "line",
                    data: {
                        labels,
                        datasets: [{
                            label: "Chi tiêu (VNĐ)",
                            data: values,
                            borderColor: "#0f766e",
                            borderWidth: 3,
                            backgroundColor: gradient,
                            fill: true,
                            tension: 0.35,
                            pointBackgroundColor: "#0f766e",
                            pointHoverRadius: 7
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: { color: "rgba(0,0,0,0.05)" },
                                ticks: { callback: val => new Intl.NumberFormat("vi-VN").format(val) + " đ" }
                            },
                            x: { grid: { display: false } }
                        }
                    }
                });
            }

            // Draw Category Doughnut Chart
            const catCtx = document.getElementById("userCategoryChart")?.getContext("2d");
            if (catCtx) {
                const labels = (stats.categorySpending || []).map(d => d.label);
                const values = (stats.categorySpending || []).map(d => d.value);

                new Chart(catCtx, {
                    type: "doughnut",
                    data: {
                        labels,
                        datasets: [{
                            data: values,
                            backgroundColor: ["#0f766e", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981", "#6b7280"]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: "bottom",
                                labels: { boxWidth: 12, font: { size: 12 } }
                            }
                        }
                    }
                });
            }
        }, 50);

    } catch (err) {
        panel.innerHTML = `
            <div style="margin:24px;padding:20px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;color:#b42318">
                <strong>Lỗi tải thống kê chi tiêu:</strong> ${err.message}
            </div>`;
    }
}

async function loadAdmin() {
    requireAdmin();
    const period = state.adminPeriod || "all";
    let dashboard;
    try {
        dashboard = await api(`/api/admin/dashboard?period=${period}`);
    } catch (err) {
        $("#adminStats").innerHTML = "";
        $("#adminPanel").innerHTML = `
            <div style="margin:24px;padding:20px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;color:#b42318">
                <strong>Lỗi tải dashboard:</strong> ${err.message}
            </div>`;
        return;
    }

    const tabTitles = { dashboard: "Thống kê", products: "Sản phẩm", categories: "Danh mục", coupons: "Coupon", orders: "Đơn hàng", users: "Người dùng", stock: "Tồn kho thấp", reports: "Báo cáo doanh thu", ranks: "Danh hiệu", recycleBin: "Thùng rác" };
    const titleEl = document.getElementById("adminTabTitle");
    if (titleEl) titleEl.textContent = tabTitles[state.adminTab] || "Dashboard";

    const filterWrapper = document.getElementById("adminPeriodFilterWrapper");
    if (filterWrapper) {
        filterWrapper.style.display = (state.adminTab === "dashboard" || state.adminTab === "reports") ? "block" : "none";
        const selectEl = document.getElementById("adminPeriodFilter");
        if (selectEl) selectEl.value = period;
    }

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

    try {
        await renderAdminTab(dashboard);
    } catch (err) {
        $("#adminPanel").innerHTML = `
            <div style="margin:0 0 16px;padding:20px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;color:#b42318">
                <strong>Lỗi tải tab "${state.adminTab}":</strong> ${err.message}
            </div>`;
    }
}

const ADMIN_PAGE_SIZE = 10;

function paginationControls(total, page, onPageChange) {
    const totalPages = Math.ceil(total / ADMIN_PAGE_SIZE);
    if (totalPages <= 1) return "";
    return `
        <div class="pagination-wrap" style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding:12px 16px;background:#f8fafc;border-radius:12px;border:1px solid var(--line);">
            <button onclick="${onPageChange}(${page - 1})" ${page <= 1 ? "disabled" : ""} style="min-height:auto;padding:6px 12px;font-size:13px;">◀ Trước</button>
            <span style="font-size:13.5px;color:var(--muted);font-weight:600;">Trang ${page} / ${totalPages}</span>
            <button onclick="${onPageChange}(${page + 1})" ${page >= totalPages ? "disabled" : ""} style="min-height:auto;padding:6px 12px;font-size:13px;">Sau ▶</button>
        </div>`;
}

window.changeAdminPage = async function(newPage) {
    state.adminPage = newPage;
    await loadAdmin();
};

window.updateStock = async function(id) {
    const input = document.getElementById(`stock-input-${id}`);
    if (!input) return;
    const newStock = parseInt(input.value);
    if (isNaN(newStock) || newStock < 0) {
        toast("Số lượng tồn kho không hợp lệ");
        return;
    }
    try {
        const p = await api(`/api/products/${id}`);
        await api(`/api/admin/products/${id}`, {
            method: "PUT",
            body: JSON.stringify({
                name: p.name,
                description: p.description,
                price: Number(p.price),
                stock: newStock,
                imageUrl: valueOf(p, "image_url", "imageUrl") || "",
                categoryId: Number(valueOf(p, "category_id", "categoryId")),
                featured: valueOf(p, "featured") === true || valueOf(p, "featured") === 1 || valueOf(p, "featured") === "true",
                discountPercent: Number(valueOf(p, "discount_percent", "discountPercent") || 0)
            })
        });
        toast("Đã cập nhật tồn kho thành công");
        await loadAdmin();
    } catch (err) {
        toast(err.message);
    }
};

async function renderAdminTab(dashboard) {
    const panel = $("#adminPanel");
    panel.innerHTML = `<div style="padding:20px;color:var(--muted)">Đang tải...</div>`;

    if (state.adminTab === "dashboard") {
        panel.innerHTML = `
            <div class="dashboard-wrapper" style="display:flex; flex-direction:column; gap:20px;">
                <!-- Section 1: Revenue Chart -->
                <div class="admin-form-card" style="margin:0;">
                    <h3>📈 Biểu đồ doanh thu</h3>
                    <div style="position:relative; height:320px; width:100%;">
                        <canvas id="revenueChart"></canvas>
                    </div>
                </div>
                
                <!-- Section 2: Category Share & Top Selling Products -->
                <div style="display:grid; grid-template-columns: 1fr 1.5fr; gap:20px;">
                    <div class="admin-form-card" style="margin:0; display:flex; flex-direction:column;">
                        <h3>📊 Doanh thu theo danh mục</h3>
                        <div style="position:relative; height:240px; width:100%; margin:auto; display:flex; align-items:center; justify-content:center;">
                            ${dashboard.categoryRevenue && dashboard.categoryRevenue.length > 0 ? 
                                '<canvas id="categoryChart"></canvas>' : 
                                '<span class="muted" style="font-size:13px;">Chưa có dữ liệu doanh thu</span>'}
                        </div>
                    </div>
                    <div class="admin-form-card" style="margin:0; display:flex; flex-direction:column;">
                        <h3>🏆 Top sản phẩm bán chạy</h3>
                        <div class="table-wrap" style="flex:1; margin-top:8px;">
                            <table style="width:100%;">
                                <thead>
                                    <tr>
                                        <th>Ảnh</th>
                                        <th>Sản phẩm</th>
                                        <th>Đã bán</th>
                                        <th>Doanh thu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(dashboard.topProducts || []).map(p => `
                                        <tr>
                                            <td><img src="${esc(p.imageUrl || "")}" style="width:40px; height:40px; object-fit:cover; border-radius:6px; background:#e5e7eb"></td>
                                            <td><strong>${esc(p.name)}</strong></td>
                                            <td style="font-weight:600;">${p.quantitySold}</td>
                                            <td style="font-weight:600; color:var(--primary-dark);">${money(p.revenue)}</td>
                                        </tr>
                                    `).join("") || '<tr><td colspan="4" style="text-align:center; color:var(--muted)">Chưa có dữ liệu</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Section 3: Order Status & Low Stock alerts -->
                <div style="display:grid; grid-template-columns: 1fr 1.5fr; gap:20px;">
                    <div class="admin-form-card" style="margin:0; display:flex; flex-direction:column;">
                        <h3>📝 Trạng thái đơn hàng</h3>
                        <div style="position:relative; height:240px; width:100%; margin:auto; display:flex; align-items:center; justify-content:center;">
                            ${dashboard.orderStatusCounts && dashboard.orderStatusCounts.length > 0 ? 
                                '<canvas id="orderStatusChart"></canvas>' : 
                                '<span class="muted" style="font-size:13px;">Chưa có đơn hàng nào</span>'}
                        </div>
                    </div>
                    <div class="admin-form-card" style="margin:0; display:flex; flex-direction:column;">
                        <h3>⚠️ Cảnh báo tồn kho thấp</h3>
                        <div class="table-wrap" style="flex:1; margin-top:8px;">
                            <table style="width:100%;">
                                <thead>
                                    <tr>
                                        <th>Mã</th>
                                        <th>Sản phẩm</th>
                                        <th>Còn lại</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(dashboard.lowStock || []).slice(0, 5).map(p => `
                                        <tr>
                                            <td>${p.id}</td>
                                            <td>
                                                <a href="#" onclick="event.preventDefault(); state.adminTab='stock'; loadAdmin(); document.querySelectorAll('[data-admin-tab]').forEach(b=>b.classList.toggle('active', b.dataset.adminTab==='stock'));" style="color:var(--primary); font-weight:700; text-decoration:none;">
                                                    ${esc(p.name)}
                                                </a>
                                            </td>
                                            <td style="color:#b42318; font-weight:700;">${p.stock}</td>
                                            <td>
                                                <button onclick="event.preventDefault(); state.adminTab='products'; loadAdmin().then(()=>openEditProduct(${p.id})); document.querySelectorAll('[data-admin-tab]').forEach(b=>b.classList.toggle('active', b.dataset.adminTab==='products'));" style="padding:4px 8px; font-size:12px; background:#f0fdf4; border-color:#bbf7d0; color:#16a34a; font-weight:600;">Nhập hàng</button>
                                            </td>
                                        </tr>
                                    `).join("") || '<tr><td colspan="4" style="text-align:center; color:#15803d; font-weight:600;">Tất cả sản phẩm đều đủ tồn kho! 🎉</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                @media (max-width: 860px) {
                    .dashboard-wrapper > div {
                        grid-template-columns: 1fr !important;
                    }
                }
            </style>
        `;

        setTimeout(() => {
            // 1. Revenue Chart
            const revCtx = document.getElementById("revenueChart")?.getContext("2d");
            if (revCtx) {
                const labels = (dashboard.revenueChartData || []).map(d => d.label);
                const values = (dashboard.revenueChartData || []).map(d => d.value);
                
                // Create gradient
                const gradient = revCtx.createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, "rgba(15, 118, 110, 0.3)");
                gradient.addColorStop(1, "rgba(15, 118, 110, 0.0)");
                
                new Chart(revCtx, {
                    type: "line",
                    data: {
                        labels: labels,
                        datasets: [{
                            label: "Doanh thu (VNĐ)",
                            data: values,
                            borderColor: "#0f766e",
                            borderWidth: 3,
                            backgroundColor: gradient,
                            fill: true,
                            tension: 0.35,
                            pointBackgroundColor: "#0f766e",
                            pointHoverRadius: 7
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: { color: "rgba(0, 0, 0, 0.05)" },
                                ticks: {
                                    callback: (val) => new Intl.NumberFormat("vi-VN").format(val) + " đ"
                                }
                            },
                            x: {
                                grid: { display: false }
                            }
                        }
                    }
                });
            }

            // 2. Category Revenue Chart
            const catCtx = document.getElementById("categoryChart")?.getContext("2d");
            if (catCtx) {
                const labels = (dashboard.categoryRevenue || []).map(d => d.label);
                const values = (dashboard.categoryRevenue || []).map(d => d.value);
                
                new Chart(catCtx, {
                    type: "doughnut",
                    data: {
                        labels: labels,
                        datasets: [{
                            data: values,
                            backgroundColor: ["#0f766e", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981", "#6b7280"]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: "bottom",
                                labels: { boxWidth: 12, font: { size: 12 } }
                            }
                        }
                    }
                });
            }

            // 3. Order Status Chart
            const statusCtx = document.getElementById("orderStatusChart")?.getContext("2d");
            if (statusCtx) {
                const statusMap = {
                    PENDING: "Chờ xử lý",
                    CONFIRMED: "Đã xác nhận",
                    SHIPPING: "Đang giao",
                    DELIVERED: "Thành công",
                    CANCELLED: "Đã hủy"
                };
                const colorsMap = {
                    PENDING: "#f59e0b",
                    CONFIRMED: "#3b82f6",
                    SHIPPING: "#8b5cf6",
                    DELIVERED: "#10b981",
                    CANCELLED: "#ef4444"
                };
                
                const labels = (dashboard.orderStatusCounts || []).map(d => statusMap[d.label] || d.label);
                const colors = (dashboard.orderStatusCounts || []).map(d => colorsMap[d.label] || "#6b7280");
                const values = (dashboard.orderStatusCounts || []).map(d => d.value);
                
                new Chart(statusCtx, {
                    type: "doughnut",
                    data: {
                        labels: labels,
                        datasets: [{
                            data: values,
                            backgroundColor: colors
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: "bottom",
                                labels: { boxWidth: 12, font: { size: 12 } }
                            }
                        }
                    }
                });
            }
        }, 50);
        return;
    }

    if (state.adminTab === "products") {
        const products = await api("/api/products");
        const total = products.length;
        const page = state.adminPage || 1;
        const start = (page - 1) * ADMIN_PAGE_SIZE;
        const end = start + ADMIN_PAGE_SIZE;
        const paginatedProducts = products.slice(start, end);

        const bulkBar = `
            <div id="bulkCategoryActionWrapper" style="display:none; align-items:center; gap:12px; margin-bottom:16px; padding:16px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; flex-wrap:wrap;">
                <span style="font-weight:700; color:#166534;" id="bulkSelectedCount">Đã chọn 0 sản phẩm</span>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:13.5px; color:#374151;">Thay đổi danh mục thành:</span>
                    <select id="bulkCategorySelect" style="width:220px; margin:0; padding:6px 12px; border-radius:8px; border:1px solid #16a34a; font-size:13.5px; outline:none; background:#ffffff;">
                        <option value="">-- Không có danh mục (—) --</option>
                        ${state.categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}
                    </select>
                </div>
                <button onclick="applyBulkCategory()" class="primary" style="margin:0; min-height:auto; padding:8px 16px; font-size:13.5px; border-radius:8px;">Áp dụng hàng loạt</button>
            </div>
        `;

        panel.innerHTML = `
            <div class="admin-form-card">
                <h3>➕ Thêm sản phẩm mới</h3>
                ${productForm()}
            </div>
            ${bulkBar}` +
            table(
                [`<input type="checkbox" id="selectAllProducts" onclick="toggleSelectAllProducts(this)" style="width:16px;height:16px;margin:0;cursor:pointer;vertical-align:middle;">`, "Ảnh", "Tên", "Giá", "Kho", "Danh mục", "Nổi bật", "Thao tác"],
                paginatedProducts.map(p => [
                    `<input type="checkbox" class="product-select-checkbox" data-id="${p.id}" onclick="updateBulkCategoryBar()" style="width:16px;height:16px;margin:0;cursor:pointer;vertical-align:middle;">`,
                    `<img src="${esc(valueOf(p,"image_url","imageUrl")||"")}" style="width:52px;height:44px;object-fit:cover;border-radius:6px;background:#e5e7eb">`,
                    `<strong>${esc(p.name)}</strong>`,
                    money(p.price),
                    p.stock,
                    esc(valueOf(p, "category_name", "categoryName") || "—"),
                    valueOf(p, "featured") ? `<span style="color:#16a34a;font-weight:700">✓</span>` : `<span style="color:#d1d5db">—</span>`,
                    `<div style="display:flex;gap:6px">
                        <button onclick="openEditProduct(${p.id})" style="background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8">Sửa</button>
                        <button onclick="deleteAdmin('/api/admin/products/${p.id}')" style="background:#fef2f2;border-color:#fecaca;color:#b42318">Xóa</button>
                    </div>`
                ])
            ) +
            paginationControls(total, page, "changeAdminPage");
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
                `<strong>${esc(c.name)}</strong>`,
                esc(c.description) || `<span class="muted">—</span>`,
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
                    <input name="maxUses" type="number" min="1" placeholder="Số lượt dùng (để trống = không giới hạn)">
                    <label style="font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:3px">Ngày bắt đầu<input name="startDate" type="date" style="margin:0"></label>
                    <label style="font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:3px">Ngày kết thúc<input name="endDate" type="date" style="margin:0"></label>
                    <button class="primary">Thêm</button>
                </form>
            </div>
            ${table(["Code", "% Giảm", "Trạng thái", "Lượt dùng", "Từ ngày", "Đến ngày", "Thao tác"], coupons.map(c => {
                const maxUses   = c.max_uses != null ? c.max_uses : null;
                const collectedCount = c.used_count || 0; // dùng used_count tạm, sẽ update sau khi có query
                const remaining = maxUses != null ? maxUses - collectedCount : null;
                const usageText = maxUses != null
                    ? `<span style="font-weight:700">${collectedCount}</span><span style="color:var(--muted)">/${maxUses}</span>
                       <div style="margin-top:4px;height:5px;background:#e5e7eb;border-radius:99px;width:72px;overflow:hidden">
                         <div style="height:100%;border-radius:99px;background:${collectedCount>=maxUses?'#ef4444':'#0f766e'};width:${Math.min(100,Math.round(collectedCount/maxUses*100))}%"></div>
                       </div>`
                    : `<span style="color:var(--muted);font-size:12px">∞ Không giới hạn</span>`;
                return [
                    `<strong style="font-family:monospace;font-size:14px">${esc(c.code)}</strong>`,
                    `<span style="font-weight:800;color:var(--primary-dark)">${c.discount_percent}%</span>`,
                    c.active
                        ? `<span class="badge" style="background:#ecfdf3;color:#027a48">✓ Đang bật</span>`
                        : `<span class="badge" style="background:#f3f4f6;color:#6b7280">✗ Tắt</span>`,
                    usageText,
                    fmtDate(c.start_date),
                    fmtDate(c.end_date),
                    `<div style="display:flex;gap:6px;flex-wrap:wrap">
                        <button onclick="openEditCoupon(${c.id})" style="background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8">Sửa</button>
                        <button onclick="toggleCoupon(${c.id},${c.active})" style="background:${c.active?'#fff7ed':'#ecfdf3'};border-color:${c.active?'#fed7aa':'#bbf7d0'};color:${c.active?'#b45309':'#027a48'}">${c.active ? 'Tắt' : 'Bật'}</button>
                        <button onclick="deleteAdmin('/api/admin/coupons/${c.id}')" style="background:#fef2f2;border-color:#fecaca;color:#b42318">Xóa</button>
                    </div>`
                ];
            }))}`;
        document.getElementById("couponForm").onsubmit = submitCoupon;
    }
    if (state.adminTab === "orders") {
        const orders = await api("/api/admin/orders");
        const total = orders.length;
        const page = state.adminPage || 1;
        const start = (page - 1) * ADMIN_PAGE_SIZE;
        const end = start + ADMIN_PAGE_SIZE;
        const paginatedOrders = orders.slice(start, end);

        const statusLabel = { PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", SHIPPING: "Đang giao", DELIVERED: "Đã nhận", CANCELLED: "Đã hủy" };
        const statusOpts = [
            ["PENDING",   "Chờ xác nhận"],
            ["CONFIRMED", "Đã xác nhận"],
            ["SHIPPING",  "Đang giao"],
            ["DELIVERED", "Đã nhận hàng"],
            ["CANCELLED", "Đã hủy"]
        ];
        panel.innerHTML = table(["Mã", "Khách", "Tổng", "Trạng thái", "Cập nhật"], paginatedOrders.map(o => [
            `#${o.id}`, esc(o.username), money(o.total_amount),
            `<span class="badge status-${String(o.status).toLowerCase()}">${statusLabel[o.status] || o.status}</span>`,
            `<select onchange="updateOrder(${o.id}, this.value)">
                ${statusOpts.map(([val, label]) => `<option value="${val}" ${val === o.status ? "selected" : ""}>${label}</option>`).join("")}
            </select>`
        ])) +
        paginationControls(total, page, "changeAdminPage");
    }
    if (state.adminTab === "users") {
        try {
            const users = await api("/api/admin/users");
            if (!users || users.length === 0) {
                panel.innerHTML = `<div style="padding:32px;text-align:center;color:var(--muted)">Chưa có người dùng nào.</div>`;
                return;
            }
            const total = users.length;
            const page = state.adminPage || 1;
            const start = (page - 1) * ADMIN_PAGE_SIZE;
            const end = start + ADMIN_PAGE_SIZE;
            const paginatedUsers = users.slice(start, end);

            panel.innerHTML = table(
                ["ID", "Avatar", "Username", "Họ tên", "Email", "SĐT", "Vai trò", "Trạng thái", "Thao tác"],
                paginatedUsers.map(u => {
                    const uname = String(u.username || "");
                    const email = String(u.email || "");
                    const phone = String(u.phone || "—");
                    const name  = String(u.full_name || u.fullName || "—");
                    const avatar = String(u.avatar_url || u.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(uname)}`);
                    const statusText = u.status === "BANNED"
                        ? `<span class="badge" style="background:#fef2f2;color:#b42318;font-size:12px;font-weight:700">✗ Khóa${u.ban_until ? ` (đến ${new Date(u.ban_until).toLocaleDateString("vi-VN")})` : " vĩnh viễn"}</span>`
                        : `<span class="badge" style="background:#ecfdf3;color:#027a48;font-size:12px;font-weight:700">✓ Hoạt động</span>`;
                    const actionButtons = u.role !== "ADMIN"
                        ? `<div style="display:flex;gap:6px">
                            <button onclick="openUserDetail(${u.id})" style="background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8">Chi tiết</button>
                            ${u.status === "BANNED"
                                ? `<button onclick="toggleUserStatus(${u.id}, 'ACTIVE')" style="background:#ecfdf3;border-color:#bbf7d0;color:#027a48">Mở khóa</button>`
                                : `<button onclick="toggleUserStatusPrompt(${u.id})" style="background:#fff7ed;border-color:#fed7aa;color:#b45309">Khóa</button>`
                            }
                            <button onclick="deleteAdmin('/api/admin/users/${u.id}')" style="background:#fef2f2;border-color:#fecaca;color:#b42318">Xóa</button>
                           </div>`
                        : `<button onclick="openUserDetail(${u.id})" style="background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8">Chi tiết</button>`;
                    return [
                        u.id,
                        `<img src="${esc(avatar)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;background:#e5e7eb">`,
                        `<strong>${esc(uname)}</strong>`,
                        esc(name),
                        esc(email),
                        esc(phone),
                        `<span class="badge ${u.role === "ADMIN" ? "badge-admin" : ""}">${u.role === "ADMIN" ? "👑 Admin" : "🛍️ Khách hàng"}</span>`,
                        statusText,
                        actionButtons
                    ];
                })
            ) +
            paginationControls(total, page, "changeAdminPage");
        } catch (err) {
            panel.innerHTML = `<div style="padding:24px;background:#fef2f2;border-radius:8px;color:#b42318;border:1px solid #fecaca">
                <strong>Lỗi tải danh sách người dùng:</strong> ${err.message}<br>
                <small style="color:var(--muted);margin-top:6px;display:block">Hãy restart server để áp dụng API mới.</small>
            </div>`;
        }
    }
    if (state.adminTab === "stock") {
        panel.innerHTML = table(
            ["Mã", "Sản phẩm", "Tồn kho hiện tại", "Cập nhật tồn kho", "Thao tác"],
            (dashboard.lowStock || []).map(p => [
                p.id,
                `<strong>${esc(p.name)}</strong>`,
                `<span style="color:#b42318;font-weight:700">${p.stock}</span>`,
                `<input type="number" value="${p.stock}" id="stock-input-${p.id}" style="width:90px;padding:6px;margin:0" min="0" class="form-input">`,
                `<button onclick="updateStock(${p.id})" style="background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8;padding:6px 12px;font-size:13px;font-weight:600">Lưu</button>`
            ])
        );
    }

    if (state.adminTab === "reports") {
        const period = state.adminPeriod || "all";
        try {
            const report = await api(`/api/admin/revenue-report?period=${period}`);
            panel.innerHTML = `
                <div class="stats-dashboard">
                    <!-- Summary Cards -->
                    <div class="user-stats-cards">
                        <div class="user-stat-card" style="--accent:#0f766e">
                            <div class="user-stat-icon">💰</div>
                            <div class="user-stat-info">
                                <span class="user-stat-label">Tổng doanh thu</span>
                                <strong class="user-stat-value">${money(report.totalRevenue)}</strong>
                            </div>
                        </div>
                        <div class="user-stat-card" style="--accent:#2563eb">
                            <div class="user-stat-icon">🛒</div>
                            <div class="user-stat-info">
                                <span class="user-stat-label">Tổng đơn hàng</span>
                                <strong class="user-stat-value">${report.totalOrders}</strong>
                            </div>
                        </div>
                        <div class="user-stat-card" style="--accent:#7c3aed">
                            <div class="user-stat-icon">👥</div>
                            <div class="user-stat-info">
                                <span class="user-stat-label">Khách hàng</span>
                                <strong class="user-stat-value">${report.totalCustomers}</strong>
                            </div>
                        </div>
                        <div class="user-stat-card" style="--accent:#d97706">
                            <div class="user-stat-icon">📊</div>
                            <div class="user-stat-info">
                                <span class="user-stat-label">Đơn TB</span>
                                <strong class="user-stat-value">${money(report.avgOrderValue)}</strong>
                            </div>
                        </div>
                    </div>

                    <!-- Revenue Chart -->
                    <div class="admin-form-card" style="margin:0;">
                        <h3>📈 Biểu đồ doanh thu chi tiết</h3>
                        <div style="position:relative; height:300px; width:100%;">
                            <canvas id="reportRevenueChart"></canvas>
                        </div>
                    </div>

                    <!-- Two column: Top Products + Top Buyers -->
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                        <div class="admin-form-card" style="margin:0;">
                            <h3>🏆 Top sản phẩm bán chạy</h3>
                            <div class="table-wrap" style="margin-top:8px;">
                                <table style="width:100%;">
                                    <thead><tr><th>Ảnh</th><th>Sản phẩm</th><th>Đã bán</th><th>Doanh thu</th></tr></thead>
                                    <tbody>
                                        ${(report.topProducts || []).map(p => `
                                            <tr>
                                                <td><img src="${esc(p.imageUrl || "")}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;background:#e5e7eb"></td>
                                                <td><strong>${esc(p.name)}</strong></td>
                                                <td style="font-weight:600;">${p.quantitySold}</td>
                                                <td style="font-weight:600;color:var(--primary-dark);">${money(p.revenue)}</td>
                                            </tr>
                                        `).join("") || '<tr><td colspan="4" style="text-align:center;color:var(--muted)">Chưa có dữ liệu</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="admin-form-card" style="margin:0;">
                            <h3>👥 Khách hàng mua nhiều nhất</h3>
                            <div class="table-wrap" style="margin-top:8px;">
                                <table style="width:100%;">
                                    <thead><tr><th>Khách hàng</th><th>Email</th><th>Số đơn</th><th>Tổng chi tiêu</th></tr></thead>
                                    <tbody>
                                        ${(report.topBuyers || []).map(b => `
                                            <tr>
                                                <td><strong>${esc(b.fullName || b.username)}</strong></td>
                                                <td style="color:var(--muted);font-size:13px;">${esc(b.email || "—")}</td>
                                                <td style="font-weight:600;text-align:center;">${b.orderCount}</td>
                                                <td style="font-weight:600;color:var(--primary-dark);">${money(b.totalSpent)}</td>
                                            </tr>
                                        `).join("") || '<tr><td colspan="4" style="text-align:center;color:var(--muted)">Chưa có dữ liệu</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Order Details -->
                    <div class="admin-form-card" style="margin:0;">
                        <h3>📋 Chi tiết đơn hàng gần đây</h3>
                        <div class="table-wrap" style="margin-top:8px;">
                            <table style="width:100%;">
                                <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tổng tiền</th><th>Trạng thái</th><th>Ngày đặt</th></tr></thead>
                                <tbody>
                                    ${(report.orderDetails || []).map(o => {
                                        const statusMap = { PENDING:"Chờ xử lý", CONFIRMED:"Đã xác nhận", SHIPPING:"Đang giao", DELIVERED:"Thành công", CANCELLED:"Đã hủy" };
                                        const colorMap = { PENDING:"#f59e0b", CONFIRMED:"#3b82f6", SHIPPING:"#8b5cf6", DELIVERED:"#10b981", CANCELLED:"#ef4444" };
                                        return `<tr>
                                            <td><strong>#${o.id}</strong></td>
                                            <td>${esc(o.fullName || o.username)}</td>
                                            <td style="font-weight:600;color:var(--primary-dark);">${money(o.totalAmount)}</td>
                                            <td><span class="order-badge" style="background:${colorMap[o.status] || "#6b7280"}22;color:${colorMap[o.status] || "#6b7280"};padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">${statusMap[o.status] || o.status}</span></td>
                                            <td style="font-size:13px;color:var(--muted);">${formatDate(o.createdAt)}</td>
                                        </tr>`;
                                    }).join("") || '<tr><td colspan="5" style="text-align:center;color:var(--muted)">Chưa có dữ liệu</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <style>
                    @media (max-width: 860px) {
                        .stats-dashboard > div[style*="grid-template-columns"] {
                            grid-template-columns: 1fr !important;
                        }
                    }
                </style>
            `;

            // Render revenue chart
            setTimeout(() => {
                const ctx = document.getElementById("reportRevenueChart")?.getContext("2d");
                if (ctx) {
                    const labels = (report.dailyRevenue || []).map(d => d.label);
                    const values = (report.dailyRevenue || []).map(d => d.value);
                    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
                    gradient.addColorStop(0, "rgba(37, 99, 235, 0.6)");
                    gradient.addColorStop(1, "rgba(37, 99, 235, 0.05)");

                    new Chart(ctx, {
                        type: "bar",
                        data: {
                            labels,
                            datasets: [{
                                label: "Doanh thu (VNĐ)",
                                data: values,
                                backgroundColor: gradient,
                                borderColor: "#2563eb",
                                borderWidth: 2,
                                borderRadius: 6,
                                borderSkipped: false
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    grid: { color: "rgba(0,0,0,0.05)" },
                                    ticks: { callback: val => new Intl.NumberFormat("vi-VN").format(val) + " đ" }
                                },
                                x: { grid: { display: false } }
                            }
                        }
                    });
                }
            }, 50);

        } catch (err) {
            panel.innerHTML = `<div style="margin:24px;padding:20px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;color:#b42318"><strong>Lỗi tải báo cáo:</strong> ${err.message}</div>`;
        }
    }
    if (state.adminTab === "ranks") {
        panel.innerHTML = `
            <div class="admin-form-card" style="margin:0 0 16px 0;">
                <h3>🛡️ Quản lý danh hiệu tích lũy</h3>
                <p class="hint">Cập nhật số tiền tích lũy tối thiểu (minSpent) để đạt được các mốc danh hiệu.</p>
            </div>
            ` + table(
                ["Huy hiệu", "Tên danh hiệu", "Danh hiệu phụ", "Mức chi tiêu tối thiểu", "Thao tác"],
                RANKS.map(r => [
                    `<span style="font-size:24px;">${esc(r.icon)}</span>`,
                    `<strong>${esc(r.name)}</strong>`,
                    `<span class="muted">${esc(r.subtitle)}</span>`,
                    `<span style="font-weight:700; color:var(--primary-dark);">${money(r.minSpent)}</span>`,
                    `<div style="display:flex;gap:6px">
                        <button onclick="openEditRank('${r.id}', '${esc(r.name)}', ${r.minSpent})" style="background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8;padding:4px 8px;font-size:12px;font-weight:600;">Sửa mức tiền</button>
                    </div>`
                ])
            );
    }
    if (state.adminTab === "recycleBin") {
        panel.innerHTML = `
            <div class="admin-form-card" style="margin:0 0 16px 0;">
                <h3>♻️ Thùng rác hệ thống</h3>
                <p class="muted" style="font-size:13.5px;margin-bottom:12px;">Nơi lưu trữ tạm thời các mục dữ liệu đã xóa. Bạn có thể khôi phục chúng về trạng thái ban đầu bất kỳ lúc nào.</p>
                
                <!-- Search & Filter Controls -->
                <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-top:8px;">
                    <div style="flex:1; min-width:200px;">
                        <input type="text" id="recycleSearchInput" placeholder="Tìm kiếm theo tên hoặc ID..." oninput="filterRecycleBin()" style="margin:0; padding:8px 12px; font-size:13.5px; border-radius:8px;">
                    </div>
                    <div style="width:180px;">
                        <select id="recycleTypeFilter" onchange="filterRecycleBin()" style="margin:0; padding:8px 12px; font-size:13.5px; border-radius:8px;">
                            <option value="">Tất cả loại mục</option>
                            <option value="PRODUCT">Sản phẩm</option>
                            <option value="USER">Người dùng</option>
                            <option value="CATEGORY">Danh mục</option>
                            <option value="COUPON">Coupon</option>
                        </select>
                    </div>
                </div>
            </div>
            <div id="recycleBinTableWrapper"></div>
        `;
        
        state.recycleBinItems = await api("/api/admin/recycle-bin");
        filterRecycleBin();
    }
}

window.filterRecycleBin = function() {
    const searchVal = document.getElementById("recycleSearchInput")?.value.trim().toLowerCase() || "";
    const typeVal = document.getElementById("recycleTypeFilter")?.value || "";
    
    const filtered = (state.recycleBinItems || []).filter(item => {
        const matchesSearch = String(item.display_name || "").toLowerCase().includes(searchVal) || String(item.entity_id || "").includes(searchVal);
        const matchesType = !typeVal || item.entity_type === typeVal;
        return matchesSearch && matchesType;
    });
    
    const typeLabels = { USER: "Người dùng", PRODUCT: "Sản phẩm", CATEGORY: "Danh mục", COUPON: "Coupon" };
    const wrapper = document.getElementById("recycleBinTableWrapper");
    if (!wrapper) return;
    
    if (filtered.length > 0) {
        wrapper.innerHTML = table(
            ["Loại mục", "Tên hiển thị", "Mã gốc (ID)", "Ngày xóa", "Thao tác"],
            filtered.map(item => [
                `<span class="badge" style="background:#f1f5f9;color:#475569;font-weight:600;padding:4px 8px;border-radius:6px;font-size:12.5px;">${typeLabels[item.entity_type] || item.entity_type}</span>`,
                `<strong>${esc(item.display_name)}</strong>`,
                `#${item.entity_id}`,
                formatDate(item.deleted_at),
                `<div style="display:flex;gap:6px">
                    <button onclick="restoreRecycleItem(${item.id})" style="background:#ecfdf3;border-color:#bbf7d0;color:#027a48;font-weight:600;font-size:12.5px;padding:4px 10px;min-height:auto;">Khôi phục</button>
                    <button onclick="deleteRecycleItemPermanently(${item.id})" style="background:#fef2f2;border-color:#fecaca;color:#b42318;font-size:12.5px;padding:4px 10px;min-height:auto;">Xóa vĩnh viễn</button>
                </div>`
            ])
        );
    } else {
        wrapper.innerHTML = `<div style="padding:48px 20px;text-align:center;color:var(--muted);background:var(--panel);border-radius:12px;border:1px solid var(--line);font-size:14px;font-weight:600;">Không tìm thấy mục dữ liệu nào phù hợp.</div>`;
    }
};

window.restoreRecycleItem = async function(id) {
    try {
        await api(`/api/admin/recycle-bin/${id}/restore`, { method: "POST" });
        toast("Đã khôi phục dữ liệu thành công!");
        await loadBase();
        await loadAdmin();
    } catch (err) {
        toast(err.message);
    }
};

window.deleteRecycleItemPermanently = async function(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa vĩnh viễn mục này? Hành động này không thể hoàn tác.")) return;
    try {
        await api(`/api/admin/recycle-bin/${id}`, { method: "DELETE" });
        toast("Đã xóa vĩnh viễn khỏi hệ thống!");
        await loadAdmin();
    } catch (err) {
        toast(err.message);
    }
};

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
                <input name="name" placeholder="Tên sản phẩm" value="${esc(p.name || "")}" required>
                <input name="price" type="number" min="0" placeholder="Giá" value="${p.price || 0}" required>
                <input name="stock" type="number" min="0" placeholder="Tồn kho" value="${p.stock || 0}" required>
                <select name="categoryId">
                    ${state.categories.map(c => `<option value="${c.id}" ${c.id == valueOf(p,"category_id","categoryId") ? "selected" : ""}>${esc(c.name)}</option>`).join("")}
                </select>
                <input name="discountPercent" type="number" min="0" max="100" placeholder="% giảm (0-100)" value="${valueOf(p,"discount_percent","discountPercent") || 0}">
                <label style="display:flex;align-items:center;gap:8px;font-size:14px">
                    <input name="featured" type="checkbox" ${p.featured ? "checked" : ""}> Nổi bật
                </label>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
                <img id="editImgPreview" src="${esc(valueOf(p,"image_url","imageUrl")||"")}"
                     style="width:64px;height:56px;object-fit:cover;border-radius:8px;background:#e5e7eb;flex-shrink:0">
                <div class="upload-field" style="flex:1">
                    <input name="imageUrl" id="editProductImageUrl" placeholder="URL ảnh" value="${esc(valueOf(p,"image_url","imageUrl")||"")}">
                    <label class="upload-btn">
                        📁 Tải lên
                        <input type="file" accept="image/*" onchange="uploadEditProductImage(this)" class="hidden">
                    </label>
                </div>
            </div>
            <textarea name="description" placeholder="Mô tả" rows="3">${esc(p.description || "")}</textarea>
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
            <input name="name" placeholder="Tên danh mục" value="${esc(name)}" required>
            <input name="description" placeholder="Mô tả" value="${esc(desc)}">
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
                <input name="code" placeholder="Mã code" value="${esc(c.code)}" required>
                <input name="discountPercent" type="number" min="1" max="100" placeholder="% giảm" value="${c.discount_percent}" required>
                <input name="maxUses" type="number" min="1" placeholder="Số lượt dùng (để trống = không giới hạn)" value="${c.max_uses != null ? c.max_uses : ''}">
                <div></div>
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
                endDate: fd.get("endDate") || null,
                maxUses: fd.get("maxUses") ? Number(fd.get("maxUses")) : null
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
    const avatarSrc = esc(u.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(u.username)}`);
    const rankNextHint = nextName ? `Cần thêm ${money(needed)} để lên <strong>${esc(nextName)}</strong>` : "Đã đạt cấp tối đa";
    modal.innerHTML = `
        <div style="padding:24px;display:grid;gap:20px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div style="display:flex;align-items:center;gap:16px">
                    <img src="${avatarSrc}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid var(--line)">
                    <div>
                        <h3 style="margin:0;font-size:20px">${esc(u.full_name || u.fullName || u.username)}</h3>
                        <p style="margin:2px 0 0;color:var(--muted);font-size:13px">@${esc(u.username)} · ${esc(u.email)}</p>
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
                ${[["SĐT", esc(u.phone||"Chưa cập nhật")],["Địa chỉ", esc(u.address||"Chưa cập nhật")],
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
    const maxUses = form.get("maxUses");
    await api("/api/admin/coupons", {
        method: "POST",
        body: JSON.stringify({
            code: form.get("code"),
            discountPercent: Number(form.get("discountPercent")),
            active: true,
            startDate: form.get("startDate") || null,
            endDate: form.get("endDate") || null,
            maxUses: maxUses ? Number(maxUses) : null
        })
    });
    toast("Đã thêm mã giảm giá");
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

let otpCountdownInterval = null;

function startOtpTimer(email) {
    if (otpCountdownInterval) clearInterval(otpCountdownInterval);

    const timerEl = document.getElementById("otpTimer");
    const resendBtn = document.getElementById("resendOtpBtn");
    if (!timerEl || !resendBtn) return;

    resendBtn.disabled = true;
    resendBtn.style.opacity = "0.5";
    resendBtn.style.cursor = "not-allowed";

    let secondsLeft = 60;
    timerEl.textContent = `Mã OTP hết hạn sau: ${secondsLeft}s`;

    otpCountdownInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
            clearInterval(otpCountdownInterval);
            timerEl.textContent = "Mã OTP đã hết hạn.";
            resendBtn.disabled = false;
            resendBtn.style.opacity = "1";
            resendBtn.style.cursor = "pointer";
        } else {
            timerEl.textContent = `Mã OTP hết hạn sau: ${secondsLeft}s`;
        }
    }, 1000);

    resendBtn.onclick = async () => {
        try {
            const data = await api("/api/auth/forgot-password", {
                method: "POST",
                body: JSON.stringify({ email })
            });
            alert("Hệ thống (Dev Mode): Mã OTP mới của bạn là " + data.otp);
            startOtpTimer(email);
        } catch (e) {
            toast(e.message);
        }
    };
}

function setAuthState(mode) {
    const title = $("#authTitle");
    const switchBtn = $("#switchAuth");
    const forgotBtn = $("#forgotAuthBtn");

    document.querySelectorAll("#authForm input").forEach(input => {
        input.required = false;
    });

    if (mode === "login") {
        title.textContent = "Đăng nhập";
        switchBtn.textContent = "Tạo tài khoản mới";
        switchBtn.style.display = "";
        forgotBtn.style.display = "";

        document.querySelectorAll(".login-field").forEach(el => { el.classList.remove("hidden"); el.required = true; });
        document.querySelectorAll(".register-field, .reset-field").forEach(el => el.classList.add("hidden"));
    } 
    else if (mode === "register") {
        title.textContent = "Đăng ký";
        switchBtn.textContent = "Tôi đã có tài khoản";
        switchBtn.style.display = "";
        forgotBtn.style.display = "none";

        document.querySelectorAll(".login-field, .register-field").forEach(el => { el.classList.remove("hidden"); el.required = true; });
        document.querySelector("#authForm input[name='phone']").required = false;
        document.querySelector("#authForm input[name='address']").required = false;
        document.querySelectorAll(".reset-field").forEach(el => el.classList.add("hidden"));
    } 
    else if (mode === "forgot") {
        title.textContent = "Quên mật khẩu";
        switchBtn.textContent = "Quay lại đăng nhập";
        switchBtn.style.display = "";
        forgotBtn.style.display = "none";

        document.querySelectorAll(".forgot-field").forEach(el => { el.classList.remove("hidden"); el.required = true; });
        document.querySelectorAll(".login-field, .register-field:not(.forgot-field), .reset-field").forEach(el => el.classList.add("hidden"));
    } 
    else if (mode === "reset") {
        title.textContent = "Đặt lại mật khẩu";
        switchBtn.textContent = "Quay lại đăng nhập";
        switchBtn.style.display = "";
        forgotBtn.style.display = "none";

        document.querySelectorAll(".forgot-field, .reset-field").forEach(el => { el.classList.remove("hidden"); el.required = true; });
        document.querySelectorAll(".login-field, .register-field:not(.forgot-field)").forEach(el => el.classList.add("hidden"));

        const email = document.querySelector("#authForm input[name='email']").value;
        startOtpTimer(email);
    }

    if (mode !== "reset") {
        if (otpCountdownInterval) {
            clearInterval(otpCountdownInterval);
            otpCountdownInterval = null;
        }
    }
}

$("#authButton").onclick = () => {
    setAuthState("login");
    $("#authDialog").showModal();
};

$("#logoutButton").onclick = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    state.token = null;
    state.user = null;
    state.selectedOrderId = null;
    syncAuthUi();
    show("home");
};

$("#closeAuth").onclick = () => {
    if (otpCountdownInterval) {
        clearInterval(otpCountdownInterval);
        otpCountdownInterval = null;
    }
    $("#authDialog").close();
};

$("#switchAuth").onclick = () => {
    const title = $("#authTitle").textContent;
    if (title === "Đăng nhập") {
        setAuthState("register");
    } else {
        setAuthState("login");
    }
};

$("#forgotAuthBtn").onclick = () => {
    setAuthState("forgot");
};

$("#authForm").onsubmit = async event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const title = $("#authTitle").textContent;

    try {
        if (title === "Đăng ký") {
            const payload = {
                username: form.get("usernameOrEmail"),
                email: form.get("email"),
                password: form.get("password"),
                fullName: form.get("fullName"),
                phone: form.get("phone"),
                address: form.get("address")
            };
            if (payload.password.length < 6) {
                toast("Mật khẩu phải có ít nhất 6 ký tự");
                return;
            }
            if (!/[a-zA-Z]/.test(payload.password) || !/\d/.test(payload.password)) {
                toast("Mật khẩu phải chứa cả chữ cái và chữ số");
                return;
            }
            if (payload.phone) {
                const cleanedPhone = payload.phone.replace(/\s+/g, "");
                if (!/^\d{9,11}$/.test(cleanedPhone)) {
                    toast("Số điện thoại không hợp lệ (phải gồm 9 đến 11 chữ số)");
                    return;
                }
            }
            const data = await api("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
            state.token = data.token;
            state.user = data.user;
            localStorage.setItem("token", state.token);
            localStorage.setItem("user", JSON.stringify(state.user));
            $("#authDialog").close();
            syncAuthUi();
            toast("Đăng ký thành công");
        } 
        else if (title === "Đăng nhập") {
            const payload = {
                usernameOrEmail: form.get("usernameOrEmail"),
                password: form.get("password")
            };
            const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
            state.token = data.token;
            state.user = data.user;
            localStorage.setItem("token", state.token);
            localStorage.setItem("user", JSON.stringify(state.user));
            $("#authDialog").close();
            syncAuthUi();
            toast("Đăng nhập thành công");
        } 
        else if (title === "Quên mật khẩu") {
            const email = form.get("email");
            const data = await api("/api/auth/forgot-password", {
                method: "POST",
                body: JSON.stringify({ email })
            });
            alert("Hệ thống (Dev Mode): Mã OTP đặt lại mật khẩu của bạn là " + data.otp);
            setAuthState("reset");
        } 
        else if (title === "Đặt lại mật khẩu") {
            const email = form.get("email");
            const otp = form.get("otp");
            const newPassword = form.get("newPassword");
            if (newPassword.length < 6) {
                toast("Mật khẩu mới phải có ít nhất 6 ký tự");
                return;
            }
            if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
                toast("Mật khẩu mới phải chứa cả chữ cái và chữ số");
                return;
            }
            await api("/api/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({ email, otp, newPassword })
            });
            if (otpCountdownInterval) {
                clearInterval(otpCountdownInterval);
                otpCountdownInterval = null;
            }
            toast("Đổi mật khẩu thành công! Hãy đăng nhập lại.");
            setAuthState("login");
        }
    } catch (e) {
        if (e.message !== "SESSION_EXPIRED") {
            toast(e.message);
        }
    }
};

$("#profileForm").onsubmit = async event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target));
    if (payload.phone) {
        const cleanedPhone = payload.phone.replace(/\s+/g, "");
        if (!/^\d{9,11}$/.test(cleanedPhone)) {
            toast("Số điện thoại không hợp lệ (phải gồm 9 đến 11 chữ số)");
            return;
        }
    }
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
    updateCartBadge();
    show("orders");
};

$("#reloadProducts").onclick = loadProducts;
$("#searchInput").addEventListener("input", debounce(() => {
    // Nếu đang ở trang chủ hoặc view khác → chuyển sang trang sản phẩm để hiện kết quả
    const productsHidden = document.getElementById("productsView").classList.contains("hidden");
    if (productsHidden && $("#searchInput").value.trim()) {
        show("products"); // show() sẽ gọi loadProducts() bên trong
    } else {
        loadProducts().catch(console.error);
    }
}, 350));
$("#categoryFilter").addEventListener("change", () => {
    const productsHidden = document.getElementById("productsView").classList.contains("hidden");
    if (productsHidden) {
        show("products");
    } else {
        loadProducts().catch(console.error);
    }
});

// Filter bar listeners
["filterMinPrice","filterMaxPrice"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", debounce(() => loadProducts().catch(console.error), 400));
});
["filterMinRating","filterSort"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", () => loadProducts().catch(console.error));
});
document.getElementById("clearFilters")?.addEventListener("click", () => {
    ["filterMinPrice","filterMaxPrice"].forEach(id => { const el = document.getElementById(id); if(el) el.value=""; });
    ["filterMinRating","filterSort"].forEach(id => { const el = document.getElementById(id); if(el) el.value = id==="filterSort" ? "newest" : ""; });
    loadProducts().catch(console.error);
});
// Admin nav — event delegation để tránh stale closure
document.getElementById("adminView").addEventListener("click", async e => {
    const btn = e.target.closest("[data-admin-tab]");
    if (!btn) return;
    document.querySelectorAll("[data-admin-tab]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.adminTab = btn.dataset.adminTab;
    await loadAdmin();
});

// Admin period filter listener
document.getElementById("adminPeriodFilter")?.addEventListener("change", async e => {
    state.adminPeriod = e.target.value;
    await loadAdmin();
});

document.getElementById("userStatsPeriodFilter")?.addEventListener("change", () => {
    loadUserStats().catch(console.error);
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

let RANKS = [
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

window.showRankInfo = function(name, minSpent, desc) {
    const detailEl = document.getElementById("rankTierDetail");
    if (detailEl) {
        detailEl.innerHTML = `
            <div style="border-top: 1px dashed; border-color: inherit; opacity: 0.25; margin-top: 12px;"></div>
            <div style="margin-top: 10px; font-size: 12.5px; line-height: 1.4;">
                <span style="font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 11px; display: inline-block; margin-right: 6px;">★ ${name}</span> 
                · Yêu cầu tích lũy từ <strong>${money(minSpent)}</strong>
                <p style="margin: 4px 0 0; opacity: 0.75; font-size: 11.5px; font-weight: normal;">${desc}</p>
            </div>`;
    }
};

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
        return `<span class="rank-tier-pip ${current ? "current" : ""} ${unlocked && !current ? "unlocked" : ""}" onclick="showRankInfo('${esc(r.name)}', ${r.minSpent}, '${esc(r.desc)}')">
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
            <div id="rankTierDetail" style="transition: all 0.2s ease;"></div>
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

    // Hiển thị sẵn danh hiệu hiện tại của user dưới card
    const currentRank = getRank(totalSpent);
    showRankInfo(currentRank.name, currentRank.minSpent, currentRank.desc);

    // Animate XP bar
    requestAnimationFrame(() => {
        setTimeout(() => {
            const bar = document.getElementById("rankXpBar");
            if (bar) bar.style.width = getRankProgress(totalSpent).pct + "%";
        }, 100);
    });
}

// ── Voucher system ──
let currentVoucherTab = "available";

async function loadVouchers() {
    requireLogin();
    const panel = document.getElementById("voucherPanel");
    panel.innerHTML = `<div style="padding:32px;text-align:center;color:var(--muted)">Đang tải...</div>`;
    await renderVoucherTab();

    // Tab switching
    document.querySelectorAll(".voucher-tab").forEach(btn => {
        btn.onclick = async () => {
            document.querySelectorAll(".voucher-tab").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentVoucherTab = btn.dataset.vtab;
            await renderVoucherTab();
        };
    });
}

async function renderVoucherTab() {
    const panel = document.getElementById("voucherPanel");
    if (!panel) return;
    try {
        if (currentVoucherTab === "available") {
            const vouchers = await api("/api/auth/vouchers/available");
            if (!vouchers.length) {
                panel.innerHTML = `<div class="voucher-empty">Hiện chưa có voucher nào khả dụng.</div>`;
                return;
            }
            panel.innerHTML = `<div class="voucher-grid">${vouchers.map(v => voucherCard(v, true)).join("")}</div>`;
        } else {
            const vouchers = await api("/api/auth/vouchers/my");
            if (!vouchers.length) {
                panel.innerHTML = `<div class="voucher-empty">Bạn chưa thu thập voucher nào.<br>
                    <button class="cta-ghost" style="margin-top:16px" onclick="document.querySelector('[data-vtab=available]').click()">Xem voucher có sẵn →</button></div>`;
                return;
            }
            panel.innerHTML = `<div class="voucher-grid">${vouchers.map(v => voucherCard(v, false)).join("")}</div>`;
        }
    } catch (e) {
        panel.innerHTML = `<div class="voucher-empty" style="color:#b42318">${e.message}</div>`;
    }
}

function voucherCard(v, showCollect) {
    const today = new Date();
    const endDate   = v.end_date   ? new Date(v.end_date)   : null;
    const startDate = v.start_date ? new Date(v.start_date) : null;
    const isExpired  = endDate   && today > endDate;
    const notStarted = startDate && today < startDate;
    const isCollected = Number(v.collected) > 0;

    const maxUses        = v.max_uses != null ? Number(v.max_uses) : null;
    const collectedCount = Number(v.collected_count || 0);
    const remaining      = maxUses != null ? maxUses - collectedCount : null;
    const isSoldOut      = remaining !== null && remaining <= 0;

    const statusBadge = isExpired  ? `<span class="vc-badge vc-expired">Hết hạn</span>`
        : notStarted               ? `<span class="vc-badge vc-pending">Chưa bắt đầu</span>`
        : isSoldOut                ? `<span class="vc-badge vc-soldout">Hết phiếu</span>`
                                   : `<span class="vc-badge vc-active">Đang hoạt động</span>`;

    const expireText = endDate
        ? `Hết hạn: <strong>${endDate.toLocaleDateString("vi-VN")}</strong>`
        : `<span style="color:var(--muted)">Không giới hạn thời gian</span>`;

    // Với người dùng: KHÔNG hiện số phiếu kho
    // Với tab "Thu thập": chỉ hiện thanh progress nếu sắp hết (để tạo urgency)
    // Với tab "Của tôi": không hiện số kho — chỉ hiện "1 lần sử dụng"
    const remainText = showCollect
        ? (remaining !== null && remaining <= 5 && remaining > 0
            ? `<div class="vc-remain"><div class="vc-remain-bar"><div style="width:${Math.round(remaining/maxUses*100)}%"></div></div><span style="color:#b45309;font-size:12px">Sắp hết phiếu!</span></div>`
            : ``)
        : `<div class="vc-remain-info">Sử dụng 1 lần</div>`;

    const actionBtn = showCollect
        ? (isCollected
            ? `<button class="vc-btn vc-collected" disabled>✓ Đã thu thập</button>`
            : isExpired || isSoldOut
            ? `<button class="vc-btn vc-disabled" disabled>Không khả dụng</button>`
            : `<button class="vc-btn vc-collect" onclick="collectVoucher(${v.id})">Thu thập</button>`)
        : `<button class="vc-btn vc-use" onclick="copyAndUse('${v.code}')">Dùng ngay</button>`;

    return `
    <div class="voucher-card ${isExpired || isSoldOut ? 'vc-dim' : ''}">
        <div class="vc-left">
            <div class="vc-pct">-${v.discount_percent}%</div>
        </div>
        <div class="vc-right">
            <div class="vc-top-row">
                <div>
                    <div class="vc-code">${v.code}</div>
                    <div class="vc-expire">${expireText}</div>
                </div>
                ${statusBadge}
            </div>
            ${remainText}
            <div class="vc-bottom-row">
                ${actionBtn}
            </div>
        </div>
    </div>`;
}

async function collectVoucher(couponId) {
    try {
        await api(`/api/auth/vouchers/collect/${couponId}`, { method: "POST" });
        toast("Đã thu thập voucher thành công!");
        await renderVoucherTab();
    } catch (e) {
        toast(e.message);
    }
}

function copyAndUse(code) {
    show("cart");
    const tryApply = (tries = 0) => {
        const btn = document.getElementById("voucherPickerBtn");
        if (btn) {
            // Lấy subtotal từ DOM nếu có
            const totalEl = document.getElementById("cartTotal");
            const subtotal = totalEl ? 0 : 0; // sẽ được tính lại trong applyVoucher
            // Điền hidden input trước, loadCart sẽ gọi applyVoucher khi xong
            const hidden = document.getElementById("couponCodeHidden");
            if (hidden) hidden.value = code;
            toast(`Đã chọn mã: ${code}`);
        } else if (tries < 15) {
            setTimeout(() => tryApply(tries + 1), 100);
        }
    };
    setTimeout(() => tryApply(), 200);
}

// ── Trang Đánh giá ──
async function loadReviews() {
    requireLogin();
    const panel = document.getElementById("reviewsPanel");
    panel.innerHTML = `<div style="padding:32px;text-align:center;color:var(--muted)">Đang tải...</div>`;
    try {
        const products = await api("/api/purchased-products");
        if (!products.length) {
            panel.innerHTML = `
                <div class="voucher-empty">
                    Bạn chưa có sản phẩm nào cần đánh giá.<br>
                    <button class="cta-ghost" style="margin-top:16px" onclick="show('products')">Mua sắm ngay →</button>
                </div>`;
            return;
        }
        panel.innerHTML = `<div class="review-products-grid">${products.map(p => reviewProductCard(p)).join("")}</div>`;
    } catch (e) {
        panel.innerHTML = `<div class="voucher-empty" style="color:#b42318">${e.message}</div>`;
    }
}

function reviewProductCard(p) {
    const hasReview = p.myRating != null;
    const stars = [1,2,3,4,5].map(i =>
        `<span class="rpick-star ${i <= (p.myRating||0) ? 'selected' : ''}"
              data-val="${i}"
              onclick="pickReviewStar(this, '${p.id}')">★</span>`
    ).join("");

    const avgRating = Number(p.avgRating || 0);
    const finalPrice = Number(p.price) * (100 - Number(p.discountPercent || 0)) / 100;

    // Escape dữ liệu user-generated để tránh XSS
    const safeName = esc(p.name);
    const safeImg = esc(p.imageUrl || '');
    const safeComment = esc(p.myComment || '');

    return `
    <div class="review-product-card" id="rpc-${p.id}">
        <div class="rpc-left">
            <img src="${safeImg}" alt="${safeName}">
        </div>
        <div class="rpc-right">
            <div class="rpc-name">${safeName}</div>
            <div class="rpc-price">${money(finalPrice)}</div>
            <div class="rpc-avg">${ratingStars(avgRating)} <span class="muted" style="font-size:12px">${p.reviewCount || 0} đánh giá</span></div>

            ${hasReview ? `
            <div class="rpc-my-review">
                <div class="rpc-my-stars">${ratingStars(p.myRating)}</div>
                <p class="rpc-my-comment">${safeComment || '<span class="muted">Chưa có bình luận</span>'}</p>
                <button class="rpc-edit-btn" data-pid="${p.id}" data-rating="${p.myRating}" onclick="openReviewFormSafe(this)">Sửa đánh giá</button>
            </div>` : `
            <div class="rpc-form" id="rform-${p.id}">
                <div class="rpick-stars" data-product-id="${p.id}" data-rating="0">${stars}</div>
                <textarea id="rcomment-${p.id}" placeholder="Viết bình luận của bạn..." rows="2"></textarea>
                <button class="primary rpc-submit" onclick="submitReviewFromPage(${p.id})">Gửi đánh giá</button>
            </div>`}
        </div>
    </div>`;
}

function pickReviewStar(el, productId) {
    const val = parseInt(el.dataset.val);
    const container = el.closest(".rpick-stars");
    container.dataset.rating = val;
    container.querySelectorAll(".rpick-star").forEach((s,i) => {
        s.classList.toggle("selected", i < val);
    });
}

// Safe version: lấy comment từ DOM text thay vì truyền qua template literal
function openReviewFormSafe(btnEl) {
    const productId = Number(btnEl.dataset.pid);
    const currentRating = Number(btnEl.dataset.rating) || 0;
    const card = document.getElementById(`rpc-${productId}`);
    const commentEl = card.querySelector(".rpc-my-comment");
    const currentComment = commentEl ? commentEl.textContent : "";
    openReviewForm(productId, currentRating, currentComment);
}

function openReviewForm(productId, currentRating, currentComment) {
    const card = document.getElementById(`rpc-${productId}`);
    const reviewDiv = card.querySelector(".rpc-my-review");
    reviewDiv.innerHTML = `
        <div class="rpick-stars" data-product-id="${productId}" data-rating="${currentRating}">
            ${[1,2,3,4,5].map(i =>
                `<span class="rpick-star ${i <= currentRating ? 'selected' : ''}" data-val="${i}" onclick="pickReviewStar(this, '${productId}')">★</span>`
            ).join("")}
        </div>
        <textarea id="rcomment-${productId}" placeholder="Bình luận..." rows="2"></textarea>
        <div style="display:flex;gap:8px;margin-top:8px">
            <button class="primary rpc-submit" onclick="submitReviewFromPage(${productId})">Lưu</button>
            <button onclick="loadReviews()">Hủy</button>
        </div>`;
    // Populate textarea safely (tránh XSS injection qua template literal)
    const textarea = document.getElementById(`rcomment-${productId}`);
    if (textarea) textarea.value = currentComment;
}
async function submitReviewFromPage(productId) {
    const container = document.querySelector(`.rpick-stars[data-product-id="${productId}"]`);
    const rating = parseInt(container?.dataset.rating || "0");
    if (!rating) { toast("Vui lòng chọn số sao"); return; }
    const comment = document.getElementById(`rcomment-${productId}`)?.value || "";
    try {
        await api("/api/reviews", { method: "POST", body: JSON.stringify({ productId, rating, comment }) });
        toast("Đã lưu đánh giá!");
        await loadReviews();
    } catch (e) {
        toast(e.message);
    }
}

// ============================================================
// WISH LIST SYSTEM & TOGGLES
// ============================================================
async function loadWishlist() {
    requireLogin();
    const wishlist = await api("/api/wishlist");
    const container = $("#wishlistGrid");
    if (!wishlist.length) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:48px 0;border:none;box-shadow:none;">
                <div class="empty-icon" style="font-size:48px;margin-bottom:12px;">❤️</div>
                <p class="muted">Danh sách yêu thích của bạn đang trống.</p>
                <button class="primary" onclick="show('products')">Xem sản phẩm</button>
            </div>`;
        return;
    }
    container.innerHTML = wishlist.map(productCard).join("");
    updateWishlistButtons().catch(() => {});
}

window.toggleWishlist = async function(productId, event) {
    if (event) event.stopPropagation();
    requireLogin();
    try {
        const res = await api(`/api/wishlist/${productId}`, { method: "POST" });
        if (res.added) {
            toast("Đã thêm vào danh sách yêu thích");
        } else {
            toast("Đã xóa khỏi danh sách yêu thích");
        }
        updateWishlistButtons().catch(() => {});
        if (!document.getElementById("wishlistView").classList.contains("hidden")) {
            await loadWishlist();
        }
    } catch (e) {
        toast(e.message);
    }
};

async function updateWishlistButtons() {
    if (!state.user) return;
    try {
        const ids = await api("/api/wishlist/ids");
        document.querySelectorAll(".wishlist-btn").forEach(btn => {
            const pid = Number(btn.dataset.productId);
            const active = ids.includes(pid);
            btn.classList.toggle("active", active);
            btn.innerHTML = active ? "❤️" : "🤍";
        });
    } catch (_) {}
}

// ============================================================
// PRICE DROP NOTIFICATIONS SYSTEM
// ============================================================
async function loadWishlistNotifications() {
    if (!state.user) return;
    try {
        const notifs = await api("/api/wishlist/notifications");
        const badge = document.getElementById("notifCount");
        const list = document.getElementById("notifList");
        if (badge) {
            badge.textContent = notifs.length;
            badge.style.display = notifs.length > 0 ? "flex" : "none";
        }
        if (list) {
            if (!notifs.length) {
                list.innerHTML = `<div class="notif-empty">Không có thông báo mới</div>`;
            } else {
                list.innerHTML = notifs.map(n => {
                    const oldP = Number(n.oldPrice || n.old_price || 0);
                    const newP = Number(n.newPrice || n.new_price || 0);
                    const diff = oldP - newP;
                    return `
                        <div class="notif-item" onclick="openProduct(${n.id})">
                            <img src="${esc(n.imageUrl)}" alt="${esc(n.name)}">
                            <div class="notif-item-body">
                                <strong>${esc(n.name)}</strong> giảm giá mạnh!
                                <div><span class="muted">${money(oldP)}</span> → <strong style="color:#16a34a">${money(newP)}</strong></div>
                                <div style="font-size:11px;color:#16a34a;font-weight:600;">Tiết kiệm ${money(diff)}!</div>
                            </div>
                        </div>`;
                }).join("");
            }
        }
    } catch (_) {}
}

// Event delegation for notification dropdown toggle
document.addEventListener("click", event => {
    const container = document.getElementById("notifBellContainer");
    const dropdown = document.getElementById("notifDropdown");
    const btn = document.getElementById("notifBellBtn");
    const closeBtn = document.getElementById("closeNotifBtn");

    if (!container || !dropdown || !btn) return;

    if (btn.contains(event.target)) {
        event.stopPropagation();
        const open = dropdown.style.display !== "none";
        dropdown.style.display = open ? "none" : "block";
        if (!open) {
            loadWishlistNotifications().catch(() => {});
        }
    } else if (closeBtn && closeBtn.contains(event.target)) {
        dropdown.style.display = "none";
    } else if (!dropdown.contains(event.target)) {
        dropdown.style.display = "none";
    }
});

// ============================================================
// PASSWORD CHANGE FORM LISTENER
// ============================================================
$("#changePasswordForm").onsubmit = async event => {
    event.preventDefault();
    const form = event.target;
    const currentPassword = form.currentPassword.value;
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;
    if (newPassword.length < 6) {
        toast("Mật khẩu mới phải có ít nhất 6 ký tự");
        return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
        toast("Mật khẩu mới phải chứa cả chữ cái và chữ số");
        return;
    }
    if (newPassword !== confirmPassword) {
        toast("Mật khẩu xác nhận không khớp");
        return;
    }
    try {
        await api("/api/auth/change-password", {
            method: "POST",
            body: JSON.stringify({ currentPassword, newPassword })
        });
        toast("Đổi mật khẩu thành công!");
        form.reset();
    } catch (e) {
        toast(e.message);
    }
};

// Hook wishlist and notifications into WS STOMP product updates
const origHandleProductEvent = handleProductEvent;
window.handleProductEvent = function(event) {
    origHandleProductEvent(event);
    if (event.action === "updated" && state.user) {
        loadWishlistNotifications().catch(() => {});
        updateWishlistButtons().catch(() => {});
    }
};

function initGoogleSignIn() {
    if (typeof google === "undefined" || !google.accounts || !google.accounts.id) {
        setTimeout(initGoogleSignIn, 100);
        return;
    }

    google.accounts.id.initialize({
        client_id: "1071806914161-c05nk1ag6062biten5vg5ara4ns7l63j.apps.googleusercontent.com",
        callback: handleGoogleCredentialResponse
    });

    google.accounts.id.renderButton(
        document.getElementById("googleBtn"),
        { theme: "outline", size: "large", width: 240 }
    );
}

async function handleGoogleCredentialResponse(response) {
    try {
        const credential = response.credential;
        const data = await api("/api/auth/google", {
            method: "POST",
            body: JSON.stringify({ credential })
        });
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem("token", state.token);
        localStorage.setItem("user", JSON.stringify(state.user));
        $("#authDialog").close();
        syncAuthUi();
        toast("Đăng nhập bằng Google thành công");
    } catch (err) {
        toast("Đăng nhập bằng Google thất bại: " + err.message);
    }
}

window.toggleUserStatus = async function(userId, status, banDays = 0) {
    try {
        await api(`/api/admin/users/${userId}/status`, {
            method: "PUT",
            body: JSON.stringify({ status, banDays })
        });
        toast("Đã cập nhật trạng thái người dùng");
        await loadAdmin();
    } catch (e) {
        toast(e.message);
    }
};

window.toggleUserStatusPrompt = function(userId) {
    const daysStr = prompt("Nhập số ngày muốn khóa tài khoản này (để trống hoặc 0 để khóa vĩnh viễn):", "0");
    if (daysStr === null) return;
    const days = parseInt(daysStr) || 0;
    toggleUserStatus(userId, "BANNED", days);
};

window.openEditRank = function(id, name, minSpent) {
    document.getElementById("editRankModal")?.remove();
    const modal = document.createElement("dialog");
    modal.id = "editRankModal";
    modal.style.cssText = "width:min(400px,calc(100vw - 24px));border:1px solid var(--line);border-radius:12px;padding:0;box-shadow:var(--shadow)";
    modal.innerHTML = `
        <form id="editRankForm" class="form dialog-form" style="padding:20px;display:grid;gap:12px">
            <div class="section-head" style="margin-bottom:4px">
                <h3 style="margin:0">Sửa mức chi tiêu</h3>
                <button type="button" onclick="document.getElementById('editRankModal').close()">✕</button>
            </div>
            <p>Điều chỉnh mức tiền tối thiểu để đạt danh hiệu <strong>${name}</strong></p>
            <input name="minSpent" type="number" min="0" placeholder="Mức chi tiêu tối thiểu" value="${minSpent}" required>
            <div style="display:flex;gap:10px;justify-content:flex-end">
                <button type="button" onclick="document.getElementById('editRankModal').close()">Hủy</button>
                <button type="submit" class="primary">Lưu</button>
            </div>
        </form>`;
    document.body.appendChild(modal);
    modal.showModal();
    document.getElementById("editRankForm").onsubmit = async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const newMinSpent = form.get("minSpent");
        try {
            await api(`/api/admin/ranks/${id}`, {
                method: "PUT",
                body: JSON.stringify({ minSpent: Number(newMinSpent) })
            });
            modal.close();
            toast("Đã cập nhật mức chi tiêu thành công!");
            await loadBase();
            await loadAdmin();
        } catch (err) {
            toast(err.message);
        }
    };
};
window.toggleSelectAllProducts = function(masterCheckbox) {
    const checkboxes = document.querySelectorAll(".product-select-checkbox");
    checkboxes.forEach(cb => cb.checked = masterCheckbox.checked);
    window.updateBulkCategoryBar();
};

window.updateBulkCategoryBar = function() {
    const checkboxes = document.querySelectorAll(".product-select-checkbox");
    const selected = Array.from(checkboxes).filter(cb => cb.checked);
    const wrapper = document.getElementById("bulkCategoryActionWrapper");
    const countEl = document.getElementById("bulkSelectedCount");
    const masterCheckbox = document.getElementById("selectAllProducts");

    if (masterCheckbox) {
        masterCheckbox.checked = checkboxes.length > 0 && selected.length === checkboxes.length;
    }

    if (wrapper && countEl) {
        if (selected.length > 0) {
            wrapper.style.display = "flex";
            countEl.textContent = `Đã chọn ${selected.length} sản phẩm`;
        } else {
            wrapper.style.display = "none";
        }
    }
};

window.applyBulkCategory = async function() {
    const checkboxes = document.querySelectorAll(".product-select-checkbox");
    const selectedIds = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => Number(cb.dataset.id));
    
    if (selectedIds.length === 0) {
        toast("Vui lòng chọn ít nhất một sản phẩm");
        return;
    }
    
    const catSelect = document.getElementById("bulkCategorySelect");
    const categoryIdVal = catSelect ? catSelect.value : "";
    const categoryId = categoryIdVal ? Number(categoryIdVal) : null;
    
    try {
        await api("/api/admin/products/bulk-category", {
            method: "PUT",
            body: JSON.stringify({
                productIds: selectedIds,
                categoryId: categoryId
            })
        });
        toast("Đã cập nhật danh mục hàng loạt thành công");
        await loadAdmin();
    } catch (err) {
        toast(err.message);
    }
};

loadBase().catch(error => toast(error.message));

