import React, { useState } from 'react';
import { 
  Hash, 
  Languages, 
  Type, 
  Smile, 
  StickyNote, 
  Image as ImageIcon 
} from 'lucide-react';
import DashboardCard from './components/DashboardCard';
import ActivityModal from './components/ActivityModal';
import { CategoryId, CategoryItem } from './types';

// Data strictly matching the screenshot structure
const CATEGORIES: CategoryItem[] = [
  {
    id: CategoryId.NUMBERS,
    title: 'Raqamlar',
    icon: Hash,
    promptTopic: 'Numbers'
  },
  {
    id: CategoryId.WORDS,
    title: "So'zlar",
    icon: Languages,
    promptTopic: 'Vocabulary'
  },
  {
    id: CategoryId.FLASH_CARDS,
    title: 'Flash Cards',
    icon: Type,
    promptTopic: 'General Knowledge'
  },
  {
    id: CategoryId.FACES_NAMES,
    title: 'Yuz va ismlar',
    icon: Smile,
    isNew: true,
    promptTopic: 'Faces and Names'
  },
  {
    id: CategoryId.CARDS,
    title: 'Kartalar',
    icon: StickyNote,
    isNew: true,
    promptTopic: 'Memory Cards'
  },
  {
    id: CategoryId.PICTURES,
    title: 'Rasmlar',
    icon: ImageIcon,
    isNew: true,
    promptTopic: 'Pictures'
  }
];

const App: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans selection:bg-orange-200">
      
      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 2xl:py-20">
        
        {/* Header Section */}
        <header className="mb-6 sm:mb-8 lg:mb-10 2xl:mb-12">
          <h1 className="text-3xl sm:text-4xl 2xl:text-5xl font-extrabold text-gray-900 tracking-tight mb-2">
            Yo'nalishlar
          </h1>
          <p className="text-gray-500 text-sm sm:text-base 2xl:text-lg">Select a category to start training your memory.</p>
        </header>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 2xl:gap-8">
          {CATEGORIES.map((category) => (
            <DashboardCard
              key={category.id}
              title={category.title}
              icon={category.icon}
              isNew={category.isNew}
              onClick={() => setSelectedCategory(category)}
            />
          ))}
        </div>

      </main>

      {/* Interactive Modal */}
      {selectedCategory && (
        <ActivityModal 
          category={selectedCategory} 
          onClose={() => setSelectedCategory(null)} 
        />
      )}
    </div>
  );
};

export default App;