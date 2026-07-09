import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import {
  User, Mail, Phone, MapPin, Lock, Camera,
  Loader2, CheckCircle, AlertCircle, Eye, EyeOff, ShieldCheck, Upload
} from 'lucide-react';

type Tab = 'info' | 'password';

interface ProfileInfoInput {
  fullName: string;
  email: string;
  phone: string;
  address: string;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('info');
  const queryClient = useQueryClient();

  // Avatar states
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // UI feedback states
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch current profile using React Query
  const { data: profileData, isLoading: fetchLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get('/api/auth/me');
      return res.data.data;
    },
    enabled: !!user,
  });

  // React Hook Form for Personal Info
  const infoForm = useForm<ProfileInfoInput>({
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      address: '',
    }
  });

  // React Hook Form for Password Change
  const passwordForm = useForm<ChangePasswordInput>({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  });

  // Watch password fields to compare them
  const newPasswordValue = passwordForm.watch('newPassword');

  // Sync profile data to info form
  useEffect(() => {
    if (profileData) {
      infoForm.reset({
        fullName: profileData.fullName || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        address: profileData.address || '',
      });
      setAvatarUrl(profileData.avatarUrl || '');
    }
  }, [profileData, infoForm]);

  const showFeedback = (msg: string, isError = false) => {
    if (isError) setError(msg);
    else setSuccess(msg);
    setTimeout(() => { setSuccess(null); setError(null); }, 3500);
  };

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileInfoInput & { avatarUrl: string }) => {
      const res = await api.put('/api/auth/me', data);
      return res.data.data;
    },
    onSuccess: (updatedUser) => {
      if (user) {
        updateUser({
          ...user,
          fullName: updatedUser.fullName,
          avatarUrl: updatedUser.avatarUrl,
          phone: updatedUser.phone,
          address: updatedUser.address,
          email: updatedUser.email
        });
      }
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      showFeedback('Cập nhật hồ sơ thành công!');
    },
    onError: (err: any) => {
      showFeedback(err.response?.data?.message || 'Cập nhật thất bại!', true);
    }
  });

  // Change Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: Omit<ChangePasswordInput, 'confirmPassword'>) => {
      await api.post('/api/auth/change-password', data);
    },
    onSuccess: () => {
      passwordForm.reset();
      showFeedback('Đổi mật khẩu thành công!');
    },
    onError: (err: any) => {
      showFeedback(err.response?.data?.message || 'Đổi mật khẩu thất bại!', true);
    }
  });

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showFeedback('Chỉ chấp nhận file ảnh (jpg, png, webp...)', true);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showFeedback('Ảnh không được vượt quá 5MB', true);
      return;
    }
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/upload', formData);
      const newUrl = res.data.data.url;
      setAvatarUrl(newUrl);
      
      // Auto-save the new avatar immediately
      const currentValues = infoForm.getValues();
      updateProfileMutation.mutate({
        ...currentValues,
        avatarUrl: newUrl
      });
    } catch (err: any) {
      showFeedback(err.response?.data?.message || 'Upload ảnh thất bại!', true);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onUpdateProfileSubmit = (data: ProfileInfoInput) => {
    updateProfileMutation.mutate({
      ...data,
      avatarUrl
    });
  };

  const onChangePasswordSubmit = (data: ChangePasswordInput) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    });
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const avatarSrc = avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.username}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header Card */}
        <div className="relative bg-gradient-to-r from-slate-900 to-blue-900 rounded-3xl p-8 mb-6 overflow-hidden shadow-2xl">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full -ml-16 -mb-16 blur-3xl" />

          <div className="relative flex items-center gap-6">
            {/* Avatar – clickable upload */}
            <div className="relative group">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative block h-20 w-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                title="Đổi ảnh đại diện"
                disabled={avatarUploading}
              >
                {avatarUploading ? (
                  <div className="h-full w-full flex items-center justify-center bg-slate-700">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                ) : (
                  <>
                    <img
                      src={avatarSrc}
                      alt={user?.username}
                      className="h-full w-full object-cover bg-slate-700"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="h-5 w-5 text-white" />
                      <span className="text-[9px] text-white font-bold mt-1">Đổi ảnh</span>
                    </div>
                  </>
                )}
              </button>
              {!avatarUploading && (
                <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center pointer-events-none">
                  <Upload className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-white tracking-tight truncate">
                {user?.fullName || user?.username}
              </h1>
              <p className="text-sm text-blue-200/80 font-medium mt-0.5">@{user?.username}</p>
              <span className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                user?.role === 'ADMIN'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}>
                <ShieldCheck className="h-3 w-3" />
                {user?.role === 'ADMIN' ? 'Quản trị viên' : 'Khách hàng'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm mb-6">
          <button
            onClick={() => setTab('info')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === 'info'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
            }`}
          >
            <User className="h-4 w-4" />
            Thông tin cá nhân
          </button>
          <button
            onClick={() => setTab('password')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === 'password'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-855 hover:bg-slate-50'
            }`}
          >
            <Lock className="h-4 w-4" />
            Đổi mật khẩu
          </button>
        </div>

        {/* Feedback Banner */}
        {(success || error || updateProfileMutation.isPending || changePasswordMutation.isPending) && (
          <div className={`flex items-center gap-3 p-4 rounded-2xl mb-5 text-sm font-semibold border ${
            success
              ? 'bg-emerald-55 border-emerald-100 text-emerald-700'
              : error
              ? 'bg-red-50 border-red-100 text-red-600'
              : 'bg-blue-50 border-blue-100 text-blue-700'
          }`}>
            {success ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
            {success || error || 'Đang thực hiện yêu cầu...'}
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {tab === 'info' ? (
            <form onSubmit={infoForm.handleSubmit(onUpdateProfileSubmit)} className="p-8 space-y-6">
              <div>
                <h2 className="text-base font-black text-slate-800 mb-1">Thông tin cá nhân</h2>
                <p className="text-xs text-slate-400 font-medium">Cập nhật tên, địa chỉ và thông tin liên hệ của bạn</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label htmlFor="fullName" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Họ và tên</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      id="fullName"
                      type="text"
                      {...infoForm.register('fullName', { required: 'Họ và tên không được để trống' })}
                      placeholder="Nhập họ và tên"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                  {infoForm.formState.errors.fullName && (
                    <p className="text-xs text-red-500 font-bold mt-1">{infoForm.formState.errors.fullName.message}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      id="email"
                      type="email"
                      {...infoForm.register('email', { 
                        required: 'Email không được để trống',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Địa chỉ email không đúng định dạng'
                        }
                      })}
                      placeholder="example@email.com"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                  {infoForm.formState.errors.email && (
                    <p className="text-xs text-red-500 font-bold mt-1">{infoForm.formState.errors.email.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Số điện thoại</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <Phone className="h-4 w-4" />
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      {...infoForm.register('phone', {
                        required: 'Số điện thoại không được để trống',
                        pattern: {
                          value: /^\d{9,11}$/,
                          message: 'Số điện thoại không hợp lệ (phải gồm 9-11 chữ số)'
                        }
                      })}
                      placeholder="0xxx xxx xxx"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                  {infoForm.formState.errors.phone && (
                    <p className="text-xs text-red-500 font-bold mt-1">{infoForm.formState.errors.phone.message}</p>
                  )}
                </div>

                {/* Avatar upload hint */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ảnh đại diện</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                  >
                    <img
                      src={avatarSrc}
                      alt="preview"
                      className="h-10 w-10 rounded-xl object-cover border border-slate-200"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Click để chọn ảnh mới</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBP · Tối đa 5MB</p>
                    </div>
                    {avatarUploading
                      ? <Loader2 className="h-4 w-4 animate-spin text-blue-500 ml-auto" />
                      : <Upload className="h-4 w-4 text-slate-400 group-hover:text-blue-500 ml-auto transition-colors" />
                    }
                  </div>
                </div>
              </div>

              {/* Address - Full width */}
              <div className="space-y-1.5">
                <label htmlFor="address" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Địa chỉ giao hàng mặc định</label>
                <div className="relative">
                  <span className="absolute top-3.5 left-0 flex items-center pl-4 text-slate-400">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <textarea
                    id="address"
                    {...infoForm.register('address', { required: 'Địa chỉ nhận hàng không được để trống' })}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                    rows={3}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                  />
                </div>
                {infoForm.formState.errors.address && (
                  <p className="text-xs text-red-500 font-bold mt-1">{infoForm.formState.errors.address.message}</p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-extrabold rounded-2xl transition-all shadow-md flex items-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
                >
                  {updateProfileMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</> : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={passwordForm.handleSubmit(onChangePasswordSubmit)} className="p-8 space-y-6">
              <div>
                <h2 className="text-base font-black text-slate-800 mb-1">Đổi mật khẩu</h2>
                <p className="text-xs text-slate-400 font-medium">Mật khẩu mới phải có ít nhất 6 ký tự</p>
              </div>

              <div className="space-y-5">
                {/* Current password */}
                <div className="space-y-1.5">
                  <label htmlFor="currentPassword" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Mật khẩu hiện tại</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      id="currentPassword"
                      type={showCurrent ? 'text' : 'password'}
                      {...passwordForm.register('currentPassword', { required: 'Vui lòng nhập mật khẩu hiện tại' })}
                      placeholder="Nhập mật khẩu hiện tại"
                      className="w-full pl-11 pr-11 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 cursor-pointer">
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-xs text-red-500 font-bold mt-1">{passwordForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>

                {/* New password */}
                <div className="space-y-1.5">
                  <label htmlFor="newPassword" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Mật khẩu mới</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      id="newPassword"
                      type={showNew ? 'text' : 'password'}
                      {...passwordForm.register('newPassword', { 
                        required: 'Vui lòng nhập mật khẩu mới',
                        minLength: { value: 6, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' }
                      })}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full pl-11 pr-11 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 cursor-pointer">
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-xs text-red-500 font-bold mt-1">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Xác nhận mật khẩu mới</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      id="confirmPassword"
                      type="password"
                      {...passwordForm.register('confirmPassword', { 
                        required: 'Vui lòng xác nhận mật khẩu mới',
                        validate: value => value === newPasswordValue || 'Mật khẩu xác nhận không khớp!'
                      })}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-red-500 font-bold mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-extrabold rounded-2xl transition-all shadow-md flex items-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
                >
                  {changePasswordMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang đổi...</> : 'Đổi mật khẩu'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
