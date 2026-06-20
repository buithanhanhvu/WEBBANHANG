import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import { 
  Ticket, Gift, Calendar, CheckCircle2, AlertCircle, Copy, Check, Loader2, ArrowRight
} from 'lucide-react';
import { Coupon } from '../types';

type ActiveTab = 'available' | 'my';
type MyVoucherFilter = 'usable' | 'expired';

interface ExtendedCoupon extends Coupon {
  collected?: number;
  collected_count?: number;
  collected_at?: string;
  sold_out?: number;
}

export const Vouchers: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>('available');
  // Wallet filter tabs
  const [myFilter, setMyFilter] = useState<MyVoucherFilter>('usable');

  // Data states
  const [availableVouchers, setAvailableVouchers] = useState<ExtendedCoupon[]>([]);
  const [myVouchers, setMyVouchers] = useState<ExtendedCoupon[]>([]);
  
  // Loading & feedback states
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ status: 'success' | 'error' | null; message: string }>({
    status: null,
    message: '',
  });
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [availRes, myRes] = await Promise.all([
        api.get('/api/auth/vouchers/available'),
        api.get('/api/auth/vouchers/my')
      ]);
      setAvailableVouchers(availRes.data.data || []);
      setMyVouchers(myRes.data.data || []);
    } catch (err: any) {
      console.error('Failed to load vouchers', err);
      setFeedback({
        status: 'error',
        message: 'Không thể tải danh sách mã giảm giá. Vui lòng thử lại sau.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleCollect = async (couponId: number) => {
    setActionLoadingId(couponId);
    setFeedback({ status: null, message: '' });
    try {
      const res = await api.post(`/api/auth/vouchers/collect/${couponId}`);
      setFeedback({
        status: 'success',
        message: `Thu thập mã giảm giá ${res.data.data.code} thành công! Đã thêm vào ví của bạn.`
      });
      // Refresh list
      await fetchData();
    } catch (err: any) {
      setFeedback({
        status: 'error',
        message: err.response?.data?.message || 'Không thể thu thập mã giảm giá này.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCopyCode = (couponId: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(couponId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Helper check to see if coupon is expired
  const isCouponExpired = (c: ExtendedCoupon) => {
    if (!c.active) return true;
    if (c.end_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(c.end_date);
      expiry.setHours(0, 0, 0, 0);
      return today > expiry;
    }
    return false;
  };

  // Filter My Vouchers
  const filteredMyVouchers = myVouchers.filter(c => {
    const expired = isCouponExpired(c);
    return myFilter === 'usable' ? !expired : expired;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Banner Hero */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3rem p-8 sm:p-10 mb-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/15 rounded-full -ml-20 -mb-20 blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left space-y-2.5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-white/10 text-blue-200 text-xs font-black rounded-full uppercase tracking-wider">
                <Gift className="h-3.5 w-3.5" /> Khuyến mãi đặc biệt
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Kho Voucher & Mã Giảm Giá
              </h1>
              <p className="text-sm text-blue-150 font-medium max-w-md">
                Thu thập các mã giảm giá hấp dẫn nhất để mua sắm tiết kiệm cùng AstraShop ngay hôm nay!
              </p>
            </div>
            <div className="hidden md:block">
              <div className="h-28 w-28 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center rotate-6 shadow-2xl">
                <Ticket className="h-14 w-14 text-blue-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback.status && (
          <div className={`flex items-start gap-3 p-4 rounded-2xl mb-6 text-xs sm:text-sm font-semibold border ${
            feedback.status === 'success'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
              : 'bg-rose-50 border-rose-100 text-rose-700'
          }`}>
            {feedback.status === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm mb-6">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'available'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Gift className="h-4 w-4" />
            Nhận Voucher giảm giá
          </button>
          <button
            onClick={() => { setActiveTab('my'); setFeedback({ status: null, message: '' }); }}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'my'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Ticket className="h-4 w-4" />
            Voucher của tôi ({myVouchers.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* AVAILABLE VOUCHERS LIST */}
            {activeTab === 'available' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black text-slate-850 uppercase tracking-wider">Mã giảm giá đang diễn ra</h2>
                  <span className="text-xs text-slate-400 font-bold">{availableVouchers.length} mã khả dụng</span>
                </div>

                {availableVouchers.length === 0 ? (
                  <div className="text-center py-16 px-4 bg-white border border-slate-100 rounded-3rem shadow-xs text-slate-400">
                    <Ticket className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                    <p className="text-xs font-bold">Hiện không có mã giảm giá nào để thu thập.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {availableVouchers.map((voucher) => {
                      const isCollected = voucher.collected === 1;
                      const isSoldOut = voucher.sold_out === 1;
                      return (
                        <div 
                          key={voucher.id} 
                          className={`relative flex bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden group transition-all duration-300 hover:shadow-md hover:border-slate-200/80 ${
                            isCollected || isSoldOut ? 'opacity-80' : ''
                          }`}
                        >
                          {/* Circular cutout decorations to look like a ticket */}
                          <div className="absolute top-1/2 -translate-y-1/2 -left-3.5 w-7 h-7 bg-slate-50 rounded-full border-r border-slate-100/80 z-10" />
                          <div className="absolute top-1/2 -translate-y-1/2 -right-3.5 w-7 h-7 bg-slate-50 rounded-full border-l border-slate-100/80 z-10" />

                          {/* Left Panel: Discount representation */}
                          <div className="w-24 sm:w-28 shrink-0 bg-gradient-to-br from-blue-600 to-indigo-650 flex flex-col items-center justify-center text-white p-3 relative select-none">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:10px_10px]" />
                            <span className="text-2xl sm:text-3xl font-black tracking-tighter relative z-10">
                              {voucher.discount_percent}
                              <span className="text-sm font-extrabold">%</span>
                            </span>
                            <span className="text-[9px] font-extrabold text-blue-200/90 tracking-widest uppercase mt-1 relative z-10">
                              Discount
                            </span>
                          </div>

                          {/* Dotted border separator */}
                          <div className="w-0 border-r-2 border-dashed border-slate-200/60 my-3 relative z-10" />

                          {/* Right Panel: Content */}
                          <div className="flex-1 p-4.5 pl-6 flex flex-col justify-between min-w-0">
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded uppercase tracking-wider border border-blue-100">
                                  {voucher.code}
                                </span>
                              </div>
                              <h3 className="text-xs font-bold text-slate-800 line-clamp-1 mb-1">
                                Giảm {voucher.discount_percent}% tổng giá trị đơn hàng
                              </h3>
                              
                              <p className="text-[10.5px] text-slate-400 font-semibold flex items-center gap-1.5 mt-2">
                                <Calendar className="h-3 w-3 shrink-0" />
                                Hạn dùng: {voucher.end_date ? new Date(voucher.end_date).toLocaleDateString('vi-VN') : 'Không thời hạn'}
                              </p>
                              

                            </div>

                            <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-50">
                              <button
                                onClick={() => handleCopyCode(voucher.id, voucher.code)}
                                className="flex items-center gap-1 text-[10px] font-bold text-slate-450 hover:text-slate-800 transition-colors cursor-pointer"
                                title="Sao chép mã"
                              >
                                {copiedId === voucher.id ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                    <span className="text-emerald-500">Đã sao chép</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>Sao chép mã</span>
                                  </>
                                )}
                              </button>

                              {isCollected ? (
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-emerald-650 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                                  <Check className="h-3.5 w-3.5" /> Đã nhận
                                </span>
                              ) : isSoldOut ? (
                                <span className="text-[10.5px] font-extrabold text-slate-400 bg-slate-55 px-3 py-1.5 rounded-xl">
                                  Hết lượt nhận
                                </span>
                              ) : (
                                <button
                                  disabled={actionLoadingId === voucher.id}
                                  onClick={() => handleCollect(voucher.id)}
                                  className="px-4 py-1.5 bg-slate-900 hover:bg-blue-650 disabled:bg-slate-200 disabled:text-slate-450 text-white text-[10.5px] font-extrabold rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1"
                                >
                                  {actionLoadingId === voucher.id ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      Đang nhận...
                                    </>
                                  ) : (
                                    'Thu thập ngay'
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* MY COLLECTED VOUCHERS LIST */}
            {activeTab === 'my' && (
              <div>
                {/* Wallet Filter Buttons */}
                <div className="flex gap-2 mb-5">
                  <button
                    onClick={() => setMyFilter('usable')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      myFilter === 'usable'
                        ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-100'
                    }`}
                  >
                    Có thể sử dụng ({myVouchers.filter(c => !isCouponExpired(c)).length})
                  </button>
                  <button
                    onClick={() => setMyFilter('expired')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      myFilter === 'expired'
                        ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-100'
                    }`}
                  >
                    Đã hết hạn / Không khả dụng ({myVouchers.filter(c => isCouponExpired(c)).length})
                  </button>
                </div>

                {filteredMyVouchers.length === 0 ? (
                  <div className="text-center py-16 px-4 bg-white border border-slate-100 rounded-3rem shadow-xs text-slate-400">
                    <Ticket className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                    <p className="text-xs font-bold">Không tìm thấy voucher phù hợp trong ví của bạn.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredMyVouchers.map((voucher) => {
                      const isExpired = isCouponExpired(voucher);
                      return (
                        <div 
                          key={voucher.id} 
                          className={`relative flex bg-white border rounded-2xl shadow-xs overflow-hidden group transition-all duration-300 hover:shadow-md ${
                            isExpired ? 'opacity-65 border-slate-200' : 'border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          {/* Circular cutout decorations to look like a ticket */}
                          <div className="absolute top-1/2 -translate-y-1/2 -left-3.5 w-7 h-7 bg-slate-50 rounded-full border-r border-slate-150 z-10" />
                          <div className="absolute top-1/2 -translate-y-1/2 -right-3.5 w-7 h-7 bg-slate-50 rounded-full border-l border-slate-150 z-10" />

                          {/* Left Panel */}
                          <div className={`w-24 sm:w-28 shrink-0 flex flex-col items-center justify-center text-white p-3 relative select-none ${
                            isExpired ? 'bg-slate-450' : 'bg-gradient-to-br from-emerald-500 to-teal-650'
                          }`}>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:10px_10px]" />
                            <span className="text-2xl sm:text-3xl font-black tracking-tighter relative z-10">
                              {voucher.discount_percent}
                              <span className="text-sm font-extrabold">%</span>
                            </span>
                            <span className="text-[9px] font-extrabold text-emerald-100 tracking-widest uppercase mt-1 relative z-10">
                              Voucher
                            </span>
                          </div>

                          {/* Dotted border separator */}
                          <div className="w-0 border-r-2 border-dashed border-slate-200/60 my-3 relative z-10" />

                          {/* Right Panel */}
                          <div className="flex-1 p-4.5 pl-6 flex flex-col justify-between min-w-0">
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-wider border ${
                                  isExpired 
                                    ? 'bg-slate-100 text-slate-500 border-slate-200' 
                                    : 'bg-emerald-50 text-emerald-650 border-emerald-100'
                                }`}>
                                  {voucher.code}
                                </span>
                                {voucher.collected_at && (
                                  <span className="text-[9px] text-slate-400 font-bold">
                                    Đã thu thập: {new Date(voucher.collected_at).toLocaleDateString('vi-VN')}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-xs font-bold text-slate-800 line-clamp-1 mb-1">
                                Giảm {voucher.discount_percent}% tổng giá trị đơn hàng
                              </h3>
                              
                              <p className="text-[10.5px] text-slate-400 font-semibold flex items-center gap-1.5 mt-2">
                                <Calendar className="h-3 w-3 shrink-0" />
                                Hạn sử dụng: {voucher.end_date ? new Date(voucher.end_date).toLocaleDateString('vi-VN') : 'Không thời hạn'}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-50">
                              <button
                                onClick={() => handleCopyCode(voucher.id, voucher.code)}
                                className="flex items-center gap-1 text-[10px] font-bold text-slate-450 hover:text-slate-800 transition-colors cursor-pointer"
                                title="Sao chép mã"
                              >
                                {copiedId === voucher.id ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                    <span className="text-emerald-500">Đã sao chép</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>Sao chép mã</span>
                                  </>
                                )}
                              </button>

                              {isExpired ? (
                                <span className="text-[10px] font-black text-rose-650 bg-rose-50 border border-rose-100 px-3 py-1 rounded-lg">
                                  Hết hạn / Khóa
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    sessionStorage.setItem('selectedCouponCode', voucher.code);
                                    navigate('/cart');
                                  }}
                                  className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-650 hover:text-emerald-700 transition-colors cursor-pointer"
                                >
                                  Dùng ngay <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default Vouchers;
