import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  icon: LucideIcon;
  isNew?: boolean;
  onClick: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, icon: Icon, isNew, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="relative bg-white rounded-2xl xl:rounded-3xl p-4 sm:p-6 2xl:p-8 flex flex-col items-center justify-center gap-3 sm:gap-4 2xl:gap-6 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-lg active:scale-95 md:active:scale-100 transition-all duration-300 md:hover:-translate-y-1 group border border-transparent hover:border-orange-100 h-40 sm:h-48 xl:h-56 2xl:h-64 w-full"
    >
      {isNew && (
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 2xl:top-6 2xl:right-6 bg-red-600 text-white text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md tracking-wide">
          NEW
        </div>
      )}
      
      <div className="text-brand-tan group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-8 h-8 sm:w-10 sm:h-10 2xl:w-12 2xl:h-12" strokeWidth={1.5} color="#D99F72" />
      </div>
      
      <h3 className="text-base sm:text-lg 2xl:text-xl font-bold text-gray-900 tracking-tight text-center">
        {title}
      </h3>
    </div>
  );
};

export default DashboardCard;