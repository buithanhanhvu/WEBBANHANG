import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { CouponInput } from '../components/CouponInput';
import api from '../services/api';
import { CreditCard, Truck, MessageSquare, ArrowLeft, Loader2, CheckCircle2, Ticket } from 'lucide-react';

interface CheckoutFormInput {
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  note: string;
}

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCartStore();
  const user = useAuthStore((state) => state.user);

  // Coupon state
  const [couponCode, setCouponCode] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [appliedTotal, setAppliedTotal] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<CheckoutFormInput>({
    defaultValues: {
      shippingName: user?.fullName || '',
      shippingPhone: user?.phone || '',
      shippingAddress: user?.address || '',
      note: ''
    }
  });

  const handleApplyCoupon = (code: string, discount: number, total: number) => {
    setCouponCode(code);
    setDiscountAmount(discount);
    setAppliedTotal(total);
  };

  const handleClearCoupon = () => {
    setCouponCode('');
    setDiscountAmount(0);
    setAppliedTotal(null);
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const onSubmit = async (data: CheckoutFormInput) => {
    setLoading(true);
    try {
      const payload = {
        couponCode: couponCode || null,
        shippingName: data.shippingName,
        shippingAddress: data.shippingAddress,
        shippingPhone: data.shippingPhone,
        note: data.note
      };

      const res = await api.post('/api/orders', payload);
      const placedOrder = res.data.data;
      setOrderId(placedOrder.id);
      
      // Simulate payment processing / loading overlay
      setTimeout(() => {
        clearCart();
        setIsSuccess(true);
        setLoading(false);
      }, 1500);

    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo đơn hàng, vui lòng thử lại!');
      setLoading(false);
    }
  };

  // If success view is active
  if (isSuccess) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center animate-fade-in">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 shadow-md text-emerald-500 mb-8 animate-bounce">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-3">Đặt hàng thành công!</h1>
        <p className="text-sm font-semibold text-slate-450 mb-8">
          Đơn hàng <span className="text-slate-800 font-extrabold">#{orderId}</span> của bạn đã được tiếp nhận và đang xử lý.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/orders')}
            className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-slate-800 transition-all cursor-pointer"
          >
            Theo dõi đơn hàng
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3.5 bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    );
  }

  // If cart is empty
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-850">Giỏ hàng của bạn đang trống</h2>
        <p className="text-xs font-semibold text-slate-400 mt-2 mb-6">Thêm sản phẩm trước khi thanh toán.</p>
        <Link to="/products" className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline">
          <ArrowLeft className="h-4 w-4" /> Quay lại cửa hàng
        </Link>
      </div>
    );
  }

  const finalTotal = appliedTotal !== null ? appliedTotal : subtotal;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Back to Cart */}
      <Link to="/cart" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-855 mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Quay lại giỏ hàng
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form - Left (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3rem p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-black text-slate-800 tracking-tight mb-6 flex items-center gap-2.5">
              <Truck className="h-5.5 w-5.5 text-blue-600" />
              Thông tin giao hàng
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label htmlFor="shippingName" className="text-xs font-bold text-slate-500 tracking-wide uppercase">Họ và tên người nhận</label>
                <input
                  id="shippingName"
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  {...register('shippingName', { required: 'Họ và tên người nhận không được để trống' })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                />
                {errors.shippingName && (
                  <p className="text-xs text-red-500 font-bold mt-1">{errors.shippingName.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label htmlFor="shippingPhone" className="text-xs font-bold text-slate-500 tracking-wide uppercase">Số điện thoại</label>
                <input
                  id="shippingPhone"
                  type="tel"
                  placeholder="Ví dụ: 0912345678"
                  maxLength={11}
                  {...register('shippingPhone', { 
                    required: 'Số điện thoại không được để trống',
                    pattern: {
                      value: /^\d{9,11}$/,
                      message: 'Số điện thoại không hợp lệ (phải gồm 9-11 chữ số)'
                    }
                  })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                />
                {errors.shippingPhone && (
                  <p className="text-xs text-red-500 font-bold mt-1">{errors.shippingPhone.message}</p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label htmlFor="shippingAddress" className="text-xs font-bold text-slate-500 tracking-wide uppercase">Địa chỉ chi tiết</label>
                <input
                  id="shippingAddress"
                  type="text"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  {...register('shippingAddress', { required: 'Địa chỉ giao hàng không được để trống' })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                />
                {errors.shippingAddress && (
                  <p className="text-xs text-red-500 font-bold mt-1">{errors.shippingAddress.message}</p>
                )}
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label htmlFor="shippingNote" className="text-xs font-bold text-slate-500 tracking-wide uppercase flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Ghi chú đơn hàng (Tùy chọn)
                </label>
                <textarea
                  id="shippingNote"
                  rows={3}
                  placeholder="Ví dụ: Giao ngoài giờ hành chính, gọi điện trước khi giao..."
                  {...register('note')}
                  className="w-full p-4 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-all shadow-sm resize-none"
                />
              </div>

              {/* Simulated Payment details info */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <CreditCard className="h-4.5 w-4.5 text-indigo-500" />
                  Phương thức thanh toán
                </h3>
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-blue-800">Thanh toán khi nhận hàng (COD)</p>
                    <p className="text-[10px] text-blue-500 font-semibold mt-0.5">Không tốn phí dịch vụ, thanh toán bằng tiền mặt khi nhận hàng.</p>
                  </div>
                  <input defaultChecked type="radio" className="h-4 w-4 accent-blue-600" />
                </div>
              </div>

              {/* Action Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-850 text-white text-sm font-extrabold active:scale-98 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-200 disabled:text-slate-450 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    Đang xử lý đặt hàng...
                  </>
                ) : (
                  `Xác nhận đặt hàng (${formatPrice(finalTotal)})`
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar Order Summary - Right (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-50 border border-slate-100 rounded-3rem p-6 shadow-inner-sm">
            <h3 className="text-base font-black text-slate-800 tracking-tight mb-4">Đơn hàng của bạn</h3>
            
            {/* Items List */}
            <div className="max-h-64 overflow-y-auto space-y-3.5 divide-y divide-slate-100 pr-1.5">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 items-center pt-3.5 first:pt-0">
                  <img
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}
                    alt={item.name}
                    className="h-12 w-12 rounded-xl object-cover border border-slate-100 bg-white shadow-sm flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Số lượng: {item.quantity}</p>
                  </div>
                  <span className="text-xs font-extrabold text-slate-700">
                    {formatPrice(item.salePrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon Application Area */}
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-2.5">
              <span className="text-xs font-bold text-slate-500 tracking-wide uppercase flex items-center gap-1.5">
                <Ticket className="h-3.5 w-3.5" />
                Mã giảm giá
              </span>
              <CouponInput
                onApplySuccess={handleApplyCoupon}
                onClear={handleClearCoupon}
                subtotal={subtotal}
              />
            </div>

            {/* Recalculated pricing totals */}
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-2.5 text-xs font-bold text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Tạm tính:</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              
              {discountAmount > 0 && (
                <div className="flex justify-between text-red-650">
                  <span>Giảm giá ({couponCode}):</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-slate-400">Phí giao hàng:</span>
                <span className="text-emerald-650">Miễn phí</span>
              </div>

              <div className="flex justify-between items-baseline pt-4 border-t border-slate-100 text-sm font-black text-slate-800">
                <span>Tổng tiền thanh toán:</span>
                <span className="text-lg text-red-650">{formatPrice(finalTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
