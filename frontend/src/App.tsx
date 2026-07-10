import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { ProductList } from './pages/ProductList';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { MyOrders } from './pages/MyOrders';
import { AdminDashboard } from './pages/AdminDashboard';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Vouchers } from './pages/Vouchers';
import { Wishlist } from './pages/Wishlist';
import { VNPayReturn } from './pages/VNPayReturn';
import { PaymentResult } from './pages/PaymentResult';
import { CartDrawer } from './components/CartDrawer';
import { useAuthStore } from './store/useAuthStore';
import { useCartStore } from './store/useCartStore';
import { useWishlistStore } from './store/useWishlistStore';
import { ShoppingCart, User, LogOut, ShieldAlert, Heart, Bell } from 'lucide-react';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { items, fetchCart } = useCartStore();
  const { fetchWishlistIds } = useWishlistStore();
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCart();
      fetchWishlistIds();
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const totalCartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      {/* Global Navbar Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/15 group-hover:scale-105 transition-transform">
              A
            </span>
            <span className="text-base font-black text-slate-850 tracking-tight">
              Astra<span className="text-blue-600">Shop</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-655">
            <Link to="/" className={`hover:text-blue-600 transition-colors ${location.pathname === '/' ? 'text-blue-600' : ''}`}>
              Trang chủ
            </Link>
            <Link to="/products" className={`hover:text-blue-600 transition-colors ${location.pathname === '/products' ? 'text-blue-600' : ''}`}>
              Cửa hàng
            </Link>
            {user && (
              <Link to="/orders" className={`hover:text-blue-600 transition-colors ${location.pathname === '/orders' ? 'text-blue-600' : ''}`}>
                Đơn hàng
              </Link>
            )}
            {user && (
              <Link to="/vouchers" className={`hover:text-blue-600 transition-colors ${location.pathname === '/vouchers' ? 'text-blue-600' : ''}`}>
                Mã giảm giá
              </Link>
            )}
            {user && user.role === 'ADMIN' && (
              <Link to="/admin" className="flex items-center gap-1.5 text-amber-600 hover:text-amber-700 transition-colors">
                <ShieldAlert className="h-4 w-4" />
                Quản trị viên
              </Link>
            )}
          </nav>

          {/* Actions & User profile */}
          <div className="flex items-center gap-4">
            {/* Wishlist Link */}
            {user && (
              <Link 
                to="/wishlist" 
                aria-label="Danh sách yêu thích" 
                className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer hidden sm:block"
              >
                <Heart className="h-4.5 w-4.5" />
              </Link>
            )}

            {/* Cart trigger button */}
            {user && (
              <button
                onClick={() => setCartOpen(true)}
                aria-label="Giỏ hàng"
                className="relative p-2 text-slate-600 hover:text-blue-600 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ShoppingCart className="h-4.5 w-4.5" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white">
                    {totalCartCount}
                  </span>
                )}
              </button>
            )}

            {/* Profile Avatar / Login Register buttons */}
            {user ? (
              <div className="flex items-center gap-3 border-l border-slate-100 pl-4">
                <Link
                  to="/profile"
                  className="flex items-center gap-2.5 group"
                  title="Trang cá nhân"
                >
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${user.username}`}
                    alt={user.username}
                    className="h-8 w-8 rounded-full border border-slate-150 shadow-xs group-hover:ring-2 group-hover:ring-blue-500 transition-all"
                  />
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-black text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{user.fullName || user.username}</p>
                    <p className="text-[9px] font-bold text-slate-400 capitalize">{user.role}</p>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  aria-label="Đăng xuất"
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Cart Drawer Component */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Page Content routes */}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/vnpay-return" element={<VNPayReturn />} />
          <Route path="/payment/result" element={<PaymentResult />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/vouchers" element={<Vouchers />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>

      {/* Global Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 text-xs font-semibold">
          <div className="space-y-4">
            <h4 className="text-sm font-black text-white tracking-tight">Astra Shop</h4>
            <p className="text-slate-450 leading-relaxed">
              Trang mua sắm thiết bị công nghệ hàng đầu Việt Nam. Chất lượng tối ưu, dịch vụ hoàn hảo.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-4">Danh mục</h4>
            <ul className="space-y-2">
              <li><Link to="/products?category=1" className="hover:text-white transition-colors">Điện thoại</Link></li>
              <li><Link to="/products?category=2" className="hover:text-white transition-colors">Laptop</Link></li>
              <li><Link to="/products?category=3" className="hover:text-white transition-colors">Đồ gia dụng</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-4">Hỗ trợ</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Trung tâm trợ giúp</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Chính sách vận chuyển</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Chính sách bảo hành</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-4">Liên hệ</h4>
            <p className="leading-relaxed">Email: support@astrashop.local</p>
            <p className="mt-1">Điện thoại: 1900 6000</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-slate-800/60 text-center text-[10px] text-slate-500 font-bold">
          © 2026 Astra Shop. All rights reserved. Xây dựng Fullstack bởi Antigravity.
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
