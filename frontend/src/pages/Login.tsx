import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

const GOOGLE_CLIENT_ID = '1071806914161-7tjfbvs26pk1n47t89lr14q201djorre.apps.googleusercontent.com';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (element: HTMLElement, config: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface LoginFormInput {
  usernameOrEmail: string;
  password: string;
}

export const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInput>({
    defaultValues: {
      usernameOrEmail: '',
      password: '',
    }
  });

  // Handle successful auth (common for both normal & google login)
  const handleAuthSuccess = (data: { user: any; token: string; refreshToken: string }) => {
    setAuth(data.user, data.token, data.refreshToken);
    if (data.user.role === 'ADMIN') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  // Load Google Identity Services script
  useEffect(() => {
    const initGSI = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          setGoogleLoading(true);
          setError(null);
          try {
            const res = await api.post('/api/auth/google', { credential: response.credential });
            handleAuthSuccess(res.data.data);
          } catch (err: any) {
            setError(err.response?.data?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại!');
          } finally {
            setGoogleLoading(false);
          }
        },
        ux_mode: 'popup',
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: googleBtnRef.current.offsetWidth || 400,
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
      });
    };

    // Check if already loaded
    if (window.google) {
      initGSI();
      return;
    }

    // Load script dynamically
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGSI;
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) existing.remove();
    };
  }, []);

  const onSubmit = async (data: LoginFormInput) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/api/auth/login', data);
      handleAuthSuccess(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Tài khoản hoặc mật khẩu không chính xác!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-8 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-md">
            S
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-800 tracking-tight">Chào mừng trở lại</h2>
          <p className="mt-1.5 text-sm text-slate-400 font-medium">Đăng nhập tài khoản của bạn để tiếp tục</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 tracking-wide uppercase">Tên đăng nhập / Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Mail className="h-4.5 w-4.5" />
              </span>
              <input
                type="text"
                {...register('usernameOrEmail', { required: 'Tên đăng nhập hoặc email không được để trống' })}
                placeholder="Nhập tên đăng nhập hoặc email"
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner-sm"
              />
            </div>
            {errors.usernameOrEmail && (
              <p className="text-xs text-red-500 font-bold mt-1">{errors.usernameOrEmail.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 tracking-wide uppercase">Mật khẩu</label>
              <a href="#" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">Quên mật khẩu?</a>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Lock className="h-4.5 w-4.5" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password', { required: 'Mật khẩu không được để trống' })}
                placeholder="Nhập mật khẩu"
                className="w-full pl-11 pr-11 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 font-bold mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full mt-2 py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-extrabold hover:bg-slate-800 active:scale-98 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-xs font-bold text-slate-400">HOẶC ĐĂNG NHẬP VỚI</span>
          </div>
        </div>

        {/* Google Sign-In Button */}
        <div className="relative">
          {googleLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-2xl z-10">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="ml-2 text-sm font-semibold text-slate-600">Đang xác thực Google...</span>
            </div>
          )}
          {/* Google renders its own button here */}
          <div
            ref={googleBtnRef}
            className="w-full overflow-hidden rounded-2xl"
            style={{ minHeight: '44px' }}
          />
          {/* Fallback button if GSI fails to render */}
          <noscript>
            <p className="text-center text-xs text-slate-400">Vui lòng bật JavaScript để sử dụng đăng nhập Google.</p>
          </noscript>
        </div>

        <p className="mt-8 text-center text-sm font-semibold text-slate-400">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-blue-600 hover:text-blue-700 transition-colors">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
};
