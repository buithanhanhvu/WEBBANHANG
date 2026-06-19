import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FilterSidebar } from '../components/FilterSidebar';
import { ProductCard } from '../components/ProductCard';
import { Category, Product } from '../types';
import api from '../services/api';
import { Search, SlidersHorizontal, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export const ProductList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters State
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(
    searchParams.get('category') ? Number(searchParams.get('category')) : null
  );
  const [minPrice, setMinPrice] = useState<number>(
    searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : 0
  );
  const [maxPrice, setMaxPrice] = useState<number>(
    searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : 0
  );
  const [selectedBrand, setSelectedBrand] = useState<string | null>(searchParams.get('brand') || null);
  const [selectedRating, setSelectedRating] = useState<number | null>(
    searchParams.get('rating') ? Number(searchParams.get('rating')) : null
  );
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'createdAt,desc');
  const [page, setPage] = useState<number>(
    searchParams.get('page') ? Number(searchParams.get('page')) : 0
  );

  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Fetch Categories
  useEffect(() => {
    api.get('/api/categories').then((res) => {
      setCategories(res.data.data || []);
    });
  }, []);

  // Sync state to URL and fetch Products
  useEffect(() => {
    const params: any = {};
    if (search) params.search = search;
    if (selectedCategory !== null) params.category = selectedCategory.toString();
    if (minPrice > 0) params.minPrice = minPrice.toString();
    if (maxPrice > 0) params.maxPrice = maxPrice.toString();
    if (selectedBrand) params.brand = selectedBrand;
    if (selectedRating !== null) params.rating = selectedRating.toString();
    if (sortBy) params.sortBy = sortBy;
    if (page > 0) params.page = page.toString();

    setSearchParams(params);

    // Call API
    setLoading(true);
    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    if (selectedCategory !== null) queryParams.append('categoryId', selectedCategory.toString());
    if (minPrice > 0) queryParams.append('minPrice', minPrice.toString());
    if (maxPrice > 0) queryParams.append('maxPrice', maxPrice.toString());
    if (selectedBrand) queryParams.append('brand', selectedBrand);
    if (selectedRating !== null) queryParams.append('minRating', selectedRating.toString());
    if (sortBy) queryParams.append('sortBy', sortBy);
    queryParams.append('page', page.toString());
    queryParams.append('size', '9'); // 9 items per page

    api.get(`/api/products?${queryParams.toString()}`)
      .then((res) => {
        setProducts(res.data.data || []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [search, selectedCategory, minPrice, maxPrice, selectedBrand, selectedRating, sortBy, page]);

  const handlePriceChange = (min: number, max: number) => {
    setMinPrice(min);
    setMaxPrice(max);
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory(null);
    setMinPrice(0);
    setMaxPrice(0);
    setSelectedBrand(null);
    setSelectedRating(null);
    setSortBy('createdAt,desc');
    setPage(0);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Khám phá sản phẩm</h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">Tìm thấy {products.length} sản phẩm tương thích</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters - Desktop */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <FilterSidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(id) => {
              setSelectedCategory(id);
              setPage(0);
            }}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onChangePrice={handlePriceChange}
            selectedBrand={selectedBrand}
            onSelectBrand={(b) => {
              setSelectedBrand(b);
              setPage(0);
            }}
            selectedRating={selectedRating}
            onSelectRating={(r) => {
              setSelectedRating(r);
              setPage(0);
            }}
            onClear={handleClearFilters}
          />
        </div>

        {/* Product Grid and Sorting */}
        <div className="flex-1">
          {/* Controls Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowMobileFilter(!showMobileFilter)}
              className="lg:hidden flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Bộ lọc
            </button>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-2.5 ml-auto">
              <span className="text-xs font-bold text-slate-400">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(0);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
              >
                <option value="createdAt,desc">Mới nhất</option>
                <option value="price,asc">Giá: Thấp đến Cao</option>
                <option value="price,desc">Giá: Cao đến Thấp</option>
                <option value="name,asc">Tên: A-Z</option>
              </select>
            </div>
          </div>

          {/* Loading View */}
          {loading ? (
            <div className="flex h-96 items-center justify-center">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 bg-white border border-slate-100 rounded-3xl p-8">
              <span className="text-lg font-black text-slate-700 mb-2">Không tìm thấy sản phẩm</span>
              <p className="text-sm text-slate-400 font-semibold mb-6">Vui lòng điều chỉnh hoặc xóa bộ lọc để xem các kết quả khác.</p>
              <button
                onClick={handleClearFilters}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-slate-800 transition-all cursor-pointer"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          ) : (
            <>
              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => navigate('/product/' + product.id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-12 flex items-center justify-center gap-3">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm transition-all"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </button>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  Trang {page + 1}
                </span>
                <button
                  disabled={products.length < 9}
                  onClick={() => setPage(page + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm transition-all"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {showMobileFilter && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setShowMobileFilter(false)} />
          <div className="fixed inset-y-0 left-0 w-80 bg-white p-6 shadow-2xl flex flex-col overflow-y-auto animate-slide-in">
            <FilterSidebar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={(id) => {
                setSelectedCategory(id);
                setPage(0);
              }}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onChangePrice={handlePriceChange}
              selectedBrand={selectedBrand}
              onSelectBrand={setSelectedBrand}
              selectedRating={selectedRating}
              onSelectRating={setSelectedRating}
              onClear={handleClearFilters}
            />
            <button
              onClick={() => setShowMobileFilter(false)}
              className="mt-6 w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm cursor-pointer hover:bg-slate-800 transition-all"
            >
              Áp dụng bộ lọc
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
