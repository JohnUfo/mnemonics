import React, { useState, useEffect } from 'react';
import { 
  Hash, 
  Languages, 
  Type, 
  Smile, 
  StickyNote, 
  Image as ImageIcon,
  Loader2,
  User,
  Settings,
  LogOut,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import DashboardCard from './components/DashboardCard';
import ActivityModal from './components/ActivityModal';
import AuthPage from './components/AuthPage';
import { CategoryId, CategoryItem } from './types';
import { supabase } from './services/supabase';

const CATEGORIES: CategoryItem[] = [
  {
    id: CategoryId.NUMBERS,
    title: 'Raqamlar',
    icon: Hash,
    promptTopic: 'Numbers'
  },
  {
    id: CategoryId.FLASH_CARDS,
    title: 'Flash Cards',
    icon: Type,
    promptTopic: 'General Knowledge'
  },
  {
    id: CategoryId.WORDS,
    title: "So'zlar",
    icon: Languages,
    promptTopic: 'Vocabulary'
  },
  {
    id: CategoryId.FACES_NAMES,
    title: 'Yuz va ismlar',
    icon: Smile,
    promptTopic: 'Faces and Names'
  },
  {
    id: CategoryId.CARDS,
    title: 'Kartalar',
    icon: StickyNote,
    promptTopic: 'Memory Cards'
  },
  {
    id: CategoryId.PICTURES,
    title: 'Rasmlar',
    icon: ImageIcon,
    promptTopic: 'Pictures'
  }
];

const FINISHED_CATEGORIES = [CategoryId.NUMBERS, CategoryId.FLASH_CARDS];

const App: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Profile Form State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
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

      if (data) {
        setProfile(data);
        setUsername(data.username || '');
        setFullName(data.full_name || '');
      }
    } catch (err) {
      console.error('Profile fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);

    const { error } = await supabase
      .from('profiles')
      .update({
        username: username.toLowerCase().trim(),
        full_name: fullName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);

    if (error) {
      if (error.code === '23505') setProfileError('Bu foydalanuvchi nomi band.');
      else setProfileError(error.message);
    } else {
      await fetchProfile(session.user.id);
      setShowProfileModal(false);
    }
    setProfileSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="animate-spin text-[#D99F72]" size={48} />
      </div>
    );
  }

  if (!session) return <AuthPage />;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans selection:bg-orange-200">
      
      {/* Dashboard Header */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 2xl:py-20">
        <header className="mb-6 sm:mb-8 lg:mb-10 2xl:mb-12 flex justify-between items-start">
          <div>
            <h1 className="text-3xl sm:text-4xl 2xl:text-5xl font-extrabold text-gray-900 tracking-tight mb-2">
              Yo'nalishlar
            </h1>
            <p className="text-gray-500 text-sm sm:text-base 2xl:text-lg">Xotirani mashq qilish uchun yo'nalishni tanlang.</p>
          </div>
          
          {/* Profile Quick Access */}
          <button 
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-3 bg-white p-2 pr-4 rounded-full shadow-sm border border-gray-100 hover:border-orange-200 transition-all active:scale-95"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="User" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-brand-tan">
                <User size={20} />
              </div>
            )}
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm font-bold text-gray-900 leading-tight">
                {profile?.full_name || 'Foydalanuvchi'}
              </span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                @{profile?.username || 'user'}
              </span>
            </div>
          </button>
        </header>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 2xl:gap-8">
          {CATEGORIES.map((category) => (
            <DashboardCard
              key={category.id}
              title={category.title}
              icon={category.icon}
              disabled={!FINISHED_CATEGORIES.includes(category.id)}
              onClick={() => setSelectedCategory(category)}
            />
          ))}
        </div>
      </main>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Profil sozlamalari</h2>
              <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="p-6 flex flex-col gap-6">
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <img src={profile?.avatar_url} className="w-24 h-24 rounded-3xl object-cover border-4 border-orange-50" />
                  <div className="absolute inset-0 bg-black/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Settings className="text-white" size={24} />
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-400 font-medium">{session.user.email}</p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Foydalanuvchi nomi</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                    <input 
                      type="text"
                      required
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-transparent focus:border-brand-tan focus:bg-white rounded-xl outline-none font-bold transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">To'liq ism</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ism sharif"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-brand-tan focus:bg-white rounded-xl outline-none font-bold transition-all"
                  />
                </div>
              </div>

              {profileError && (
                <div className="bg-red-50 p-4 rounded-xl flex gap-3 items-center text-red-600">
                  <AlertCircle size={18} />
                  <span className="text-xs font-bold">{profileError}</span>
                </div>
              )}

              <div className="flex flex-col gap-3 mt-4">
                <button 
                  type="submit"
                  disabled={profileSaving}
                  className="w-full bg-brand-tan hover:bg-[#c98e62] text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-900/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {profileSaving ? <Loader2 className="animate-spin" size={20} /> : <><Check size={20} /> Saqlash</>}
                </button>
                <button 
                  type="button"
                  onClick={() => supabase.auth.signOut()}
                  className="w-full flex items-center justify-center gap-2 py-3 text-gray-400 hover:text-red-500 font-bold transition-colors"
                >
                  <LogOut size={18} /> Chiqish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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