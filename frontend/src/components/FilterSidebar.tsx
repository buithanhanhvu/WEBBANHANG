import React, { useState, useEffect } from 'react';
import { Category } from '../types';
import api from '../services/api';

interface FilterSidebarProps {
  categories: Category[];
  selectedCategory: number | null;
  onSelectCategory: (id: number | null) => void;
  minPrice: number;
  maxPrice: number;
  onChangePrice: (min: number, max: number) => void;
  selectedBrand: string | null;
  onSelectBrand: (brand: string | null) => void;
  selectedRating: number | null;
  onSelectRating: (rating: number | null) => void;
  onClear: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  minPrice,
  maxPrice,
  onChangePrice,
  selectedBrand,
  onSelectBrand,
  selectedRating,
  onSelectRating,
  onClear,
}) => {
  const [brands, setBrands] = useState<string[]>([]);
  const [sliderMax, setSliderMax] = useState<number>(35000000); // 35 Million default max

  useEffect(() => {
    // Thu thập thương hiệu từ các sản phẩm có sẵn
    api.get('/api/products').then((res) => {
      const allProducts = res.data.data;
      const uniqueBrands: string[] = Array.from(
        new Set(allProducts.map((p: any) => p.brand).filter(Boolean))
      );
      setBrands(uniqueBrands);
    });
  }, []);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className="w-full rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="text-base font-bold text-slate-800">Bộ lọc tìm kiếm</h3>
        <button 
          onClick={onClear}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
        >
          Xóa tất cả
        </button>
      </div>

      {/* Danh mục */}
      <div className="mt-5 border-b border-slate-100 pb-5">
        <h4 className="text-sm font-bold text-slate-700 mb-3">Danh mục</h4>
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => onSelectCategory(null)}
            className={`text-left text-sm px-3 py-2 rounded-xl transition-all cursor-pointer ${
              selectedCategory === null 
                ? 'bg-slate-900 text-white font-semibold' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Tất cả sản phẩm
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`text-left text-sm px-3 py-2 rounded-xl transition-all cursor-pointer ${
                selectedCategory === cat.id 
                  ? 'bg-slate-900 text-white font-semibold' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Khoảng giá */}
      <div className="mt-5 border-b border-slate-100 pb-5">
        <h4 className="text-sm font-bold text-slate-700 mb-3">Khoảng giá</h4>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span>{formatPrice(minPrice)}</span>
          <span>{formatPrice(maxPrice || sliderMax)}</span>
        </div>
        
        {/* Slider cho Max Price */}
        <input 
          type="range"
          min="0"
          max="50000000"
          step="500000"
          value={maxPrice || sliderMax}
          aria-label="Khoảng giá tối đa (thanh trượt)"
          onChange={(e) => {
            const val = parseInt(e.target.value);
            setSliderMax(val);
            onChangePrice(minPrice, val);
          }}
          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
        />

        {/* Input thủ công */}
        <div className="mt-3 flex items-center gap-2">
          <input 
            type="number"
            placeholder="Từ"
            value={minPrice || ''}
            aria-label="Giá tối thiểu"
            onChange={(e) => onChangePrice(Number(e.target.value), maxPrice)}
            className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-slate-900 focus:outline-none"
          />
          <span className="text-slate-400 text-xs">-</span>
          <input 
            type="number"
            placeholder="Đến"
            value={maxPrice || ''}
            aria-label="Giá tối đa"
            onChange={(e) => onChangePrice(minPrice, Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-slate-900 focus:outline-none"
          />
        </div>
      </div>

      {/* Thương hiệu */}
      {brands.length > 0 && (
        <div className="mt-5 border-b border-slate-100 pb-5">
          <h4 className="text-sm font-bold text-slate-700 mb-3">Thương hiệu</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSelectBrand(null)}
              className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-all ${
                selectedBrand === null
                  ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                  : 'border-slate-200 text-slate-600 hover:border-slate-400 bg-white'
              }`}
            >
              Tất cả
            </button>
            {brands.map((brand) => (
              <button
                key={brand}
                onClick={() => onSelectBrand(brand)}
                className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-all ${
                  selectedBrand === brand
                    ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                    : 'border-slate-200 text-slate-600 hover:border-slate-400 bg-white'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Đánh giá sao */}
      <div className="mt-5">
        <h4 className="text-sm font-bold text-slate-700 mb-3">Đánh giá tối thiểu</h4>
        <div className="flex flex-col gap-2">
          {[4, 3, 2].map((stars) => (
            <button
              key={stars}
              onClick={() => onSelectRating(selectedRating === stars ? null : stars)}
              className={`flex items-center text-xs px-3 py-2 rounded-xl transition-all text-left cursor-pointer ${
                selectedRating === stars
                  ? 'bg-slate-100 font-semibold text-slate-800'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex text-amber-400 mr-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-sm leading-none">
                    {i < stars ? '★' : '☆'}
                  </span>
                ))}
              </div>
              trở lên
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
