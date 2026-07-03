import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import { User, Mail, Lock, Phone, MapPin, Eye, EyeOff, Loader2 } from 'lucide-react';

interface RegisterFormInput {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  address: string;
}

export const Register: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormInput>({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      phone: '',
      address: '',
    }
  });

  const passwordValue = watch('password');

  const onSubmit = async (data: RegisterFormInput) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/api/auth/register', {
        username: data.username,
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone,
        address: data.address,
      });

      const { user, token, refreshToken } = res.data.data;
      setAuth(user, token, refreshToken);
      alert('Đăng ký tài khoản thành công!');
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra trong quá trình đăng ký!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 py-12 px-4">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-xl p-8 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-0 -ml-16 -mt-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 -mr-16 -mb-16 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-md">
            S
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-800 tracking-tight">Tạo tài khoản mới</h2>
          <p className="mt-1.5 text-sm text-slate-400 font-medium">Bắt đầu trải nghiệm mua sắm tuyệt vời cùng chúng tôi</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 tracking-wide uppercase">Tên đăng nhập</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  {...register('username', { 
                    required: 'Tên đăng nhập không được để trống',
                    minLength: { value: 3, message: 'Tên đăng nhập phải có ít nhất 3 ký tự' }
                  })}
                  placeholder="Username"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-850 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner-sm"
                />
              </div>
              {errors.username && <p className="text-[10px] text-red-500 font-bold mt-1">{errors.username.message}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 tracking-wide uppercase">Địa chỉ Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  {...register('email', { 
                    required: 'Email không được để trống',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Địa chỉ email không đúng định dạng'
                    }
                  })}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-850 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner-sm"
                />
              </div>
              {errors.email && <p className="text-[10px] text-red-500 font-bold mt-1">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 tracking-wide uppercase">Mật khẩu</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { 
                    required: 'Mật khẩu không được để trống',
                    minLength: { value: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
                    validate: {
                      hasLetter: value => /[a-zA-Z]/.test(value) || 'Mật khẩu phải chứa cả chữ cái và chữ số',
                      hasNumber: value => /\d/.test(value) || 'Mật khẩu phải chứa cả chữ cái và chữ số'
                    }
                  })}
                  placeholder="Mật khẩu"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-850 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[10px] text-red-500 font-bold mt-1">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 tracking-wide uppercase">Xác nhận mật khẩu</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('confirmPassword', { 
                    required: 'Vui lòng xác nhận mật khẩu',
                    validate: value => value === passwordValue || 'Mật khẩu xác nhận không khớp!'
                  })}
                  placeholder="Xác nhận mật khẩu"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-850 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner-sm"
                />
              </div>
              {errors.confirmPassword && <p className="text-[10px] text-red-500 font-bold mt-1">{errors.confirmPassword.message}</p>}
            </div>
          </div>

          <hr className="border-slate-100 my-4" />

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 tracking-wide uppercase">Họ và tên</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <User className="h-4 w-4" />
              </span>
              <input
                type="text"
                {...register('fullName', { required: 'Họ và tên không được để trống' })}
                placeholder="Nhập họ và tên đầy đủ"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-850 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner-sm"
              />
            </div>
            {errors.fullName && <p className="text-[10px] text-red-500 font-bold mt-1">{errors.fullName.message}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 tracking-wide uppercase">Số điện thoại</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Phone className="h-4 w-4" />
              </span>
              <input
                type="text"
                {...register('phone', { 
                  required: 'Số điện thoại không được để trống',
                  pattern: {
                    value: /^\d{9,11}$/,
                    message: 'Số điện thoại phải gồm 9 đến 11 chữ số'
                  }
                })}
                placeholder="Nhập số điện thoại"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-850 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner-sm"
              />
            </div>
            {errors.phone && <p className="text-[10px] text-red-500 font-bold mt-1">{errors.phone.message}</p>}
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 tracking-wide uppercase">Địa chỉ nhận hàng</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <MapPin className="h-4 w-4" />
              </span>
              <input
                type="text"
                {...register('address', { required: 'Địa chỉ nhận hàng không được để trống' })}
                placeholder="Nhập địa chỉ nhà, tên đường, quận/huyện, tỉnh/thành phố"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-850 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner-sm"
              />
            </div>
            {errors.address && <p className="text-[10px] text-red-500 font-bold mt-1">{errors.address.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-extrabold hover:bg-slate-800 active:scale-98 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                Đang tạo tài khoản...
              </>
            ) : (
              'Đăng ký tài khoản'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-semibold text-slate-400">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 transition-colors">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
};
