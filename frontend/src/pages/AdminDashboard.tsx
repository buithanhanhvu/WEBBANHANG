import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Product, Category, Coupon, Order } from '../types';
import api from '../services/api';
import { 
  LayoutDashboard, ShoppingCart, FolderTree, Ticket, FileText, 
  Trash2, Plus, Edit3, Loader2, AlertTriangle, TrendingUp, DollarSign,
  ArrowLeft, CheckCircle2, UserCheck, RefreshCw, X
} from 'lucide-react';

type TabType = 'overview' | 'products' | 'categories' | 'coupons' | 'orders' | 'recycle';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Overview Stats
  const [stats, setStats] = useState<any>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrder: 0,
    lowStockCount: 0,
    lowStockProducts: [],
    monthlyRevenue: []
  });

  const [hoveredBar, setHoveredBar] = useState<{ index: number; x: number; y: number; label: string; amount: number } | null>(null);

  // Entities Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [recycleItems, setRecycleItems] = useState<any[]>([]);

  // Loading States
  const [loading, setLoading] = useState(true);

  // CRUD Modals States
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [showCouponModal, setShowCouponModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Product Form Fields
  const [prodName, setProdName] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodStock, setProdStock] = useState(0);
  const [prodCatId, setProdCatId] = useState<number | ''>('');
  const [prodImage, setProdImage] = useState('');
  const [prodDiscount, setProdDiscount] = useState(0);
  const [prodFeatured, setProdFeatured] = useState(false);
  const [prodDesc, setProdDesc] = useState('');

  // Category Form Fields
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Coupon Form Fields
  const [coupCode, setCoupCode] = useState('');
  const [coupDiscount, setCoupDiscount] = useState(0);
  const [coupActive, setCoupActive] = useState(true);
  const [coupMaxUses, setCoupMaxUses] = useState(100);
  const [coupStartDate, setCoupStartDate] = useState('');
  const [coupEndDate, setCoupEndDate] = useState('');

  useEffect(() => {
    // Check role, redirect if not ADMIN
    if (!user || user.role !== 'ADMIN') {
      navigate('/');
      return;
    }
    fetchOverview();
  }, [user]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const [dashRes, catRes, prodRes, coupRes, orderRes, recycleRes] = await Promise.all([
        api.get('/api/admin/dashboard'),
        api.get('/api/categories'),
        api.get('/api/products?size=100'),
        api.get('/api/admin/coupons'),
        api.get('/api/admin/orders'),
        api.get('/api/admin/recycle-bin')
      ]);

      const dashData = dashRes.data.data || {};
      const allProds = prodRes.data.data || [];
      const lowStock = allProds.filter((p: Product) => p.stock < 5);

      const totalRevenue = dashData.revenue || 0;
      const totalOrders = dashData.orders || 0;
      const averageOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const monthlyRevenue = dashData.revenueChartData && dashData.revenueChartData.length > 0
        ? dashData.revenueChartData.map((item: any) => ({
            month: item.label,
            amount: item.value
          }))
        : [
            { month: 'T1', amount: 5000000 },
            { month: 'T2', amount: 8000000 },
            { month: 'T3', amount: 15000000 },
            { month: 'T4', amount: 12000000 },
            { month: 'T5', amount: 22000000 },
            { month: 'T6', amount: 28000000 }
          ];

      setStats({
        totalRevenue,
        totalOrders,
        averageOrder,
        lowStockCount: lowStock.length,
        lowStockProducts: lowStock,
        monthlyRevenue
      });

      setCategories(catRes.data.data || []);
      setProducts(allProds);
      setCoupons(coupRes.data.data || []);
      setOrders(orderRes.data.data || []);
      setRecycleItems(recycleRes.data.data || []);

    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodCatId || prodPrice <= 0) {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc!');
      return;
    }

    const payload = {
      name: prodName,
      brand: prodBrand,
      price: prodPrice,
      stock: prodStock,
      categoryId: Number(prodCatId),
      imageUrl: prodImage,
      discountPercent: prodDiscount,
      featured: prodFeatured,
      description: prodDesc
    };

    try {
      if (selectedProduct) {
        await api.put(`/api/admin/products/${selectedProduct.id}`, payload);
        alert('Cập nhật sản phẩm thành công!');
      } else {
        await api.post('/api/admin/products', payload);
        alert('Tạo sản phẩm thành công!');
      }
      setShowProductModal(false);
      fetchOverview();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra!');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này vào thùng rác?')) return;
    try {
      await api.delete(`/api/admin/products/${id}`);
      alert('Đã chuyển sản phẩm vào thùng rác!');
      fetchOverview();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa sản phẩm!');
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const payload = { name: catName, description: catDesc };

    try {
      if (selectedCategory) {
        await api.put(`/api/admin/categories/${selectedCategory.id}`, payload);
        alert('Cập nhật danh mục thành công!');
      } else {
        await api.post('/api/admin/categories', payload);
        alert('Tạo danh mục thành công!');
      }
      setShowCategoryModal(false);
      fetchOverview();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra!');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Xóa danh mục sẽ xóa/mất danh mục của các sản phẩm liên quan. Tiếp tục?')) return;
    try {
      await api.delete(`/api/admin/categories/${id}`);
      alert('Xóa danh mục thành công!');
      fetchOverview();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa danh mục!');
    }
  };

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupCode.trim() || coupDiscount < 0 || coupDiscount > 100) return;

    const payload = {
      code: coupCode.trim().toUpperCase(),
      discountPercent: coupDiscount,
      active: coupActive,
      maxUses: coupMaxUses,
      startDate: coupStartDate || null,
      endDate: coupEndDate || null
    };

    try {
      if (selectedCoupon) {
        await api.put(`/api/admin/coupons/${selectedCoupon.id}`, payload);
        alert('Cập nhật mã giảm giá thành công!');
      } else {
        await api.post('/api/admin/coupons', payload);
        alert('Tạo mã giảm giá thành công!');
      }
      setShowCouponModal(false);
      fetchOverview();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra!');
    }
  };

  const handleDeleteCoupon = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mã giảm giá này?')) return;
    try {
      await api.delete(`/api/admin/coupons/${id}`);
      alert('Xóa thành công!');
      fetchOverview();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa!');
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      await api.put(`/api/admin/orders/${orderId}/status`, { status });
      alert('Cập nhật trạng thái đơn hàng thành công!');
      fetchOverview();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể cập nhật trạng thái đơn!');
    }
  };

  const handleRestoreProduct = async (id: number) => {
    try {
      await api.post(`/api/admin/recycle-bin/${id}/restore`);
      alert('Khôi phục sản phẩm thành công!');
      fetchOverview();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể khôi phục!');
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (!window.confirm('CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn sản phẩm và không thể khôi phục lại! Bạn vẫn muốn tiếp tục?')) return;
    try {
      await api.delete(`/api/admin/recycle-bin/${id}`);
      alert('Xóa vĩnh viễn thành công!');
      fetchOverview();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa vĩnh viễn!');
    }
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const openProductModal = (product: Product | null = null) => {
    setSelectedProduct(product);
    if (product) {
      setProdName(product.name);
      setProdBrand(product.brand || '');
      setProdPrice(product.price);
      setProdStock(product.stock);
      setProdCatId(product.category_id || '');
      setProdImage(product.image_url || '');
      setProdDiscount(product.discount_percent);
      setProdFeatured(product.featured);
      setProdDesc(product.description || '');
    } else {
      setProdName('');
      setProdBrand('');
      setProdPrice(0);
      setProdStock(10);
      setProdCatId(categories[0]?.id || '');
      setProdImage('');
      setProdDiscount(0);
      setProdFeatured(false);
      setProdDesc('');
    }
    setShowProductModal(true);
  };

  const openCategoryModal = (cat: Category | null = null) => {
    setSelectedCategory(cat);
    if (cat) {
      setCatName(cat.name);
      setCatDesc(cat.description || '');
    } else {
      setCatName('');
      setCatDesc('');
    }
    setShowCategoryModal(true);
  };

  const openCouponModal = (coup: Coupon | null = null) => {
    setSelectedCoupon(coup);
    if (coup) {
      setCoupCode(coup.code);
      setCoupDiscount(coup.discount_percent);
      setCoupActive(coup.active);
      setCoupMaxUses(coup.max_uses || 100);
      setCoupStartDate(coup.start_date || '');
      setCoupEndDate(coup.end_date || '');
    } else {
      setCoupCode('');
      setCoupDiscount(10);
      setCoupActive(true);
      setCoupMaxUses(100);
      setCoupStartDate(new Date().toISOString().split('T')[0]);
      setCoupEndDate(new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]);
    }
    setShowCouponModal(true);
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
      {/* Admin Sidebar navigation - Left */}
      <aside className="w-full lg:w-64 flex-shrink-0 bg-slate-900 text-white rounded-3rem p-6 flex flex-col justify-between shadow-2xl h-fit">
        <div className="space-y-6">
          <div className="px-2">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <UserCheck className="h-5.5 w-5.5 text-blue-400" />
              Bảng quản trị
            </h2>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Admin Control Panel</p>
          </div>

          <nav className="space-y-1.5 font-semibold text-xs text-slate-300">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'overview' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15' : 'hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
              Tổng quan
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'products' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-white/5'
              }`}
            >
              <ShoppingCart className="h-4.5 w-4.5" />
              Sản phẩm ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'categories' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-white/5'
              }`}
            >
              <FolderTree className="h-4.5 w-4.5" />
              Danh mục ({categories.length})
            </button>
            <button
              onClick={() => setActiveTab('coupons')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'coupons' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-white/5'
              }`}
            >
              <Ticket className="h-4.5 w-4.5" />
              Mã giảm giá ({coupons.length})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'orders' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-white/5'
              }`}
            >
              <FileText className="h-4.5 w-4.5" />
              Đơn hàng ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('recycle')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'recycle' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-white/5 text-slate-400'
              }`}
            >
              <Trash2 className="h-4.5 w-4.5" />
              Thùng rác ({recycleItems.length})
            </button>
          </nav>
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-8 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-[11px] font-bold text-slate-400 transition-all cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Quay về Cửa hàng
        </button>
      </aside>

      {/* Main Content Area - Right */}
      <main className="flex-1 min-w-0">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white border border-slate-100 rounded-3rem p-6 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Doanh thu</span>
                  <h3 className="text-lg font-black text-slate-800 mt-0.5">{formatPrice(stats.totalRevenue)}</h3>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-3rem p-6 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-650 rounded-2xl">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Đơn hàng</span>
                  <h3 className="text-lg font-black text-slate-800 mt-0.5">{stats.totalOrders} đơn</h3>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-3rem p-6 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-650 rounded-2xl">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Trung bình đơn</span>
                  <h3 className="text-lg font-black text-slate-800 mt-0.5">{formatPrice(stats.averageOrder)}</h3>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-3rem p-6 shadow-sm flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${stats.lowStockCount > 0 ? 'bg-red-50 text-red-650' : 'bg-slate-50 text-slate-450'}`}>
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Cảnh báo kho</span>
                  <h3 className={`text-lg font-black mt-0.5 ${stats.lowStockCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                    {stats.lowStockCount} sản phẩm
                  </h3>
                </div>
              </div>
            </div>

            {/* Custom Interactive SVG Chart Area */}
            <div className="bg-white border border-slate-100 rounded-3rem p-6 sm:p-8 shadow-sm relative">
              <h3 className="text-base font-black text-slate-800 tracking-tight mb-6">Biểu đồ doanh thu</h3>
              
              {/* Tooltip HTML tuyệt đối */}
              {hoveredBar && (
                <div 
                  className="absolute z-10 bg-slate-950/95 backdrop-blur-md text-white text-[10px] px-3.5 py-2.5 rounded-2xl shadow-xl pointer-events-none transition-all duration-200 border border-slate-800 flex flex-col items-center gap-0.5"
                  style={{ 
                    left: `${hoveredBar.x}px`, 
                    top: `${hoveredBar.y}px`,
                    transform: 'translate(-50%, -125%)'
                  }}
                >
                  <span className="font-extrabold text-slate-400 uppercase tracking-wider">{hoveredBar.label}</span>
                  <span className="font-black text-blue-405 text-xs">{formatPrice(hoveredBar.amount)}</span>
                  {/* Mũi tên nhỏ ở dưới tooltip */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-950/95" />
                </div>
              )}

              <div className="w-full">
                {(() => {
                  const data = stats.monthlyRevenue || [];
                  if (data.length === 0) {
                    return (
                      <div className="h-48 flex items-center justify-center text-slate-400 font-semibold text-xs">
                        Chưa có dữ liệu doanh thu
                      </div>
                    );
                  }

                  const maxAmt = Math.max(...data.map((m: any) => m.amount), 10000);
                  // Làm tròn maxAmt lên một mốc số chẵn đẹp mắt để căn mốc trục Y
                  let roundedMax = maxAmt;
                  if (maxAmt > 1000000) {
                    roundedMax = Math.ceil(maxAmt / 1000000) * 1000000;
                  } else if (maxAmt > 1000) {
                    roundedMax = Math.ceil(maxAmt / 1000) * 1000;
                  }
                  
                  const yTicks = [0, roundedMax * 0.25, roundedMax * 0.5, roundedMax * 0.75, roundedMax];

                  const paddingLeft = 70;
                  const paddingRight = 30;
                  const paddingTop = 20;
                  const paddingBottom = 40;
                  
                  const width = 600;
                  const height = 240;
                  
                  const chartWidth = width - paddingLeft - paddingRight;
                  const chartHeight = height - paddingTop - paddingBottom;

                  const formatShortPrice = (val: number) => {
                    if (val === 0) return '0 ₫';
                    if (val >= 1000000) return (val / 1000000).toFixed(1).replace(/\.0$/, '') + 'M ₫';
                    if (val >= 1000) return (val / 1000).toFixed(0) + 'K ₫';
                    return val + ' ₫';
                  };

                  return (
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* 1. Gridlines & Y-Axis Labels */}
                      {yTicks.map((val, idx) => {
                        const y = paddingTop + chartHeight - (val / roundedMax) * chartHeight;
                        return (
                          <g key={idx}>
                            <line 
                              x1={paddingLeft} 
                              y1={y} 
                              x2={paddingLeft + chartWidth} 
                              y2={y} 
                              stroke="#e2e8f0" 
                              strokeWidth="1.2" 
                              strokeDasharray={val === 0 ? "0" : "4 4"}
                            />
                            <text 
                              x={paddingLeft - 12} 
                              y={y + 3.5} 
                              textAnchor="end" 
                              className="text-[10px] font-extrabold text-slate-400 fill-current"
                            >
                              {formatShortPrice(val)}
                            </text>
                          </g>
                        );
                      })}

                      {/* 2. Chart Rendering logic */}
                      {data.length === 1 ? (
                        // Bar Chart for single data point
                        (() => {
                          const d = data[0];
                          const barWidth = 45;
                          const x = paddingLeft + chartWidth / 2 - barWidth / 2;
                          const barHeight = (d.amount / roundedMax) * chartHeight;
                          const y = paddingTop + chartHeight - barHeight;

                          return (
                            <g>
                              {/* Pill shaped bar */}
                              <rect 
                                x={x} 
                                y={y} 
                                width={barWidth} 
                                height={barHeight} 
                                rx={10} 
                                fill="url(#barGrad)"
                                className="transition-all duration-300 hover:brightness-110 cursor-pointer"
                                onMouseEnter={(e) => {
                                  // Lấy tọa độ tương đối từ container
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const parentRect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                                  if (parentRect) {
                                    setHoveredBar({
                                      index: 0,
                                      x: (rect.left + rect.right) / 2 - parentRect.left,
                                      y: rect.top - parentRect.top,
                                      label: d.month,
                                      amount: d.amount
                                    });
                                  }
                                }}
                                onMouseLeave={() => setHoveredBar(null)}
                              />
                              {/* Flat base for bottom corners */}
                              {barHeight > 10 && (
                                <rect 
                                  x={x} 
                                  y={paddingTop + chartHeight - 10} 
                                  width={barWidth} 
                                  height={10} 
                                  fill="url(#barGrad)"
                                />
                              )}
                              
                              {/* X Axis Label */}
                              <text 
                                x={paddingLeft + chartWidth / 2} 
                                y={paddingTop + chartHeight + 22} 
                                textAnchor="middle" 
                                className="text-[10px] font-extrabold text-slate-500 fill-current"
                              >
                                {d.month}
                              </text>
                            </g>
                          );
                        })()
                      ) : (
                        // Area Chart for multiple data points
                        (() => {
                          const points = data.map((d: any, idx: number) => {
                            const x = paddingLeft + (chartWidth / (data.length - 1)) * idx;
                            const y = paddingTop + chartHeight - (d.amount / roundedMax) * chartHeight;
                            return { x, y, label: d.month, amount: d.amount };
                          });

                          // Generate line path definition
                          const linePath = points.map((p: any, idx: number) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                          // Generate area path definition
                          const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

                          return (
                            <g>
                              {/* Vùng Area Gradient */}
                              <path d={areaPath} fill="url(#areaGrad)" />
                              
                              {/* Đường Line nét vẽ */}
                              <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                              {/* Điểm nút và Trục X Labels */}
                              {points.map((p: any, idx: number) => (
                                <g key={idx}>
                                  {/* Hoverable circle area */}
                                  <circle 
                                    cx={p.x} 
                                    cy={p.y} 
                                    r={6} 
                                    fill="#2563eb" 
                                    stroke="#ffffff" 
                                    strokeWidth="2" 
                                    className="transition-all duration-200 hover:r-8 hover:fill-blue-600 cursor-pointer shadow-md"
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const parentRect = e.currentTarget.parentElement?.parentElement?.parentElement?.getBoundingClientRect();
                                      if (parentRect) {
                                        setHoveredBar({
                                          index: idx,
                                          x: rect.left + rect.width / 2 - parentRect.left,
                                          y: rect.top - parentRect.top,
                                          label: p.label,
                                          amount: p.amount
                                        });
                                      }
                                    }}
                                    onMouseLeave={() => setHoveredBar(null)}
                                  />
                                  
                                  {/* X Axis Label */}
                                  <text 
                                    x={p.x} 
                                    y={paddingTop + chartHeight + 22} 
                                    textAnchor="middle" 
                                    className="text-[10px] font-extrabold text-slate-500 fill-current"
                                  >
                                    {p.label}
                                  </text>
                                </g>
                              ))}
                            </g>
                          );
                        })()
                      )}
                    </svg>
                  );
                })()}
              </div>
            </div>

            {/* Low stock table alerts */}
            {stats.lowStockProducts.length > 0 && (
              <div className="bg-red-50/40 border border-red-100 rounded-3rem p-6 shadow-sm">
                <h3 className="text-sm font-bold text-red-850 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <AlertTriangle className="h-4.5 w-4.5" />
                  Sản phẩm sắp hết hàng
                </h3>
                <div className="space-y-3.5">
                  {stats.lowStockProducts.map((p: Product) => (
                    <div key={p.id} className="flex items-center justify-between text-xs bg-white p-3.5 rounded-2xl border border-red-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <img src={p.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=50'} alt={p.name} className="h-9 w-9 rounded-lg object-cover" />
                        <div>
                          <h4 className="font-bold text-slate-800">{p.name}</h4>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Tồn kho còn lại: <span className="text-red-650 font-black">{p.stock}</span></p>
                        </div>
                      </div>
                      <button 
                        onClick={() => openProductModal(p)}
                        className="px-3.5 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg cursor-pointer hover:bg-slate-800 transition-all"
                      >
                        Bổ sung hàng
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRODUCTS */}
        {activeTab === 'products' && (
          <div className="bg-white border border-slate-100 rounded-3rem p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">Quản lý sản phẩm</h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">Tổng số: {products.length} sản phẩm</p>
              </div>
              <button
                onClick={() => openProductModal(null)}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-slate-850 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" /> Thêm sản phẩm
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                    <th className="p-4">ID</th>
                    <th className="p-4">Ảnh</th>
                    <th className="p-4">Tên</th>
                    <th className="p-4">Giá gốc</th>
                    <th className="p-4">Giảm giá</th>
                    <th className="p-4">Tồn kho</th>
                    <th className="p-4">Thương hiệu</th>
                    <th className="p-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-655">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="p-4">{p.id}</td>
                      <td className="p-4">
                        <img src={p.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=50'} alt={p.name} className="h-9 w-9 rounded-lg object-cover border border-slate-100 bg-white" />
                      </td>
                      <td className="p-4 font-bold text-slate-800 max-w-[150px] truncate">{p.name}</td>
                      <td className="p-4">{formatPrice(p.price)}</td>
                      <td className="p-4">{p.discount_percent > 0 ? `${p.discount_percent}%` : 'Không'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                          p.stock < 5 ? 'bg-red-50 text-red-650' : 'bg-slate-150 text-slate-700'
                        }`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="p-4">{p.brand || '---'}</td>
                      <td className="p-4 text-right space-x-1.5">
                        <button 
                          onClick={() => openProductModal(p)}
                          aria-label="Sửa sản phẩm"
                          className="p-2 text-blue-655 hover:bg-blue-50 rounded-lg cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(p.id)}
                          aria-label="Xóa sản phẩm"
                          className="p-2 text-red-655 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="bg-white border border-slate-100 rounded-3rem p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">Quản lý danh mục</h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">Tổng số: {categories.length} danh mục</p>
              </div>
              <button
                onClick={() => openCategoryModal(null)}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-slate-850 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" /> Thêm danh mục
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                    <th className="p-4">ID</th>
                    <th className="p-4">Tên danh mục</th>
                    <th className="p-4">Mô tả</th>
                    <th className="p-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-655">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50/50">
                      <td className="p-4">{cat.id}</td>
                      <td className="p-4 font-bold text-slate-800">{cat.name}</td>
                      <td className="p-4">{cat.description || 'Chưa cập nhật mô tả'}</td>
                      <td className="p-4 text-right space-x-1.5">
                        <button 
                          onClick={() => openCategoryModal(cat)}
                          aria-label="Sửa danh mục"
                          className="p-2 text-blue-655 hover:bg-blue-50 rounded-lg cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(cat.id)}
                          aria-label="Xóa danh mục"
                          className="p-2 text-red-655 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: COUPONS */}
        {activeTab === 'coupons' && (
          <div className="bg-white border border-slate-100 rounded-3rem p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">Quản lý mã giảm giá</h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">Tổng số: {coupons.length} coupons</p>
              </div>
              <button
                onClick={() => openCouponModal(null)}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-slate-850 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" /> Tạo Coupon
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                    <th className="p-4">ID</th>
                    <th className="p-4">Mã Code</th>
                    <th className="p-4">Phần trăm giảm</th>
                    <th className="p-4">Thời hạn sử dụng</th>
                    <th className="p-4">Lượt sử dụng tối đa</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-655">
                  {coupons.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="p-4">{c.id}</td>
                      <td className="p-4 font-black text-blue-600 uppercase">{c.code}</td>
                      <td className="p-4">{c.discount_percent}%</td>
                      <td className="p-4 font-medium text-slate-500">
                        {c.start_date && c.end_date ? (
                          `${new Date(c.start_date).toLocaleDateString('vi-VN')} - ${new Date(c.end_date).toLocaleDateString('vi-VN')}`
                        ) : c.end_date ? (
                          `Đến ${new Date(c.end_date).toLocaleDateString('vi-VN')}`
                        ) : (
                          'Vô thời hạn'
                        )}
                      </td>
                      <td className="p-4">{c.max_uses || 100}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          c.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {c.active ? 'Kích hoạt' : 'Hết hạn/Khóa'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1.5">
                        <button 
                          onClick={() => openCouponModal(c)}
                          aria-label="Sửa mã giảm giá"
                          className="p-2 text-blue-650 hover:bg-blue-50 rounded-lg cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCoupon(c.id)}
                          aria-label="Xóa mã giảm giá"
                          className="p-2 text-red-650 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: ORDERS */}
        {activeTab === 'orders' && (
          <div className="bg-white border border-slate-100 rounded-3rem p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">Quản lý hệ thống đơn hàng</h3>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Tổng số: {orders.length} giao dịch</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                    <th className="p-4">ID</th>
                    <th className="p-4">Khách hàng</th>
                    <th className="p-4">Địa chỉ giao</th>
                    <th className="p-4">Tổng tiền</th>
                    <th className="p-4">Ngày đặt</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-655">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="p-4">{o.id}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{o.shipping_name}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">{o.shipping_phone}</div>
                      </td>
                      <td className="p-4 max-w-[150px] truncate">{o.shipping_address}</td>
                      <td className="p-4 font-extrabold text-red-650">{formatPrice(o.total_amount)}</td>
                      <td className="p-4">{new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
                      <td className="p-4">
                        <select
                          value={o.status}
                          onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                          aria-label="Trạng thái đơn hàng"
                          className={`rounded-lg border px-2 py-1 text-[10px] font-extrabold tracking-wider ${
                            o.status === 'PENDING' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            o.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                            o.status === 'SHIPPING' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                            o.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            'bg-red-50 text-red-800 border-red-200'
                          }`}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="SHIPPING">SHIPPING</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => { setSelectedOrder(o); setShowOrderModal(true); }}
                          className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-655 font-bold rounded-lg cursor-pointer transition-all"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: RECYCLE BIN */}
        {activeTab === 'recycle' && (
          <div className="bg-white border border-slate-100 rounded-3rem p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">Thùng rác hệ thống</h3>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Nơi lưu trữ các sản phẩm đã xóa tạm thời. Tổng số: {recycleItems.length}</p>
            </div>

            {recycleItems.length === 0 ? (
              <div className="text-center py-16 text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                Thùng rác trống.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                      <th className="p-4">ID</th>
                      <th className="p-4">Kiểu Tài Nguyên</th>
                      <th className="p-4">Thông tin chi tiết</th>
                      <th className="p-4">Ngày xóa</th>
                      <th className="p-4 text-right">Thao tác khôi phục/xóa vĩnh viễn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-655">
                    {recycleItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-4">{item.id}</td>
                        <td className="p-4 uppercase font-black text-slate-500">{item.item_type}</td>
                        <td className="p-4">
                          <span className="font-bold text-slate-800">{item.display_name}</span>
                          <span className="text-[10px] text-slate-400 font-bold ml-2">({item.description})</span>
                        </td>
                        <td className="p-4">{new Date(item.deleted_at).toLocaleString('vi-VN')}</td>
                        <td className="p-4 text-right space-x-1.5">
                          <button
                            onClick={() => handleRestoreProduct(item.id)}
                            className="px-3.5 py-1.5 bg-blue-50 text-blue-650 hover:bg-blue-100 font-bold rounded-lg cursor-pointer flex-inline items-center gap-1 transition-all"
                          >
                            <RefreshCw className="h-3.5 w-3.5 inline mr-1" />
                            Khôi phục
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(item.id)}
                            className="px-3.5 py-1.5 bg-red-50 text-red-650 hover:bg-red-100 font-bold rounded-lg cursor-pointer flex-inline items-center gap-1 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5 inline mr-1" />
                            Xóa vĩnh viễn
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- CRUD MODALS --- */}

      {/* 1. PRODUCT CRUD MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowProductModal(false)} />
          <div className="relative bg-white rounded-3rem w-full max-w-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <button onClick={() => setShowProductModal(false)} aria-label="Đóng" className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-800 transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6">
              {selectedProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
            </h3>

            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="prodName" className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Tên sản phẩm *</label>
                  <input id="prodName" required type="text" value={prodName} onChange={(e) => setProdName(e.target.value)} placeholder="Nhập tên sản phẩm" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="prodBrand" className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Thương hiệu</label>
                  <input id="prodBrand" type="text" value={prodBrand} onChange={(e) => setProdBrand(e.target.value)} placeholder="Nhập thương hiệu (nếu có)" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="prodPrice" className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Giá sản phẩm *</label>
                  <input id="prodPrice" required type="number" value={prodPrice} onChange={(e) => setProdPrice(Number(e.target.value))} placeholder="Nhập giá bán" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="prodStock" className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Tồn kho *</label>
                  <input id="prodStock" required type="number" value={prodStock} onChange={(e) => setProdStock(Number(e.target.value))} placeholder="Nhập số lượng tồn kho" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="prodCatId" className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Danh mục *</label>
                  <select id="prodCatId" required value={prodCatId} onChange={(e) => setProdCatId(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white cursor-pointer">
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="prodDiscount" className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Phần trăm giảm giá</label>
                  <input id="prodDiscount" type="number" min="0" max="100" value={prodDiscount} onChange={(e) => setProdDiscount(Number(e.target.value))} placeholder="Nhập phần trăm giảm (nếu có)" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold" />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label htmlFor="prodImage" className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Đường dẫn ảnh sản phẩm (Image URL)</label>
                  <input id="prodImage" type="text" value={prodImage} onChange={(e) => setProdImage(e.target.value)} placeholder="Nhập link ảnh sản phẩm (HTTPS)" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold" />
                </div>
                <div className="sm:col-span-2 flex items-center gap-2 py-2">
                  <input type="checkbox" id="featured" checked={prodFeatured} onChange={(e) => setProdFeatured(e.target.checked)} className="h-4 w-4 accent-blue-600" />
                  <label htmlFor="featured" className="text-xs font-bold text-slate-655 cursor-pointer">Sản phẩm nổi bật (Featured Product)</label>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label htmlFor="prodDesc" className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Mô tả sản phẩm</label>
                  <textarea id="prodDesc" rows={3} value={prodDesc} onChange={(e) => setProdDesc(e.target.value)} placeholder="Nhập thông tin mô tả chi tiết sản phẩm" className="w-full p-3 rounded-xl border border-slate-200 text-xs font-semibold resize-none" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowProductModal(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Hủy</button>
                <button type="submit" className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer">Lưu sản phẩm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. CATEGORY CRUD MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)} />
          <div className="relative bg-white rounded-3rem w-full max-w-md p-6 sm:p-8 shadow-2xl animate-scale-in">
            <button onClick={() => setShowCategoryModal(false)} aria-label="Đóng" className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-850 transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6">
              {selectedCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
            </h3>

            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="catName" className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Tên danh mục *</label>
                <input id="catName" required type="text" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Nhập tên danh mục" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold" />
              </div>
              <div className="space-y-1">
                <label htmlFor="catDesc" className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Mô tả danh mục</label>
                <textarea id="catDesc" rows={3} value={catDesc} onChange={(e) => setCatDesc(e.target.value)} placeholder="Nhập mô tả danh mục" className="w-full p-3 rounded-xl border border-slate-200 text-xs font-semibold resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-705 rounded-xl text-xs font-bold cursor-pointer">Hủy</button>
                <button type="submit" className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer">Lưu danh mục</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. COUPON CRUD MODAL */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCouponModal(false)} />
          <div className="relative bg-white rounded-3rem w-full max-w-md p-6 sm:p-8 shadow-2xl animate-scale-in">
            <button onClick={() => setShowCouponModal(false)} aria-label="Đóng" className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-850 transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6">
              {selectedCoupon ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'}
            </h3>

            <form onSubmit={handleCouponSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="coupCode" className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Mã code giảm giá *</label>
                <input id="coupCode" required type="text" value={coupCode} onChange={(e) => setCoupCode(e.target.value)} placeholder="Ví dụ: SALE30" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold uppercase" />
              </div>
              <div className="space-y-1">
                <label htmlFor="coupDiscount" className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Phần trăm chiết khấu (1 - 100) *</label>
                <input id="coupDiscount" required type="number" min="1" max="100" value={coupDiscount} onChange={(e) => setCoupDiscount(Number(e.target.value))} placeholder="Nhập phần trăm chiết khấu (1 - 100)" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold" />
              </div>
              <div className="space-y-1">
                <label htmlFor="coupMaxUses" className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Lượt sử dụng tối đa</label>
                <input id="coupMaxUses" required type="number" value={coupMaxUses} onChange={(e) => setCoupMaxUses(Number(e.target.value))} placeholder="Nhập lượt sử dụng tối đa" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="coupStartDate" className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Ngày bắt đầu</label>
                  <input id="coupStartDate" type="date" value={coupStartDate} onChange={(e) => setCoupStartDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="coupEndDate" className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Ngày hết hạn</label>
                  <input id="coupEndDate" type="date" value={coupEndDate} onChange={(e) => setCoupEndDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold" />
                </div>
              </div>
              <div className="flex items-center gap-2 py-2">
                <input type="checkbox" id="active" checked={coupActive} onChange={(e) => setCoupActive(e.target.checked)} className="h-4 w-4 accent-blue-600" />
                <label htmlFor="active" className="text-xs font-bold text-slate-655 cursor-pointer">Kích hoạt coupon</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowCouponModal(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Hủy</button>
                <button type="submit" className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer">Lưu Coupon</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ORDER DETAIL VIEW MODAL */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowOrderModal(false)} />
          <div className="relative bg-white rounded-3rem w-full max-w-xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <button onClick={() => setShowOrderModal(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-850 transition-colors">
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-indigo-500" />
              Thông tin chi tiết đơn #{selectedOrder.id}
            </h3>

            <div className="space-y-4 text-xs font-semibold text-slate-600">
              {/* Shipping info */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-2 text-slate-700">
                <div>Người nhận: <span className="font-extrabold text-slate-850">{selectedOrder.shipping_name}</span></div>
                <div>Điện thoại: <span className="font-extrabold text-slate-850">{selectedOrder.shipping_phone}</span></div>
                <div>Địa chỉ giao: <span className="font-extrabold text-slate-850">{selectedOrder.shipping_address}</span></div>
                {selectedOrder.note && <div className="italic">Ghi chú: {selectedOrder.note}</div>}
              </div>

              {/* Items List */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase block mb-1">Sản phẩm đã mua</span>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-white hover:bg-slate-50/50">
                      <div>
                        <div className="font-bold text-slate-850">{item.product_name}</div>
                        <div className="text-[9px] text-slate-400 font-bold mt-0.5">{formatPrice(item.price)} × {item.quantity}</div>
                      </div>
                      <span className="font-black text-slate-700">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-slate-100 pt-4 flex justify-between items-baseline font-black text-slate-800">
                <span>Tổng giá trị đơn hàng:</span>
                <span className="text-base text-red-650">{formatPrice(selectedOrder.total_amount)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
              <button onClick={() => setShowOrderModal(false)} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
