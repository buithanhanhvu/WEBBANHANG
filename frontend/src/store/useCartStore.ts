import { create } from 'zustand';
import api from '../services/api';
import { CartItem } from '../types';

interface CartState {
  items: CartItem[];
  subtotal: number;
  loading: boolean;
  error: string | null;
  fetchCart: () => Promise<void>;
  addItem: (productId: number, quantity: number) => Promise<void>;
  updateItem: (productId: number, quantity: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  subtotal: 0,
  loading: false,
  error: null,
  fetchCart: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/api/cart');
      const { items, subtotal } = res.data.data;
      set({ items, subtotal, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch cart', loading: false });
    }
  },
  addItem: async (productId, quantity) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/api/cart/add', { productId, quantity });
      const { items, subtotal } = res.data.data;
      set({ items, subtotal, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to add item', loading: false });
      throw err;
    }
  },
  updateItem: async (productId, quantity) => {
    set({ loading: true, error: null });
    try {
      const res = await api.put('/api/cart/update', { productId, quantity });
      const { items, subtotal } = res.data.data;
      set({ items, subtotal, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update item', loading: false });
      throw err;
    }
  },
  removeItem: async (productId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.delete(`/api/cart/remove/${productId}`);
      const { items, subtotal } = res.data.data;
      set({ items, subtotal, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to remove item', loading: false });
      throw err;
    }
  },
  clearCart: () => {
    set({ items: [], subtotal: 0 });
  },
}));
