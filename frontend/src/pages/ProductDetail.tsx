import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ProductImageGallery } from '../components/ProductImageGallery';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { Product, Review, PriceHistory } from '../types';
import api from '../services/api';
import { useWishlistStore } from '../store/useWishlistStore';
import { Star, ShoppingCart, Loader2, ArrowLeft, Send, History, Heart } from 'lucide-react';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Add review state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [canReview, setCanReview] = useState(false);

  // Cart quantity state
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  const user = useAuthStore((state) => state.user);
  const addItem = useCartStore((state) => state.addItem);
  const { wishlistIds, toggleWishlist } = useWishlistStore();

  const isWishlisted = wishlistIds.includes(Number(id));

  const handleToggleWishlist = async () => {
    if (!id || !user) {
      alert('Vui lòng đăng nhập để thực hiện!');
      return;
    }
    try {
      const added = await toggleWishlist(Number(id));
      alert(added ? 'Đã thêm vào danh sách yêu thích!' : 'Đã xóa khỏi danh sách yêu thích!');
    } catch (err) {
      alert('Không thể thực hiện hành động này.');
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const promises: [Promise<any>, Promise<any>, Promise<any>, Promise<any>?] = [
      api.get(`/api/products/${id}`),
      api.get(`/api/products/${id}/reviews`),
      api.get(`/api/products/${id}/price-history`),
    ];

    if (user) {
      promises.push(api.get(`/api/products/${id}/can-review`));
    }

    Promise.all(promises)
      .then(([prodRes, revRes, priceRes, canRevRes]) => {
        setProduct(prodRes.data.data);
        setReviews(revRes.data.data || []);
        setPriceHistory(priceRes.data.data || []);
        if (canRevRes) {
          setCanReview(canRevRes.data.data);
        } else {
          setCanReview(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load product details', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, user]);

  const handleAddToCart = async () => {
    if (!product) return;
    if (!user) {
      alert('Vui lòng đăng nhập để mua hàng!');
      return;
    }
    setAddingToCart(true);
    try {
      await addItem(product.id, quantity);
      alert('Đã thêm sản phẩm vào giỏ hàng!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra!');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;
    setSubmittingReview(true);

    try {
      const res = await api.post('/api/reviews', { productId: Number(id), rating, comment });
      setReviews([res.data.data, ...reviews]);
      setComment('');
      setRating(5);
      alert('Gửi đánh giá thành công!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể gửi đánh giá. Có thể bạn chưa mua sản phẩm này!');
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">Không tìm thấy sản phẩm</h2>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 text-blue-600 font-bold hover:underline">
          <ArrowLeft className="h-4 w-4" /> Quay lại trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Quay lại sản phẩm
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Images gallery */}
        <div>
          <ProductImageGallery images={product.images} defaultImage={product.image_url} />
        </div>

        {/* Right: Info */}
        <div className="flex flex-col">
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col">
              {product.brand && (
                <span className="text-xs font-extrabold tracking-widest text-blue-600 uppercase mb-2">
                  {product.brand}
                </span>
              )}
              <h1 className="text-3xl font-black text-slate-850 tracking-tight">
                {product.name}
              </h1>
            </div>
            {user && (
              <button
                onClick={handleToggleWishlist}
                className="p-3 bg-white border border-slate-100 hover:border-slate-200 rounded-2xl shadow-sm text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                title={isWishlisted ? "Xóa khỏi danh sách yêu thích" : "Thêm vào danh sách yêu thích"}
              >
                <Heart className={`h-6 w-6 ${isWishlisted ? "fill-current text-red-500" : ""}`} />
              </button>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center text-amber-400">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-sm font-bold text-slate-700 ml-1">{product.average_rating}</span>
            </div>
            <span className="h-4 w-[1px] bg-slate-200" />
            <span className="text-xs font-bold text-slate-500">{product.review_count} đánh giá</span>
            <span className="h-4 w-[1px] bg-slate-200" />
            <span className={`text-xs font-bold ${product.stock > 0 ? 'text-emerald-650' : 'text-red-500'}`}>
              {product.stock > 0 ? `Còn hàng (${product.stock})` : 'Hết hàng'}
            </span>
          </div>

          {/* Price */}
          <div className="rounded-2xl bg-slate-50 p-6 border border-slate-100 mb-8">
            <div className="flex items-baseline gap-3">
              {product.discount_percent > 0 ? (
                <>
                  <span className="text-3xl font-black text-red-600">
                    {formatPrice(product.sale_price)}
                  </span>
                  <span className="text-sm text-slate-400 line-through">
                    {formatPrice(product.price)}
                  </span>
                  <span className="rounded-lg bg-red-100 px-2 py-0.5 text-xs font-extrabold text-red-700">
                    -{product.discount_percent}%
                  </span>
                </>
              ) : (
                <span className="text-3xl font-black text-slate-900">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
          </div>

          {/* Add to Cart Actions */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center border border-slate-200 rounded-2xl p-1 bg-white shadow-inner-sm">
              <button
                disabled={quantity <= 1}
                onClick={() => setQuantity(quantity - 1)}
                className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-500 font-bold transition-all disabled:opacity-50"
              >
                -
              </button>
              <span className="w-12 text-center text-sm font-bold text-slate-700">{quantity}</span>
              <button
                disabled={quantity >= product.stock}
                onClick={() => setQuantity(quantity + 1)}
                className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-500 font-bold transition-all disabled:opacity-50"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={product.stock <= 0 || addingToCart}
              className="flex-1 py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-extrabold hover:bg-slate-800 active:scale-98 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {addingToCart ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <ShoppingCart className="h-4.5 w-4.5" />
              )}
              {product.stock > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
            </button>
          </div>

          {/* Description */}
          <div className="border-t border-slate-100 pt-8">
            <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase mb-3">Mô tả sản phẩm</h3>
            <p className="text-sm font-medium text-slate-500 leading-relaxed whitespace-pre-line">
              {product.description || 'Không có mô tả cho sản phẩm này.'}
            </p>
          </div>
        </div>
      </div>

      {/* Price History Section */}
      {priceHistory.length > 0 && (
        <div className="mt-16 border-t border-slate-100 pt-10">
          <div className="flex items-center gap-2.5 mb-6">
            <History className="h-5 w-5 text-slate-700" />
            <h3 className="text-lg font-bold text-slate-800">Lịch sử biến động giá</h3>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm bg-white">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                  <th className="p-4">Ngày thay đổi</th>
                  <th className="p-4">Giá gốc cũ</th>
                  <th className="p-4">Giá gốc mới</th>
                  <th className="p-4">Giá khuyến mãi mới</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                {priceHistory.map((history) => (
                  <tr key={history.id} className="hover:bg-slate-50/50">
                    <td className="p-4">{new Date(history.changed_at).toLocaleString('vi-VN')}</td>
                    <td className="p-4 line-through text-slate-400">{formatPrice(history.old_price)}</td>
                    <td className="p-4">{formatPrice(history.new_price)}</td>
                    <td className="p-4 text-red-650 font-bold">
                      {formatPrice(history.new_price * (1 - history.new_discount / 100))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div className="mt-16 border-t border-slate-100 pt-10">
        <h3 className="text-lg font-black text-slate-850 mb-8">Đánh giá từ khách hàng ({reviews.length})</h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Write a review (Only if user is logged in and has purchased & received the item) */}
          <div className="lg:col-span-1">
            {!user ? (
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center">
                <p className="text-xs font-semibold text-slate-500 mb-4">Vui lòng đăng nhập để gửi đánh giá cho sản phẩm này.</p>
                <Link
                  to="/login"
                  className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all"
                >
                  Đăng nhập ngay
                </Link>
              </div>
            ) : !canReview ? (
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center text-slate-500 font-semibold text-xs leading-relaxed">
                Chỉ những khách hàng đã mua và nhận hàng thành công sản phẩm này mới có thể viết đánh giá.
              </div>
            ) : (
              <form onSubmit={handleAddReview} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-inner-sm">
                <h4 className="font-bold text-slate-800 mb-4">Gửi đánh giá của bạn</h4>
                
                {/* Rating select */}
                <div className="space-y-1.5 mb-4">
                  <label className="text-xs font-bold text-slate-500 tracking-wide uppercase">Số sao</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`text-2xl cursor-pointer transition-colors ${
                          star <= rating ? 'text-amber-450' : 'text-slate-300 hover:text-amber-200'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div className="space-y-1.5 mb-4">
                  <label className="text-xs font-bold text-slate-500 tracking-wide uppercase">Nhận xét</label>
                  <textarea
                    required
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Chia sẻ nhận xét của bạn về sản phẩm..."
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all shadow-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 active:scale-98 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-200 disabled:cursor-not-allowed"
                >
                  {submittingReview ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Gửi nhận xét
                </button>
              </form>
            )}
          </div>

          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-semibold text-xs border border-slate-100 rounded-3xl bg-white shadow-inner-sm">
                Sản phẩm chưa có đánh giá nào.
              </div>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-2.5">
                    <div>
                      <h5 className="font-bold text-sm text-slate-800">{rev.username}</h5>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {new Date(rev.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    {/* Stars */}
                    <div className="flex text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < rev.rating ? 'fill-current text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-sm font-medium text-slate-600 leading-relaxed">
                    {rev.comment}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
