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
      className="relative bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center gap-4 md:gap-6 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-lg active:scale-95 md:active:scale-100 transition-all duration-300 md:hover:-translate-y-1 group border border-transparent hover:border-orange-100 h-56 md:h-64 w-full"
    >
      {isNew && (
        <div className="absolute top-4 right-4 md:top-6 md:right-6 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wide">
          NEW
        </div>
      )}
      
      <div className="text-brand-tan group-hover:scale-110 transition-transform duration-300">
        {/* Responsive icon size via class names overriding defaults if needed, or relying on lucide size prop if fixed. 
            Here we use classes to control size responsively. */}
        <Icon className="w-10 h-10 md:w-12 md:h-12" strokeWidth={1.5} color="#D99F72" />
      </div>
      
      <h3 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">
        {title}
      </h3>
    </div>
  );
};

export default DashboardCard;