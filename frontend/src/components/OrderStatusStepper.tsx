import React from 'react';
import { Clock, CheckCircle2, Truck, PackageCheck, XCircle } from 'lucide-react';

interface OrderStatusStepperProps {
  status: string;
}

export const OrderStatusStepper: React.FC<OrderStatusStepperProps> = ({ status }) => {
  const steps = [
    { label: 'Chờ xử lý', key: 'PENDING', icon: Clock },
    { label: 'Xác nhận', key: 'CONFIRMED', icon: CheckCircle2 },
    { label: 'Đang giao', key: 'SHIPPING', icon: Truck },
    { label: 'Đã giao', key: 'DELIVERED', icon: PackageCheck },
  ];

  const getStatusIndex = (currentStatus: string) => {
    switch (currentStatus) {
      case 'PENDING':
        return 0;
      case 'CONFIRMED':
        return 1;
      case 'SHIPPING':
        return 2;
      case 'DELIVERED':
        return 3;
      default:
        return -1;
    }
  };

  const currentIndex = getStatusIndex(status);

  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-red-50/80 backdrop-blur-md border border-red-100 p-4 text-red-700 shadow-sm transition-all duration-300">
        <XCircle className="h-6 w-6 text-red-500 animate-pulse" />
        <div>
          <h4 className="font-bold text-sm">Đơn hàng đã bị hủy</h4>
          <p className="text-xs text-red-500/90 mt-0.5">Liên hệ bộ phận chăm sóc khách hàng để biết thêm chi tiết.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-4 px-2">
      <div className="relative flex items-center justify-between w-full">
        {/* Progress Line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[3px] w-full bg-slate-100 rounded-full -z-10">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ 
              width: currentIndex >= 0 ? `${(currentIndex / (steps.length - 1)) * 100}%` : '0%' 
            }}
          />
        </div>

        {/* Steps */}
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;
          const isPending = idx > currentIndex;

          return (
            <div key={step.key} className="flex flex-col items-center">
              <div 
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-500 shadow-sm ${
                  isCompleted 
                    ? 'bg-emerald-500 border-emerald-500 text-white scale-105' 
                    : isActive 
                    ? 'bg-blue-600 border-blue-600 text-white scale-110 ring-4 ring-blue-100 animate-pulse' 
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <StepIcon className="h-5 w-5" />
              </div>
              <span 
                className={`mt-2.5 text-xs font-semibold tracking-wide transition-colors duration-300 ${
                  isCompleted 
                    ? 'text-emerald-600' 
                    : isActive 
                    ? 'text-blue-600 font-extrabold' 
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
