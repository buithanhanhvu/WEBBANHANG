import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { CouponInput } from '../components/CouponInput';
import { Trash2, ShoppingBag, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';

export const Cart: React.FC = () => {
  const { items, subtotal, loading, fetchCart, updateItem, removeItem } = useCartStore();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  // Selected coupon discount state managed in parent/session if needed
  const [couponCode, setCouponCode] = React.useState<string>('');
  const [discountPercent, setDiscountPercent] = React.useState<number>(0);

  useEffect(() => {
    if (user) {
      fetchCart();
    }
  }, [user]);

  const handleQuantityChange = async (productId: number, currentQty: number, change: number, stock: number) => {
    const newQty = currentQty + change;
    if (newQty < 1 || newQty > stock) return;
    try {
      await updateItem(productId, newQty);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async (productId: number) => {
    if (window.confirm('Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?')) {
      try {
        await removeItem(productId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const [discountAmount, setDiscountAmount] = React.useState<number>(0);
  const [appliedTotal, setAppliedTotal] = React.useState<number | null>(null);

  const handleApplySuccess = (code: string, discount: number, total: number) => {
    setCouponCode(code);
    setDiscountAmount(discount);
    setAppliedTotal(total);
  };

  const handleClear = () => {
    setCouponCode('');
    setDiscountAmount(0);
    setAppliedTotal(null);
  };

  const totalAmount = appliedTotal !== null ? appliedTotal : subtotal;

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <div className="flex flex-col items-center justify-center">
          <ShoppingBag className="h-16 w-16 text-slate-300 mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-slate-800">Giỏ hàng của bạn đang trống</h2>
          <p className="text-xs font-semibold text-slate-400 mt-2 max-w-sm">Đăng nhập tài khoản của bạn để xem và lưu trữ giỏ hàng.</p>
          <Link
            to="/login"
            className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-slate-800 transition-all"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <div className="flex flex-col items-center justify-center">
          <ShoppingBag className="h-16 w-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Giỏ hàng trống</h2>
          <p className="text-xs font-semibold text-slate-400 mt-2">Duyệt qua danh sách sản phẩm và thêm sản phẩm yêu thích.</p>
          <Link
            to="/"
            className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-slate-800 transition-all"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 relative">
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex items-center justify-center z-40 rounded-3xl">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      )}

      <h1 className="text-2xl font-black text-slate-850 tracking-tight mb-8">Giỏ hàng của bạn</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm transition-all hover:shadow-md relative overflow-hidden">
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-50 border border-slate-100">
                <img 
                  src={item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'} 
                  alt={item.name} 
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-850 line-clamp-1">{item.name}</h3>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-sm font-black text-slate-900">{formatPrice(item.salePrice)}</span>
                    {item.discountPercent > 0 && (
                      <span className="text-xs text-slate-400 line-through">{formatPrice(item.price)}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3">
                  {/* Quantity Actions */}
                  <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50 shadow-inner-sm">
                    <button
                      onClick={() => handleQuantityChange(item.productId, item.quantity, -1, item.stock)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white text-slate-500 font-bold transition-all disabled:opacity-50"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-700">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.productId, item.quantity, 1, item.stock)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white text-slate-500 font-bold transition-all disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(item.productId)}
                    className="text-red-500 hover:text-red-750 transition-colors p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Continue shopping link */}
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 py-2">
            <ArrowLeft className="h-4 w-4" /> Tiếp tục lựa chọn sản phẩm
          </Link>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1 space-y-6">
          {/* Coupon Panel */}
          <CouponInput 
            onApplySuccess={handleApplySuccess} 
            onClear={handleClear} 
            subtotal={subtotal} 
          />

          {/* Checkout Info */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4">Chi tiết hóa đơn</h3>
            
            <div className="space-y-3 font-semibold text-sm text-slate-500">
              <div className="flex justify-between">
                <span>Tạm tính</span>
                <span className="text-slate-800 font-bold">{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-red-650 bg-red-50 p-2.5 rounded-xl border border-red-100">
                  <span className="text-xs">Mã giảm giá ({couponCode})</span>
                  <span className="text-xs font-bold">-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <hr className="border-slate-100" />
              <div className="flex justify-between text-base">
                <span className="text-slate-800 font-black">Tổng thanh toán</span>
                <span className="text-slate-900 font-black text-lg">{formatPrice(totalAmount)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full mt-6 py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-extrabold hover:bg-slate-800 active:scale-98 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              Tiến hành đặt hàng
              <ArrowRight className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
