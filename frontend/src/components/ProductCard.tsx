import React from 'react';
import { Product } from '../types';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useWishlistStore } from '../store/useWishlistStore';
import { ShoppingCart, Star, Heart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const addItem = useCartStore((state) => state.addItem);
  const user = useAuthStore((state) => state.user);
  const { wishlistIds, toggleWishlist } = useWishlistStore();

  const isWishlisted = wishlistIds.includes(product.id);

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      alert('Vui lòng đăng nhập để mua hàng!');
      return;
    }
    try {
      await addItem(product.id, 1);
      alert('Đã thêm sản phẩm vào giỏ hàng!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra!');
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      alert('Vui lòng đăng nhập để lưu sản phẩm yêu thích!');
      return;
    }
    try {
      await toggleWishlist(product.id);
    } catch (err) {
      console.error('Failed to toggle wishlist item', err);
    }
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div 
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer"
    >
      {/* Image container */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
        <img 
          src={product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'} 
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Discount badge */}
        {product.discount_percent > 0 && (
          <div className="absolute top-3 left-3 rounded-lg bg-red-500 px-2 py-1 text-xs font-bold text-white shadow-sm z-10">
            -{product.discount_percent}%
          </div>
        )}

        {/* Wishlist toggle button */}
        {user && (
          <button
            onClick={handleToggleWishlist}
            className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-xs rounded-xl shadow-sm border border-slate-100/50 hover:bg-white text-slate-400 hover:text-red-500 hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title={isWishlisted ? "Xóa khỏi danh sách yêu thích" : "Thêm vào danh sách yêu thích"}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? "fill-current text-red-500" : ""}`} />
          </button>
        )}

        {/* Featured badge */}
        {product.featured && (
          <div className={`absolute rounded-lg bg-amber-500 px-2 py-1 text-xs font-bold text-white shadow-sm z-10 ${user ? 'top-13 right-3' : 'top-3 right-3'}`}>
            Nổi bật
          </div>
        )}
      </div>

      {/* Product Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Brand */}
        {product.brand && (
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            {product.brand}
          </span>
        )}
        
        {/* Title */}
        <h3 className="mt-1 text-sm font-semibold text-slate-800 line-clamp-2 min-h-[40px] group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>

        {/* Rating and review counts */}
        <div className="mt-2 flex items-center gap-1">
          <div className="flex items-center text-amber-400">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span className="text-xs font-bold text-slate-700 ml-1">{product.average_rating}</span>
          </div>
          <span className="text-[10px] text-slate-400">( {product.review_count} đánh giá )</span>
        </div>

        {/* Price section */}
        <div className="mt-auto pt-3 flex items-baseline justify-between">
          <div className="flex flex-col">
            {product.discount_percent > 0 ? (
              <>
                <span className="text-xs text-slate-400 line-through">
                  {formatPrice(product.price)}
                </span>
                <span className="text-base font-extrabold text-red-650">
                  {formatPrice(product.sale_price)}
                </span>
              </>
            ) : (
              <span className="text-base font-extrabold text-slate-900">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {/* Quick Add Button */}
          <button 
            onClick={handleQuickAdd}
            disabled={product.stock <= 0}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white transition-all hover:bg-blue-650 disabled:bg-slate-200 disabled:text-slate-450 cursor-pointer"
            title="Thêm nhanh vào giỏ"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
