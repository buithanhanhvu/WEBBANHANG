import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  setAuth: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Restore from localStorage on init
  const savedUser = localStorage.getItem('user');
  const savedToken = localStorage.getItem('token');
  const savedRefreshToken = localStorage.getItem('refreshToken');

  return {
    user: savedUser ? JSON.parse(savedUser) : null,
    token: savedToken || null,
    refreshToken: savedRefreshToken || null,
    setAuth: (user, token, refreshToken) => {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      set({ user, token, refreshToken });
    },
    logout: () => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      set({ user: null, token: null, refreshToken: null });
    },
    updateUser: (user) => {
      localStorage.setItem('user', JSON.stringify(user));
      set({ user });
    },
  };
});
