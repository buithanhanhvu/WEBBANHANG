import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Order } from '../types';
import { OrderStatusStepper } from '../components/OrderStatusStepper';
import api from '../services/api';
import { ShoppingBag, ArrowLeft, Loader2, Calendar, FileText, CheckCircle2, Trash2 } from 'lucide-react';

export const MyOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    api.get('/api/orders')
      .then((res) => {
        setOrders(res.data.data || []);
        // Automatically select the first order if available
        if (res.data.data && res.data.data.length > 0) {
          setSelectedOrder(res.data.data[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch orders', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) {
      return;
    }
    setCancellingId(orderId);
    try {
      await api.delete(`/api/orders/${orderId}/cancel`);
      alert('Hủy đơn hàng thành công!');
      
      // Update selected order status to CANCELLED in local state
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'CANCELLED' });
      }
      
      // Re-fetch all orders
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra, không thể hủy đơn hàng!');
    } finally {
      setCancellingId(null);
    }
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-indigo-650" />
            Đơn hàng của tôi
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">Lịch sử và trạng thái mua sắm của bạn</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-650 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Tiếp tục mua sắm
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 bg-white border border-slate-100 rounded-3rem p-8 text-center shadow-inner-sm">
          <ShoppingBag className="h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-lg font-black text-slate-700">Bạn chưa có đơn hàng nào</h2>
          <p className="text-sm text-slate-400 font-semibold mt-2 mb-6">Bắt đầu chọn mua những sản phẩm tuyệt vời của chúng tôi.</p>
          <button
            onClick={() => navigate('/products')}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-slate-800 transition-all cursor-pointer"
          >
            Khám phá sản phẩm ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Orders List - Left (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-500 tracking-wide uppercase px-2">Danh sách đơn</h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-5 rounded-3xl border transition-all duration-350 cursor-pointer flex flex-col justify-between hover:shadow-sm ${
                    selectedOrder?.id === order.id
                      ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                      : 'bg-white border-slate-100 text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-[10px] font-black tracking-widest uppercase ${
                        selectedOrder?.id === order.id ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        Đơn hàng #{order.id}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Calendar className="h-3.5 w-3.5 opacity-60" />
                        <span className="text-xs font-semibold">
                          {new Date(order.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`rounded-xl px-2.5 py-1 text-[10px] font-extrabold tracking-wider ${
                      order.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                      order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'SHIPPING' ? 'bg-indigo-100 text-indigo-800' :
                      order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-dashed border-slate-700/20 flex justify-between items-baseline">
                    <span className={`text-xs ${selectedOrder?.id === order.id ? 'text-slate-300' : 'text-slate-500'}`}>
                      Tổng tiền:
                    </span>
                    <span className="text-sm font-black">
                      {formatPrice(order.total_amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Details - Right (7 cols) */}
          <div className="lg:col-span-7">
            {selectedOrder ? (
              <div className="bg-white border border-slate-100 rounded-3rem p-6 sm:p-8 shadow-sm space-y-6">
                {/* Detail Header */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start border-b border-slate-100 pb-5">
                  <div>
                    <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                      <FileText className="h-4.5 w-4.5 text-indigo-500" />
                      Chi tiết đơn hàng #{selectedOrder.id}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                      Đặt lúc: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  
                  {/* Cancel Button */}
                  {selectedOrder.status === 'PENDING' && (
                    <button
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                      disabled={cancellingId === selectedOrder.id}
                      className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-650 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      {cancellingId === selectedOrder.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Hủy đơn hàng
                    </button>
                  )}
                </div>

                {/* Status Stepper */}
                <div className="py-2">
                  <OrderStatusStepper status={selectedOrder.status} />
                </div>

                {/* Shipping Details */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3.5 text-xs font-semibold text-slate-600">
                  <h4 className="font-extrabold text-slate-850 tracking-wide uppercase">Thông tin người nhận</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-semibold">
                    <div>
                      <span className="text-slate-405 block mb-0.5">Người nhận:</span>
                      <span className="text-slate-800 font-extrabold">{selectedOrder.shipping_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-405 block mb-0.5">Số điện thoại:</span>
                      <span className="text-slate-800 font-extrabold">{selectedOrder.shipping_phone}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-405 block mb-0.5">Địa chỉ giao hàng:</span>
                      <span className="text-slate-800 font-extrabold">{selectedOrder.shipping_address}</span>
                    </div>
                    {selectedOrder.note && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-405 block mb-0.5">Ghi chú:</span>
                        <span className="text-slate-700 italic">{selectedOrder.note}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ordered Items */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 tracking-wide uppercase px-1">Sản phẩm đã mua</h4>
                  
                  <div className="divide-y divide-slate-100 border border-slate-150/40 rounded-2xl overflow-hidden bg-white shadow-sm">
                    {selectedOrder.items?.map((item) => (
                      <div key={item.id} className="flex gap-4 p-4 items-center">
                        <img
                          src={item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}
                          alt={item.product_name}
                          className="h-11 w-11 rounded-lg object-cover border border-slate-100 bg-white"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-slate-800 truncate">{item.product_name}</h5>
                          <p className="text-[10px] text-slate-450 font-bold mt-0.5">
                            Đơn giá: {formatPrice(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <span className="text-xs font-extrabold text-slate-850">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recalculated pricing totals */}
                <div className="border-t border-slate-100 pt-5 space-y-2 text-xs font-bold text-slate-650 text-right">
                  {selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between sm:justify-end gap-16 text-red-650">
                      <span>Voucher giảm giá:</span>
                      <span>-{formatPrice(selectedOrder.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between sm:justify-end gap-16 items-baseline pt-2 border-t border-slate-100 text-sm font-black text-slate-800">
                    <span>Tổng cộng thanh toán:</span>
                    <span className="text-base text-red-650">{formatPrice(selectedOrder.total_amount)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-100 rounded-3rem p-16 text-center h-full flex flex-col items-center justify-center text-slate-400 font-semibold text-xs shadow-inner-sm">
                Chọn một đơn hàng từ danh sách để xem chi tiết.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
