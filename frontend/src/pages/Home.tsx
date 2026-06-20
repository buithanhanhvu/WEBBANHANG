import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { Category, Product } from '../types';
import api from '../services/api';
import { ShoppingBag, ArrowRight, Laptop, Phone, Home as HomeIcon, Star, Sparkles, ShieldCheck, Zap } from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [heroProduct, setHeroProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/api/categories'),
      api.get('/api/products?size=8')
    ])
      .then(([catRes, prodRes]) => {
        setCategories(catRes.data.data || []);
        // Filter featured or take first 4 as featured
        const products = prodRes.data.data || [];
        setFeaturedProducts(products.filter((p: Product) => p.featured).slice(0, 4));
        
        // Find Astra Phone X or ID 1 for hero banner
        const hero = products.find((p: Product) => p.name.toLowerCase().includes('astra phone x') || p.id === 1);
        if (hero) {
          setHeroProduct(hero);
        }
      })
      .catch((err) => {
        console.error('Failed to load home page data', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const getCategoryIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'điện thoại':
        return <Phone className="h-6 w-6 text-indigo-500" />;
      case 'laptop':
        return <Laptop className="h-6 w-6 text-blue-500" />;
      default:
        return <HomeIcon className="h-6 w-6 text-emerald-500" />;
    }
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-radial from-slate-900 via-slate-950 to-black text-white py-20 px-6 sm:px-12 rounded-b-[2.5rem] shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.15),transparent_50%)]" />
        
        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-300 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="h-4.5 w-4.5 text-amber-400" />
              <span>Chào mừng đến với Astra Shop</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-105 to-slate-300">
              Công Nghệ Đột Phá<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Nâng Tầm Cuộc Sống</span>
            </h1>
            
            <p className="text-slate-450 text-base max-w-xl mx-auto lg:mx-0 font-medium">
              Khám phá bộ sưu tập smartphone, laptop và thiết bị thông minh thế hệ mới với ưu đãi đặc quyền ưu tiên và dịch vụ chăm sóc khách hàng hàng đầu.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
              <button 
                onClick={() => navigate('/products')}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-extrabold shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                Mua sắm ngay
                <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
              </button>
              
              <Link 
                to="/products"
                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-sm font-extrabold border border-white/15 transition-all text-center"
              >
                Tìm hiểu thêm
              </Link>
            </div>
          </div>
          
          {/* Animated Graphic/Mock Image */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-72 h-72 sm:w-96 sm:h-96">
              {/* Outer Glow Ring */}
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" />
              
              {/* Floating Cards */}
              <div 
                onClick={() => navigate(`/product/${heroProduct?.id || 1}`)}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 w-64 h-80 rounded-3xl shadow-3xl p-6 flex flex-col justify-between transform rotate-6 hover:rotate-0 transition-transform duration-500 cursor-pointer group/card"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold tracking-widest text-slate-450 uppercase">{heroProduct?.name || 'Astra Phone X'}</span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-[9px] font-black text-blue-400">HOT</span>
                </div>
                <div className="my-auto py-4 flex justify-center h-40 items-center overflow-hidden">
                  {heroProduct?.image_url ? (
                    <img 
                      src={heroProduct.image_url} 
                      alt={heroProduct.name} 
                      className="max-h-full max-w-full object-contain rounded-xl drop-shadow-[0_10px_20px_rgba(59,130,246,0.3)] transition-transform duration-500 group-hover/card:scale-105"
                    />
                  ) : (
                    <Phone className="h-28 w-28 text-slate-100 drop-shadow-[0_10px_20px_rgba(59,130,246,0.3)]" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-200">{heroProduct?.name || 'Astra Phone X'}</h4>
                  <p className="text-xs font-extrabold text-blue-400 mt-1">
                    {heroProduct ? formatPrice(heroProduct.sale_price) : '8,091,000 ₫'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Trust Badges */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-50 border border-slate-100 rounded-3rem p-6 flex items-start gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">Giao hàng cực tốc</h3>
              <p className="text-xs font-semibold text-slate-400 mt-1">Đóng gói an toàn, vận chuyển nhanh chóng trong 2 giờ nội thành.</p>
            </div>
          </div>
          
          <div className="bg-slate-50 border border-slate-100 rounded-3rem p-6 flex items-start gap-4">
            <div className="p-3 bg-indigo-50 rounded-2xl">
              <ShieldCheck className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">Chính hãng 100%</h3>
              <p className="text-xs font-semibold text-slate-400 mt-1">Nhập khẩu chính ngạch từ các thương hiệu công nghệ danh tiếng thế giới.</p>
            </div>
          </div>
          
          <div className="bg-slate-50 border border-slate-100 rounded-3rem p-6 flex items-start gap-4">
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <Star className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">Độc quyền ưu đãi</h3>
              <p className="text-xs font-semibold text-slate-400 mt-1">Ưu đãi hoàn tiền hấp dẫn cùng ví voucher ngập tràn quà tặng.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center md:text-left mb-8">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Danh mục nổi bật</h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">Khám phá các dải sản phẩm chọn lọc</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              onClick={() => navigate(`/products?category=${category.id}`)}
              className="group bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1"
            >
              <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                {getCategoryIcon(category.name)}
              </div>
              <div className="mt-6">
                <h3 className="font-extrabold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">
                  {category.name}
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1 line-clamp-1">
                  {category.description || 'Sản phẩm chọn lọc chất lượng cao'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sản phẩm bán chạy</h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">Những sản phẩm được yêu thích hàng đầu</p>
          </div>
          
          <button 
            onClick={() => navigate('/products')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 group cursor-pointer"
          >
            Xem tất cả sản phẩm
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-100 rounded-2xl aspect-square" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => navigate(`/product/${product.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
