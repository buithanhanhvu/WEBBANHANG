import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductImageGalleryProps {
  images?: { id: number; imageUrl: string }[];
  defaultImage?: string;
}

export const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({ images = [], defaultImage }) => {
  // Combine defaultImage with gallery images
  const allImages = [
    ...(defaultImage ? [{ id: 0, imageUrl: defaultImage }] : []),
    ...images.filter((img) => img.imageUrl !== defaultImage),
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [defaultImage, images]);

  if (allImages.length === 0) {
    return (
      <div className="aspect-square w-full rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
        <span className="text-sm text-slate-400 font-medium">Không có hình ảnh</span>
      </div>
    );
  }

  const currentImage = allImages[activeIndex];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image View */}
      <div className="group relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
        <img 
          src={currentImage.imageUrl} 
          alt="Product main image" 
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Navigation Arrows for multi-images */}
        {allImages.length > 1 && (
          <>
            <button 
              onClick={handlePrev}
              aria-label="Ảnh trước"
              className="absolute left-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-slate-700 shadow-md transition-all hover:bg-slate-900 hover:text-white cursor-pointer opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button 
              onClick={handleNext}
              aria-label="Ảnh sau"
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-slate-700 shadow-md transition-all hover:bg-slate-900 hover:text-white cursor-pointer opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Counter indicator */}
        {allImages.length > 1 && (
          <div className="absolute bottom-4 right-4 rounded-lg bg-black/60 backdrop-blur-md px-2 py-1 text-[10px] font-bold text-white tracking-wider">
            {activeIndex + 1} / {allImages.length}
          </div>
        )}
      </div>

      {/* Thumbnails Row */}
      {allImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200">
          {allImages.map((img, idx) => (
            <button
              key={img.id === 0 ? 'default' : img.id}
              onClick={() => setActiveIndex(idx)}
              aria-label={`Chọn ảnh thu nhỏ ${idx + 1}`}
              className={`relative aspect-square w-16 flex-shrink-0 overflow-hidden rounded-xl bg-slate-50 border-2 transition-all cursor-pointer ${
                idx === activeIndex 
                  ? 'border-blue-600 ring-2 ring-blue-100 scale-102 shadow-sm' 
                  : 'border-transparent opacity-70 hover:opacity-100 hover:border-slate-300'
              }`}
            >
              <img 
                src={img.imageUrl} 
                alt={`Thumbnail ${idx}`} 
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
