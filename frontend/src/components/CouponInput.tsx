import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface CouponInputProps {
  onApplySuccess: (couponCode: string, discountAmount: number, total: number) => void;
  onClear: () => void;
  subtotal: number;
}

export const CouponInput: React.FC<CouponInputProps> = ({ onApplySuccess, onClear, subtotal }) => {
  const { user } = useAuthStore();
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<{ status: 'success' | 'error' | null; message: string }>({
    status: null,
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch collected vouchers to show in dropdown
  const fetchMyVouchers = async () => {
    if (!user) return;
    try {
      const res = await api.get('/api/auth/vouchers/my');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeAndUnexpired = (res.data.data || []).filter((v: any) => {
        if (!v.active) return false;
        if (v.end_date) {
          const expiry = new Date(v.end_date);
          expiry.setHours(0, 0, 0, 0);
          return today <= expiry;
        }
        return true;
      });
      setMyVouchers(activeAndUnexpired);
    } catch (err) {
      console.error('Failed to load user vouchers for dropdown', err);
    }
  };

  useEffect(() => {
    fetchMyVouchers();
  }, [user]);

  // Main apply function
  const applyCode = async (voucherCode: string) => {
    if (!voucherCode.trim()) return;

    setLoading(true);
    setFeedback({ status: null, message: '' });

    try {
      const res = await api.get(`/api/cart/apply-coupon?code=${voucherCode.trim()}`);
      const { coupon, discount, total } = res.data.data;
      setFeedback({
        status: 'success',
        message: `Áp dụng thành công! Giảm ${coupon.discount_percent}% (Tiết kiệm ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discount)})`,
      });
      onApplySuccess(coupon.code, discount, total);
    } catch (err: any) {
      setFeedback({
        status: 'error',
        message: err.response?.data?.message || 'Mã giảm giá không hợp lệ hoặc đã hết hạn!',
      });
      onClear();
    } finally {
      setLoading(false);
    }
  };

  // Check sessionStorage for stored coupon and auto-apply when subtotal becomes available
  useEffect(() => {
    const stored = sessionStorage.getItem('selectedCouponCode');
    if (stored && subtotal > 0) {
      setCode(stored);
      sessionStorage.removeItem('selectedCouponCode');
      applyCode(stored);
    }
  }, [subtotal]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    applyCode(code);
  };

  const handleRemove = () => {
    setCode('');
    setFeedback({ status: null, message: '' });
    onClear();
  };

  return (
    <div className="w-full relative">
      <form onSubmit={handleApply} className="flex gap-2">
        <div className="relative flex-1">
          <input 
            type="text"
            placeholder="Nhập mã giảm giá..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            disabled={feedback.status === 'success' || loading}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm uppercase font-semibold focus:border-slate-900 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
          />

          {/* Popover Dropdown list of user's coupons */}
          {showDropdown && feedback.status !== 'success' && user && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-150 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto p-1.5 animate-fade-in">
              {myVouchers.length === 0 ? (
                <div className="text-center py-4 text-xs font-semibold text-slate-455">
                  Không có voucher khả dụng trong ví
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="px-2.5 py-1 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Voucher khả dụng trong ví
                  </div>
                  {myVouchers.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setCode(v.code);
                        applyCode(v.code);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-blue-50/50 flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div className="font-semibold text-slate-700">
                        <span className="font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100 mr-2">
                          {v.code}
                        </span>
                        Giảm {v.discount_percent}%
                      </div>
                      {v.end_date && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          Hạn: {new Date(v.end_date).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {feedback.status === 'success' ? (
          <button 
            type="button"
            onClick={handleRemove}
            className="rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-650 hover:bg-red-100 transition-all cursor-pointer whitespace-nowrap"
          >
            Gỡ bỏ
          </button>
        ) : (
          <button 
            type="submit"
            disabled={loading || !code.trim()}
            className="rounded-xl bg-slate-900 px-5 text-xs font-bold text-white hover:bg-blue-600 transition-all disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer whitespace-nowrap"
          >
            {loading ? 'Đang áp dụng...' : 'Áp dụng'}
          </button>
        )}
      </form>

      {/* Visual Feedback */}
      {feedback.status && (
        <div className={`mt-2.5 flex items-start gap-2 rounded-xl p-3 text-xs ${
          feedback.status === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
            : 'bg-rose-50 text-rose-700 border border-rose-100'
        }`}>
          {feedback.status === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
          )}
          <span className="font-semibold">{feedback.message}</span>
        </div>
      )}
    </div>
  );
};
