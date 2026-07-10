import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ShoppingBag, Home } from 'lucide-react';

/**
 * Trang hiển thị kết quả sau khi VNPAY redirect về.
 * URL mẫu: /payment/result?status=success&orderId=42
 *          /payment/result?status=failed&orderId=42
 */
export const PaymentResult: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const status = searchParams.get('status'); // 'success' | 'failed'
  const orderId = searchParams.get('orderId');

  const [countdown, setCountdown] = useState(5);

  const isSuccess = status === 'success';

  // Tự động điều hướng sau 5 giây
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isSuccess) {
            navigate('/orders');
          } else {
            navigate('/cart');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSuccess, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center animate-fade-in">

        {/* Icon */}
        {isSuccess ? (
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-500 mb-6 mx-auto animate-bounce">
            <CheckCircle2 className="h-12 w-12" />
          </div>
        ) : (
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-red-50 border-2 border-red-200 text-red-500 mb-6 mx-auto">
            <XCircle className="h-12 w-12" />
          </div>
        )}

        {/* Title */}
        <h1 className={`text-3xl font-black tracking-tight mb-3 ${isSuccess ? 'text-slate-800' : 'text-red-600'}`}>
          {isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
        </h1>

        {/* Subtitle */}
        <p className="text-sm font-semibold text-slate-500 mb-2">
          {isSuccess
            ? <>Đơn hàng <span className="text-slate-800 font-extrabold">#{orderId}</span> đã được thanh toán và đang xử lý.</>
            : <>Giao dịch không thành công{orderId ? <> cho đơn hàng <span className="font-extrabold text-slate-700">#{orderId}</span></> : ''}. Vui lòng thử lại.</>
          }
        </p>

        {/* VNPAY branding */}
        <div className="flex items-center justify-center gap-2 my-4">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Thanh toán qua</span>
          <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">VNPAY</span>
        </div>

        {/* Auto-redirect countdown */}
        <p className="text-[11px] text-slate-400 font-semibold mb-8">
          Tự động chuyển trang sau <span className="font-black text-slate-600">{countdown}s</span>
          {isSuccess ? ' (Đơn hàng của tôi)' : ' (Giỏ hàng)'}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isSuccess ? (
            <>
              <button
                onClick={() => navigate('/orders')}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-slate-800 transition-all cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4" />
                Xem đơn hàng
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
              >
                <Home className="h-4 w-4" />
                Tiếp tục mua sắm
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/cart')}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-red-600 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-red-700 transition-all cursor-pointer"
              >
                Quay lại giỏ hàng
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
              >
                <Home className="h-4 w-4" />
                Về trang chủ
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
