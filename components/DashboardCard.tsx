import React from 'react';
import { LucideIcon, Lock, Clock } from 'lucide-react';
import { CategoryStatus } from '../types';

interface DashboardCardProps {
  title: string;
  icon: LucideIcon;
  isNew?: boolean;
  status: CategoryStatus;
  onClick: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, icon: Icon, isNew, status, onClick }) => {
  const isWip = status === 'wip';

  return (
    <div 
      onClick={onClick}
      className={`relative rounded-2xl xl:rounded-3xl p-4 sm:p-6 2xl:p-8 flex flex-col items-center justify-center gap-3 sm:gap-4 2xl:gap-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] h-40 sm:h-48 xl:h-56 2xl:h-64 w-full border transition-all duration-300
        ${isWip 
          ? 'bg-gray-50 cursor-not-allowed border-gray-100 opacity-80' 
          : 'bg-white cursor-pointer hover:shadow-lg active:scale-95 md:active:scale-100 md:hover:-translate-y-1 border-transparent hover:border-orange-100'
        }
      `}
    >
      {isNew && !isWip && (
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 2xl:top-6 2xl:right-6 bg-red-600 text-white text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md tracking-wide">
          NEW
        </div>
      )}

      {isWip && (
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400">
           <Clock size={16} />
        </div>
      )}
      
      <div className={`${isWip ? 'text-gray-300' : 'text-brand-tan group-hover:scale-110'} transition-transform duration-300`}>
        <Icon className="w-8 h-8 sm:w-10 sm:h-10 2xl:w-12 2xl:h-12" strokeWidth={1.5} color={isWip ? "#d1d5db" : "#D99F72"} />
      </div>
      
      <div className="flex flex-col items-center">
        <h3 className={`text-base sm:text-lg 2xl:text-xl font-bold tracking-tight text-center ${isWip ? 'text-gray-400' : 'text-gray-900'}`}>
          {title}
        </h3>
        {isWip && (
          <span className="text-xs text-gray-400 font-medium mt-1">Tez orada</span>
        )}
      </div>
    </div>
  );
};

export default DashboardCard;