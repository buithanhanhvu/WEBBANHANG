import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useCartStore } from '../store/useCartStore';

export const VNPayReturn: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clearCart = useCartStore((s) => s.clearCart);

  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((v, k) => (params[k] = v));

    api
      .get('/api/vnpay/return', { params })
      .then((res) => {
        const data = res.data.data;
        if (data.success) {
          clearCart();
          setOrderId(data.orderId);
          setStatus('success');
        } else {
          setOrderId(data.orderId);
          setStatus('failed');
        }
      })
      .catch(() => setStatus('failed'));
  }, []);

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-slate-400" />
        <p className="mt-4 text-sm font-semibold text-slate-500">Đang xác nhận thanh toán...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center animate-fade-in">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 shadow-md text-emerald-500 mb-8">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-3">Thanh toán thành công!</h1>
        <p className="text-sm font-semibold text-slate-500 mb-8">
          Đơn hàng <span className="text-slate-800 font-extrabold">#{orderId}</span> đã được xác nhận thanh toán qua VNPAY.
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

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center animate-fade-in">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-50 border border-red-100 shadow-md text-red-500 mb-8">
        <XCircle className="h-10 w-10" />
      </div>
      <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-3">Thanh toán thất bại</h1>
      <p className="text-sm font-semibold text-slate-500 mb-8">
        Giao dịch không thành công hoặc đã bị huỷ.
        {orderId && (
          <> Đơn hàng <span className="text-slate-800 font-extrabold">#{orderId}</span> đã bị huỷ.</>
        )}
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => navigate('/cart')}
          className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-slate-800 transition-all cursor-pointer"
        >
          Quay lại giỏ hàng
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3.5 bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
        >
          Về trang chủ
        </button>
      </div>
    </div>
  );
};
