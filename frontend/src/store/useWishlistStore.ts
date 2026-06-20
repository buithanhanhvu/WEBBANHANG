import { create } from 'zustand';
import api from '../services/api';
import { Product } from '../types';

interface WishlistState {
  items: Product[];
  wishlistIds: number[];
  loading: boolean;
  error: string | null;
  fetchWishlist: () => Promise<void>;
  fetchWishlistIds: () => Promise<void>;
  toggleWishlist: (productId: number) => Promise<boolean>; // Returns true if added, false if removed
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  wishlistIds: [],
  loading: false,
  error: null,
  fetchWishlist: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/api/wishlist');
      set({ items: res.data.data || [], loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch wishlist', loading: false });
    }
  },
  fetchWishlistIds: async () => {
    try {
      const res = await api.get('/api/wishlist/ids');
      set({ wishlistIds: res.data.data || [] });
    } catch (err) {
      console.error('Failed to fetch wishlist IDs', err);
    }
  },
  toggleWishlist: async (productId) => {
    try {
      const res = await api.post(`/api/wishlist/${productId}`);
      const added = res.data.data.added; // backend returns { added: boolean, productId: number }
      
      const currentIds = get().wishlistIds;
      const nextIds = added 
        ? [...currentIds, productId] 
        : currentIds.filter(id => id !== productId);
        
      set({ wishlistIds: nextIds });
      
      // Refresh items list
      get().fetchWishlist();
      
      return added;
    } catch (err: any) {
      console.error('Failed to toggle wishlist', err);
      throw err;
    }
  }
}));
