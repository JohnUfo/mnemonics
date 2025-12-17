import React, { useState, useEffect } from 'react';
import { 
  Hash, 
  Languages, 
  Type, 
  Smile, 
  StickyNote, 
  Image as ImageIcon,
  LogOut
} from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import DashboardCard from './components/DashboardCard';
import ActivityModal from './components/ActivityModal';
import LoginPage from './components/LoginPage';
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-tan"></div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans selection:bg-orange-200">
      
      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 2xl:py-20 relative">
        
        {/* Logout Button (Top Right) */}
        <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
           <button 
             onClick={handleLogout}
             className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 text-sm font-medium text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors"
           >
             <LogOut size={16} />
             <span className="hidden sm:inline">Chiqish</span>
           </button>
        </div>

        {/* Header Section */}
        <header className="mb-6 sm:mb-8 lg:mb-10 2xl:mb-12">
          <h1 className="text-3xl sm:text-4xl 2xl:text-5xl font-extrabold text-gray-900 tracking-tight mb-2">
            Yo'nalishlar
          </h1>
          <p className="text-gray-500 text-sm sm:text-base 2xl:text-lg">
            Welcome back, {session.user.user_metadata.full_name || session.user.email}
          </p>
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