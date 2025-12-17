import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  icon: LucideIcon;
  isNew?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, icon: Icon, isNew, disabled, onClick }) => {
  return (
    <div 
      onClick={disabled ? undefined : onClick}
      className={`relative bg-white rounded-2xl xl:rounded-3xl p-4 sm:p-6 2xl:p-8 flex flex-col items-center justify-center gap-3 sm:gap-4 2xl:gap-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 h-40 sm:h-48 xl:h-56 2xl:h-64 w-full border border-transparent 
        ${disabled 
          ? 'opacity-60 cursor-not-allowed grayscale-[0.5]' 
          : 'cursor-pointer hover:shadow-lg active:scale-95 md:active:scale-100 md:hover:-translate-y-1 group hover:border-orange-100'
        }`}
    >
      {disabled ? (
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 2xl:top-6 2xl:right-6 bg-gray-400 text-white text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md tracking-wide">
          TEZ KUNDA
        </div>
      ) : isNew ? (
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 2xl:top-6 2xl:right-6 bg-red-600 text-white text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md tracking-wide">
          NEW
        </div>
      ) : null}
      
      <div className={`${disabled ? 'text-gray-400' : 'text-brand-tan group-hover:scale-110'} transition-transform duration-300`}>
        <Icon className="w-8 h-8 sm:w-10 sm:h-10 2xl:w-12 2xl:h-12" strokeWidth={1.5} color={disabled ? "#9CA3AF" : "#D99F72"} />
      </div>
      
      <h3 className={`text-base sm:text-lg 2xl:text-xl font-bold tracking-tight text-center ${disabled ? 'text-gray-400' : 'text-gray-900'}`}>
        {title}
      </h3>
    </div>
  );
};

export default DashboardCard;