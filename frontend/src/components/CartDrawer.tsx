import React, { useEffect } from 'react';
import { useCartStore } from '../store/useCartStore';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { items, subtotal, fetchCart, updateItem, removeItem } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchCart();
    }
  }, [isOpen]);

  const handleQtyChange = async (productId: number, newQty: number) => {
    try {
      await updateItem(productId, newQty);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra!');
    }
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-350"
        />
      )}

      {/* Drawer Container */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-slate-800" />
            <h2 className="text-base font-bold text-slate-800">Giỏ hàng của bạn</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
              {items.length}
            </span>
          </div>
          <button 
            onClick={onClose}
            aria-label="Đóng giỏ hàng"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="text-4xl mb-3">🛒</span>
              <p className="text-sm font-semibold text-slate-800">Giỏ hàng đang trống</p>
              <p className="text-xs text-slate-400 mt-1">Hãy thêm sản phẩm để tiếp tục mua sắm</p>
              <button 
                onClick={() => { onClose(); navigate('/products'); }}
                className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-blue-600 transition-all cursor-pointer"
              >
                Tiếp tục mua sắm
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {items.map((item) => (
                <div 
                  key={item.id} 
                  className="flex gap-3 items-center border-b border-slate-50 pb-4 last:border-0"
                >
                  {/* Product Image */}
                  <img 
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'} 
                    alt={item.name}
                    className="h-16 w-16 rounded-xl object-cover bg-slate-50"
                  />
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{item.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{formatPrice(item.salePrice)}</p>
                    
                    {/* Qty changer */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                        <button 
                          onClick={() => handleQtyChange(item.productId, item.quantity - 1)}
                          aria-label="Giảm số lượng"
                          className="p-1 rounded-md text-slate-500 hover:bg-white cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-slate-700">{item.quantity}</span>
                        <button 
                          onClick={() => handleQtyChange(item.productId, item.quantity + 1)}
                          aria-label="Tăng số lượng"
                          className="p-1 rounded-md text-slate-500 hover:bg-white cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs font-bold text-slate-800">{formatPrice(item.lineTotal)}</span>
                    <button 
                      onClick={() => removeItem(item.productId)}
                      aria-label="Xóa sản phẩm"
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-slate-100 p-4 bg-slate-50/50">
            <div className="flex justify-between items-baseline mb-4">
              <span className="text-sm font-semibold text-slate-600">Tổng cộng:</span>
              <span className="text-lg font-extrabold text-slate-900">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => { onClose(); navigate('/cart'); }}
                className="w-full py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:border-slate-300 cursor-pointer"
              >
                Xem giỏ hàng
              </button>
              <button 
                onClick={() => { onClose(); navigate('/checkout'); }}
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-blue-600 cursor-pointer"
              >
                Thanh toán
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
