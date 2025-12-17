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
  Loader2,
  Check,
  AlertCircle,
  Clock
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

  // Profile Edit State
  const [editForm, setEditForm] = useState<{ full_name: string; username: string }>({ full_name: '', username: '' });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Initialize Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id, session.user);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id, session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Presence Tracking (Online/Away)
  useEffect(() => {
    if (!user?.id) return;

    const setStatus = async (status: boolean) => {
      try {
        await supabase.from('profiles').update({ is_online: status }).eq('id', user.id);
      } catch (err) {
        console.error("Error updating online status:", err);
      }
    };

    // Set online on mount
    setStatus(true);

    const handleVisibilityChange = () => {
      setStatus(document.visibilityState === 'visible');
    };

    const handleBeforeUnload = () => {
       setStatus(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setStatus(false);
    };
  }, [user?.id]);

  // Sync editForm with User state whenever user changes
  useEffect(() => {
    if (user) {
        setEditForm({
            full_name: user.full_name || '',
            username: user.username || ''
        });
    }
  }, [user]);

  const fetchProfile = async (userId: string, authUser?: any) => {
    console.log("Fetching profile for ID:", userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      console.log("Supabase Profile Data:", data);
      if (error) console.error("Supabase Profile Error:", error);

      if (data) {
        // Profile exists in DB
        // If full_name is null in DB, try to use metadata from authUser
        const fullName = data.full_name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || '';
        
        const userData: User = {
          id: data.id,
          username: data.username || 'user', // Fallback if somehow null
          full_name: fullName,
          is_online: true, 
          avatar_id: data.avatar_id,
          last_username_change: data.last_username_change
        };
        
        console.log("Setting User State:", userData);
        setUser(userData);
      } else {
        console.log("No profile found in DB, creating new...");
        // First time login - Create Profile
        if (authUser) {
          const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || '';
          const baseUsername = authUser.email?.split('@')[0] || 'user';
          // Add random string to ensure uniqueness on creation
          const uniqueUsername = `${baseUsername}_${Math.floor(Math.random() * 1000)}`;

          const { error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: userId,
                username: uniqueUsername,
                full_name: fullName,
                is_online: true,
                avatar_id: 1,
                last_username_change: null 
              }
            ]);
          
          if (insertError) {
             console.error("Error creating profile:", insertError);
          } else {
             const newUser: User = {
               id: userId,
               username: uniqueUsername,
               full_name: fullName,
               is_online: true,
               avatar_id: 1,
               last_username_change: null
             };
             console.log("Created New User:", newUser);
             setUser(newUser);
          }
        }
      }
    } catch (err) {
      console.error("Fetch profile exception:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (user) {
        await supabase.from('profiles').update({ is_online: false }).eq('id', user.id);
    }
    await supabase.auth.signOut();
    setShowProfileModal(false);
    setView('DASHBOARD');
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    setEditError(null);
    setEditSuccess(null);

    console.log("Attempting to save profile:", editForm);

    try {
        const updates: any = {
            full_name: editForm.full_name,
        };

        // Username change logic
        if (editForm.username && editForm.username !== user.username) {
            // Check 30 day limit
            if (user.last_username_change) {
                const lastChange = new Date(user.last_username_change);
                const now = new Date();
                const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
                
                if (now.getTime() - lastChange.getTime() < THIRTY_DAYS_MS) {
                    const remainingMs = THIRTY_DAYS_MS - (now.getTime() - lastChange.getTime());
                    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
                    throw new Error(`Username can only be changed once every 30 days. Try again in ${remainingDays} days.`);
                }
            }
            updates.username = editForm.username;
            updates.last_username_change = new Date().toISOString();
        }

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) {
            console.error("Supabase Update Error:", error);
            if (error.code === '23505') { // Unique violation
                throw new Error("Bu username band. Iltimos boshqasini tanlang.");
            }
            throw error;
        }

        console.log("Profile updated successfully in DB");

        // Update local state
        setUser({
            ...user,
            full_name: updates.full_name,
            username: updates.username || user.username,
            last_username_change: updates.last_username_change || user.last_username_change
        });
        setEditSuccess("Profil muvaffaqiyatli yangilandi!");
        
        setTimeout(() => setEditSuccess(null), 2000);

    } catch (err: any) {
        console.error("Profile save exception:", err);
        setEditError(err.message || "Xatolik yuz berdi");
    } finally {
        setIsSavingProfile(false);
    }
  };

  const canChangeUsername = () => {
      if (!user?.last_username_change) return true;
      const lastChange = new Date(user.last_username_change);
      const now = new Date();
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      return (now.getTime() - lastChange.getTime()) >= THIRTY_DAYS_MS;
  };

  const getDaysRemaining = () => {
      if (!user?.last_username_change) return 0;
      const lastChange = new Date(user.last_username_change);
      const now = new Date();
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const remainingMs = THIRTY_DAYS_MS - (now.getTime() - lastChange.getTime());
      return Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
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

  // FORCE LOGIN
  if (!session) {
    return <AuthPage />;
  }

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
                onClick={() => {
                    console.log("Opening modal. Current User State:", user);
                    setShowProfileModal(true);
                    setEditError(null);
                    setEditSuccess(null);
                }}
                className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded-full transition-colors"
               >
                 <div className="text-right hidden sm:block">
                   <div className="text-sm font-bold text-gray-900 leading-none">{user.full_name || user.username}</div>
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

      {/* Activity Modal */}
      {selectedCategory && (
        <ActivityModal 
          category={selectedCategory} 
          onClose={() => setSelectedCategory(null)} 
        />
      )}

      {/* Profile/Settings Modal */}
      {showProfileModal && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
             <div className="bg-gray-50 p-6 border-b border-gray-100 flex flex-col items-center shrink-0">
                <button onClick={() => setShowProfileModal(false)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-900"><X size={20} /></button>
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl font-bold text-brand-tan border-4 border-white shadow-sm mb-3 uppercase relative">
                   {user.username?.[0] || '?'}
                   <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{user.full_name || 'No Name'}</h2>
                <span className="text-gray-500 text-sm">@{user.username || 'username'}</span>
             </div>
             
             <div className="p-6 space-y-5 overflow-y-auto">
                
                {/* Form */}
                <div className="space-y-4">
                    {/* Full Name */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Ism Familiya</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={editForm.full_name}
                                onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                                className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-tan focus:border-transparent outline-none font-medium text-gray-900"
                                placeholder="Ismingizni kiriting"
                            />
                            <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Username</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={editForm.username}
                                onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                                disabled={!canChangeUsername()}
                                className={`w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium text-gray-900 ${!canChangeUsername() ? 'opacity-60 cursor-not-allowed bg-gray-100' : 'bg-gray-50 focus:ring-2 focus:ring-brand-tan focus:border-transparent'}`}
                                placeholder="Username"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</div>
                        </div>
                        {!canChangeUsername() && (
                            <p className="text-xs text-orange-600 mt-2 flex items-center gap-1 font-medium">
                                <Clock size={12} />
                                {getDaysRemaining()} kundan keyin o'zgartira olasiz
                            </p>
                        )}
                        {canChangeUsername() && (
                             <p className="text-xs text-gray-400 mt-2">
                                Username o'zgartirilgach 30 kun davomida qayta o'zgartirib bo'lmaydi.
                            </p>
                        )}
                    </div>
                </div>

                {/* Messages */}
                {editError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm font-medium">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{editError}</span>
                    </div>
                )}
                
                {editSuccess && (
                    <div className="bg-green-50 text-green-600 p-3 rounded-xl flex items-center gap-2 text-sm font-medium">
                        <Check size={16} className="shrink-0" />
                        <span>{editSuccess}</span>
                    </div>
                )}

                <div className="pt-2">
                    <button 
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="w-full bg-brand-tan hover:bg-[#c98e62] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-900/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isSavingProfile ? <Loader2 className="animate-spin" size={20}/> : 'Saqlash'}
                    </button>
                </div>

                <div className="border-t border-gray-100 pt-2">
                    <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 text-red-500 font-bold py-2 hover:bg-red-50 rounded-xl transition-colors"
                    >
                    <LogOut size={18} />
                    Chiqish
                    </button>
                </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;