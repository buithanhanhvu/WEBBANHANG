import React, { useState } from 'react';
import api from '../services/api';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface CouponInputProps {
  onApplySuccess: (couponCode: string, discountAmount: number, total: number) => void;
  onClear: () => void;
  subtotal: number;
}

export const CouponInput: React.FC<CouponInputProps> = ({ onApplySuccess, onClear }) => {
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<{ status: 'success' | 'error' | null; message: string }>({
    status: null,
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setFeedback({ status: null, message: '' });

    try {
      const res = await api.get(`/api/cart/apply-coupon?code=${code.trim()}`);
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

  const handleRemove = () => {
    setCode('');
    setFeedback({ status: null, message: '' });
    onClear();
  };

  return (
    <div className="w-full">
      <form onSubmit={handleApply} className="flex gap-2">
        <input 
          type="text"
          placeholder="Nhập mã giảm giá..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={feedback.status === 'success' || loading}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm uppercase font-semibold focus:border-slate-900 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
        />
        {feedback.status === 'success' ? (
          <button 
            type="button"
            onClick={handleRemove}
            className="rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-600 hover:bg-red-100 transition-all cursor-pointer"
          >
            Gỡ bỏ
          </button>
        ) : (
          <button 
            type="submit"
            disabled={loading || !code.trim()}
            className="rounded-xl bg-slate-900 px-5 text-xs font-bold text-white hover:bg-blue-600 transition-all disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer"
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
