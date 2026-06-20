import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useWishlistStore } from '../store/useWishlistStore';
import { useAuthStore } from '../store/useAuthStore';
import { ProductCard } from '../components/ProductCard';
import { Heart, Loader2, ArrowLeft } from 'lucide-react';

export const Wishlist: React.FC = () => {
  const { items, loading, fetchWishlist } = useWishlistStore();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchWishlist();
  }, [user, navigate]);

  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Quay lại trang chủ
        </Link>

        {/* Title */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 border border-red-100">
            <Heart className="h-5 w-5 fill-current" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-850 tracking-tight">Sản phẩm yêu thích</h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Danh sách các sản phẩm bạn đã lưu</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 px-4 bg-white border border-slate-100 rounded-3rem shadow-sm text-slate-400 max-w-xl mx-auto">
            <Heart className="h-12 w-12 mx-auto text-slate-200 mb-4" />
            <h3 className="text-sm font-black text-slate-800 mb-2">Danh sách yêu thích trống</h3>
            <p className="text-xs text-slate-450 mb-6 font-semibold">
              Hãy lướt xem các sản phẩm và nhấn nút hình Trái tim để lưu sản phẩm bạn quan tâm.
            </p>
            <Link
              to="/products"
              className="inline-block px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl transition-all shadow-md"
            >
              Xem sản phẩm ngay
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => navigate(`/product/${product.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
