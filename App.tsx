import React, { useState, useEffect } from 'react';
import { 
  Hash, 
  Languages, 
  Type, 
  Smile, 
  StickyNote, 
  Image as ImageIcon,
  User as UserIcon,
  Settings,
  LogOut,
  X,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { supabase } from './lib/supabase';
import DashboardCard from './components/DashboardCard';
import ActivityModal from './components/ActivityModal';
import NumbersPage from './components/NumbersPage';
import AuthPage from './components/AuthPage';
import { CategoryId, CategoryItem, User } from './types';

const CATEGORIES: CategoryItem[] = [
  {
    id: CategoryId.NUMBERS,
    title: 'Raqamlar',
    icon: Hash,
    status: 'ready',
    promptTopic: 'Numbers'
  },
  {
    id: CategoryId.WORDS,
    title: "So'zlar",
    icon: Languages,
    status: 'wip',
    promptTopic: 'Vocabulary'
  },
  {
    id: CategoryId.FLASH_CARDS,
    title: 'Flash Cards',
    icon: Type,
    status: 'ready',
    promptTopic: 'General Knowledge'
  },
  {
    id: CategoryId.FACES_NAMES,
    title: 'Yuz va ismlar',
    icon: Smile,
    isNew: true,
    status: 'wip',
    promptTopic: 'Faces and Names'
  },
  {
    id: CategoryId.CARDS,
    title: 'Kartalar',
    icon: StickyNote,
    isNew: true,
    status: 'wip',
    promptTopic: 'Memory Cards'
  },
  {
    id: CategoryId.PICTURES,
    title: 'Rasmlar',
    icon: ImageIcon,
    isNew: true,
    status: 'wip',
    promptTopic: 'Pictures'
  }
];

const App: React.FC = () => {
  // Navigation & Auth State
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'DASHBOARD' | 'NUMBERS_GAME'>('DASHBOARD');
  
  // Modal State
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Initialize Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
      } else if (data) {
        // Map Supabase column names to our User type
        setUser({
          id: data.id,
          username: data.username,
          is_online: data.is_online,
          avatar_id: data.avatar_id
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowProfileModal(false);
    setView('DASHBOARD');
  };

  const handleUpdateProfile = async (updates: Partial<User>) => {
    if (!user) return;
    
    // Optimistic UI update
    setUser({ ...user, ...updates });

    try {
      // Map back to DB column names
      const dbUpdates: any = {};
      if (updates.is_online !== undefined) dbUpdates.is_online = updates.is_online;
      
      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating profile:', error);
      // Revert on error would go here
    }
  };

  const handleCategoryClick = (category: CategoryItem) => {
    if (category.status === 'wip') return;

    if (category.id === CategoryId.NUMBERS) {
      setView('NUMBERS_GAME');
    } else {
      setSelectedCategory(category);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="animate-spin text-brand-tan" size={48} />
      </div>
    );
  }

  // FORCE LOGIN: If no session, show Auth Page
  if (!session) {
    return <AuthPage />;
  }

  // Main App Content (Only shown when logged in)
  
  if (view === 'NUMBERS_GAME' && user) {
     return <NumbersPage onBack={() => setView('DASHBOARD')} currentUser={user} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans selection:bg-orange-200">
      
      {/* Navigation Header */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
           <div className="font-extrabold text-xl tracking-tight text-gray-900">Xotira</div>
           
           <div className="flex items-center gap-4">
             {user && (
               <button 
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded-full transition-colors"
               >
                 <div className="text-right hidden sm:block">
                   <div className="text-sm font-bold text-gray-900 leading-none">{user.username}</div>
                   <div className="text-xs text-green-600 font-medium leading-none mt-1">Online</div>
                 </div>
                 <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-brand-tan font-bold border border-orange-200 uppercase">
                   {user.username?.[0]}
                 </div>
               </button>
             )}
           </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <header className="mb-6 sm:mb-8 lg:mb-10">
          <h1 className="text-3xl sm:text-4xl 2xl:text-5xl font-extrabold text-gray-900 tracking-tight mb-2">
            Yo'nalishlar
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">Select a category to start training your memory.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 2xl:gap-8">
          {CATEGORIES.map((category) => (
            <DashboardCard
              key={category.id}
              title={category.title}
              icon={category.icon}
              isNew={category.isNew}
              status={category.status}
              onClick={() => handleCategoryClick(category)}
            />
          ))}
        </div>
      </main>

      {/* Legacy Modal (Flashcards) */}
      {selectedCategory && (
        <ActivityModal 
          category={selectedCategory} 
          onClose={() => setSelectedCategory(null)} 
        />
      )}

      {/* Profile/Settings Modal */}
      {showProfileModal && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden relative">
             <div className="bg-gray-50 p-6 border-b border-gray-100 flex flex-col items-center">
                <button onClick={() => setShowProfileModal(false)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-900"><X size={20} /></button>
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-3xl font-bold text-brand-tan border-4 border-white shadow-sm mb-3 uppercase">
                   {user.username[0]}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{user.username}</h2>
                <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full mt-1">Online</span>
             </div>
             
             <div className="p-6 space-y-4">
                <div className="space-y-3">
                   {/* Online Status Toggle */}
                   <div 
                      onClick={() => handleUpdateProfile({ is_online: !user.is_online })}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer"
                   >
                      <div className="flex items-center gap-3 text-gray-700">
                         <Settings size={18} />
                         <span className="font-medium text-sm">Visible Online</span>
                      </div>
                      <div className={`w-10 h-6 rounded-full p-1 transition-colors ${user.is_online ? 'bg-brand-tan' : 'bg-gray-300'}`}>
                         <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${user.is_online ? 'translate-x-4' : ''}`} />
                      </div>
                   </div>
                </div>

                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 text-red-500 font-bold py-3 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <LogOut size={18} />
                  Chiqish
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;