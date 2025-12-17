
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, RefreshCw, ChevronRight, ChevronLeft, Loader2, ArrowLeft, ArrowRight, Cloud, LogOut, CheckCircle2 } from 'lucide-react';
import { CategoryId, CategoryItem, FlashCardData } from '../types';
import { generateContentForCategory } from '../services/geminiService';
import { supabase } from '../services/supabase';

interface ActivityModalProps {
  category: CategoryItem;
  onClose: () => void;
}

const ROWS_PER_PAGE = 12;
const COLS_PER_ROW = 40;
const TOTAL_PAGES = 3;
const MAJOR_SYSTEM_KEY = 'major_system_data';

const DEFAULT_MAJOR_SYSTEM: Record<string, string> = {
  "00": "ZiZi", "01": "ZayTun", "02": "ZiNa", "03": "ZoMbi", "04": "ZoRro", 
  "05": "ZuLuk", "06": "ZeBra", "07": "ZiraK", "08": "ZeFir", "09": "ZaGar",
  "10": "TuZ", "11": "ToTi", "12": "TaNka", "13": "ToM", "14": "TaRvuz", 
  "15": "TiLla", "16": "ToBut", "17": "TiKon", "18": "TuFli", "19": "TiGr",
  "20": "NayZa", "21": "NoTbuk", "22": "NoN", "23": "NeMo", "24": "NaRvon", 
  "25": "NaLichka", "26": "NoBel", "27": "NoK", "28": "NeFt", "29": "NeGr",
  "30": "MuZ", "31": "MoTor", "32": "MaNti", "33": "MayMun", "34": "MaRker", 
  "35": "MoL", "36": "MoBile", "37": "MaKaron", "38": "MikraFon", "39": "MaGnit",
  "40": "RoZetka", "41": "RaTsiya", "42": "RoNaldo", "43": "RoMol", "44": "aRRa", 
  "45": "RuL", "46": "RoBot", "47": "RaKeta", "48": "RaFaello", "49": "RaGatka",
  "50": "LaZer", "51": "LaTta", "52": "LeNta", "53": "LiMon", "54": "LoR", 
  "55": "LaLaku", "56": "LaB", "57": "LaK", "58": "LiFt", "59": "LaGan",
  "60": "BiZon", "61": "BiTon", "62": "BaNan", "63": "BoMba", "64": "BaRaban", 
  "65": "BoLta", "66": "BoBo", "67": "BoKal", "68": "BuFer", "69": "BeGemot",
  "70": "KoZ", "71": "KiTob", "72": "KoNfet", "73": "KaMon", "74": "KRovat", 
  "75": "KLavitura", "76": "KuBik", "77": "KaKtus", "78": "KoFe", "79": "KenGuru",
  "80": "FiZik", "81": "FuTbolka", "82": "FeN", "83": "FM radio", "84": "FaRtuk", 
  "85": "FiL", "86": "FBr agent", "87": "ForK", "88": "FiFa Kubogi", "89": "FurGon",
  "90": "GaZ", "91": "GiTara", "92": "GNom", "93": "GuMma", "94": "GaRri Potter", 
  "95": "GLam", "96": "GuBka", "97": "GulKaram", "98": "GraFin", "99": "GuGurt"
};

const ActivityModal: React.FC<ActivityModalProps> = ({ category, onClose }) => {
  const [viewState, setViewState] = useState<
    'SETUP' | 'COUNTDOWN' | 'GAME' | 'RECALL' | 'RESULT' | 'FLASHCARDS' | 
    'MAJOR_MENU' | 'MAJOR_EDIT' | 'MAJOR_PRACTICE' | 'MAJOR_RESULT'
  >(
    category.id === CategoryId.NUMBERS ? 'SETUP' : 
    category.id === CategoryId.FLASH_CARDS ? 'MAJOR_MENU' : 'FLASHCARDS'
  );

  const [config, setConfig] = useState({ cursorWidth: 2, separatorLines: 2, prepTime: 5 });
  const [countdown, setCountdown] = useState(5);
  const [gameTime, setGameTime] = useState(300);
  const [recallTime, setRecallTime] = useState(900);
  const [numbersGrid, setNumbersGrid] = useState<number[][][]>([]);
  const [userAnswers, setUserAnswers] = useState<string[][][]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [cursor, setCursor] = useState({ row: 0, col: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [cards, setCards] = useState<FlashCardData[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [majorSystem, setMajorSystem] = useState<Record<string, string>>({});
  const [practiceDeck, setPracticeDeck] = useState<string[]>([]);
  const [cardTimings, setCardTimings] = useState<Record<string, number>>({});
  const [currentCardStartTime, setCurrentCardStartTime] = useState(0);
  const [currentCardElapsedTime, setCurrentCardElapsedTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (category.id === CategoryId.FLASH_CARDS) {
        await loadMajorSystem(session?.user);
        setViewState('MAJOR_MENU');
      } else if (category.id !== CategoryId.NUMBERS) {
        loadFlashcards();
      }
    };
    init();
  }, [category]);

  const loadMajorSystem = async (currentUser?: any) => {
    setLoading(true);
    let system: Record<string, string> = {};
    
    // Try Cloud first
    if (currentUser) {
      const { data, error } = await supabase
        .from('major_systems')
        .select('number_key, word')
        .eq('user_id', currentUser.id);
      
      if (data && data.length > 0) {
        data.forEach(item => { system[item.number_key] = item.word; });
      }
    }

    // Fallback to LocalStorage if Cloud empty
    if (Object.keys(system).length === 0) {
      const stored = localStorage.getItem(MAJOR_SYSTEM_KEY);
      if (stored) system = JSON.parse(stored);
    }

    // Fill defaults
    for (let i = 0; i < 100; i++) {
      const key = i.toString().padStart(2, '0');
      if (!system[key]) system[key] = DEFAULT_MAJOR_SYSTEM[key] || '';
    }
    
    setMajorSystem(system);
    setLoading(false);
  };

  const saveMajorSystem = async () => {
    setSyncing(true);
    // Always save local
    localStorage.setItem(MAJOR_SYSTEM_KEY, JSON.stringify(majorSystem));

    // Save cloud if user exists
    if (user) {
      const updates = Object.entries(majorSystem).map(([key, word]) => ({
        user_id: user.id,
        number_key: key,
        word: word
      }));

      const { error } = await supabase
        .from('major_systems')
        .upsert(updates, { onConflict: 'user_id,number_key' });
      
      if (error) console.error("Cloud sync failed:", error);
    }
    setSyncing(false);
    setViewState('MAJOR_MENU');
  };

  const handleMajorInput = (key: string, value: string) => {
    setMajorSystem(prev => ({ ...prev, [key]: value }));
  };

  const startMajorPractice = () => {
    const deck = Object.keys(majorSystem).sort(() => Math.random() - 0.5);
    setPracticeDeck(deck);
    setCurrentCardIndex(0);
    setCardTimings({});
    setIsFlipped(false);
    setCurrentCardStartTime(Date.now());
    setViewState('MAJOR_PRACTICE');
  };

  const finishMajorPractice = useCallback(async () => {
    let finalTimings = { ...cardTimings };
    if (viewState === 'MAJOR_PRACTICE') {
       const currentKey = practiceDeck[currentCardIndex];
       const duration = Date.now() - currentCardStartTime;
       finalTimings[currentKey] = (finalTimings[currentKey] || 0) + duration;
       setCardTimings(finalTimings);
    }

    // FIX: Explicitly cast Object.values results to number[] to resolve operator '+' ambiguity on unknown types
    const totalTime = (Object.values(finalTimings) as number[]).reduce((a, b) => a + b, 0);

    // Save result to cloud
    if (user) {
      await supabase.from('training_results').insert({
        user_id: user.id,
        category: 'major_system',
        duration_ms: totalTime
      });
    }

    setViewState('MAJOR_RESULT');
  }, [viewState, practiceDeck, currentCardIndex, currentCardStartTime, cardTimings, user]);

  const loadFlashcards = async () => {
    setLoading(true);
    setCards([]);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    const data = await generateContentForCategory(category.promptTopic);
    setCards(data);
    setLoading(false);
  };

  // Timer logic for Major Practice
  useEffect(() => {
    if (viewState === 'MAJOR_PRACTICE') {
      const updateTimer = () => {
        setCurrentCardElapsedTime(Date.now() - currentCardStartTime);
        timerRef.current = requestAnimationFrame(updateTimer);
      };
      timerRef.current = requestAnimationFrame(updateTimer);
      return () => { if (timerRef.current) cancelAnimationFrame(timerRef.current); };
    }
  }, [viewState, currentCardStartTime]);

  const handleNextMajorCard = useCallback(() => {
    const currentKey = practiceDeck[currentCardIndex];
    const duration = Date.now() - currentCardStartTime;
    setCardTimings(prev => ({ ...prev, [currentKey]: (prev[currentKey] || 0) + duration }));
    if (currentCardIndex < practiceDeck.length - 1) {
      setIsFlipped(false);
      setCurrentCardIndex(prev => prev + 1);
      setCurrentCardStartTime(Date.now());
    } else {
      finishMajorPractice();
    }
  }, [practiceDeck, currentCardIndex, currentCardStartTime, finishMajorPractice]);

  const handlePrevMajorCard = useCallback(() => {
    if (currentCardIndex > 0) {
      const currentKey = practiceDeck[currentCardIndex];
      const duration = Date.now() - currentCardStartTime;
      setCardTimings(prev => ({ ...prev, [currentKey]: (prev[currentKey] || 0) + duration }));
      setIsFlipped(false);
      setCurrentCardIndex(prev => prev - 1);
      setCurrentCardStartTime(Date.now());
    }
  }, [practiceDeck, currentCardIndex, currentCardStartTime]);

  useEffect(() => {
    if (viewState === 'MAJOR_PRACTICE') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') handleNextMajorCard();
        else if (e.key === 'ArrowLeft') handlePrevMajorCard();
        else if (e.key === ' ' || e.key === 'Enter') setIsFlipped(prev => !prev);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [viewState, handleNextMajorCard, handlePrevMajorCard]);

  // Numbers Logic
  const handleStartGame = () => {
    const grid: number[][][] = [];
    const answersGrid: string[][][] = [];
    for (let p = 0; p < TOTAL_PAGES; p++) {
      const pageRows: number[][] = [], answerRows: string[][] = [];
      for (let r = 0; r < ROWS_PER_PAGE; r++) {
        const rowCols: number[] = [], answerCols: string[] = [];
        for (let c = 0; c < COLS_PER_ROW; c++) { rowCols.push(Math.floor(Math.random() * 10)); answerCols.push(""); }
        pageRows.push(rowCols); answerRows.push(answerCols);
      }
      grid.push(pageRows); answersGrid.push(answerRows);
    }
    setNumbersGrid(grid); setUserAnswers(answersGrid); setCountdown(config.prepTime); setViewState('COUNTDOWN');
  };

  // FIX: Implemented missing handleAnswerChange function to update userAnswers state in Numbers recall view
  const handleAnswerChange = (rowIndex: number, colIndex: number, value: string) => {
    setUserAnswers(prev => {
      const next = [...prev];
      if (!next[currentPage]) return prev;
      next[currentPage] = [...next[currentPage]];
      next[currentPage][rowIndex] = [...next[currentPage][rowIndex]];
      next[currentPage][rowIndex][colIndex] = value;
      return next;
    });

    // Auto-focus next cell for better UX
    if (value !== "" && colIndex < COLS_PER_ROW - 1) {
      document.getElementById(`cell-${rowIndex}-${colIndex + 1}`)?.focus();
    } else if (value !== "" && colIndex === COLS_PER_ROW - 1 && rowIndex < ROWS_PER_PAGE - 1) {
      document.getElementById(`cell-${rowIndex + 1}-0`)?.focus();
    }
  };

  const calculateStats = () => {
    let globalCorrect = 0, globalWrong = 0, globalScore = 0;
    for (let p = 0; p < TOTAL_PAGES; p++) {
      for (let r = 0; r < ROWS_PER_PAGE; r++) {
        let rowCorrect = 0, rowWrong = 0;
        const rowUserAnswers = userAnswers[p]?.[r] || [];
        const rowCorrectNumbers = numbersGrid[p]?.[r] || [];
        let lastIndex = -1;
        for (let i = COLS_PER_ROW - 1; i >= 0; i--) { if (rowUserAnswers[i] && rowUserAnswers[i] !== "") { lastIndex = i; break; } }
        if (lastIndex === -1) continue;
        for (let c = 0; c <= lastIndex; c++) {
          if ((rowUserAnswers[c] || "") === (rowCorrectNumbers[c]?.toString())) rowCorrect++;
          else if (rowUserAnswers[c] !== "") rowWrong++;
        }
        globalCorrect += rowCorrect; globalWrong += rowWrong;
        if (rowWrong === 0) globalScore += rowCorrect;
      }
    }
    return { totalScore: globalScore, correctCount: globalCorrect, wrongCount: globalWrong };
  };

  const handleFinishRecall = async () => {
    const { totalScore } = calculateStats();
    if (user) {
      await supabase.from('training_results').insert({
        user_id: user.id,
        category: 'numbers',
        score: totalScore
      });
    }
    setViewState('RESULT');
  };

  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const formatMsTime = (ms: number) => `${Math.floor(ms/60000).toString().padStart(2,'0')}:${Math.floor((ms%60000)/1000).toString().padStart(2,'0')}:${(ms%1000).toString().padStart(3,'0')}`;

  // RENDER LOGIC
  if (viewState === 'COUNTDOWN') return <div className="fixed inset-0 z-50 flex items-center justify-center bg-white"><div className="text-[12rem] md:text-[20rem] font-bold text-black tracking-tighter animate-pulse">{countdown}</div></div>;

  if (viewState === 'MAJOR_MENU') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50 md:bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-[#F8F9FA] md:bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 relative flex flex-col gap-6">
          <div className="flex items-center justify-center relative">
            <button onClick={onClose} className="absolute left-0 p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-900"><ArrowLeft size={24} /></button>
            <h2 className="text-xl font-bold text-gray-900">Flash Cards</h2>
          </div>
          <div className="flex flex-col gap-4">
            <button onClick={startMajorPractice} className="w-full bg-[#D99F72] hover:bg-[#c98e62] text-white font-bold text-lg py-5 rounded-xl shadow-lg shadow-orange-900/10 active:scale-[0.98] transition-all">Mashq qilish</button>
            <button onClick={() => setViewState('MAJOR_EDIT')} className="w-full bg-[#D99F72] hover:bg-[#c98e62] text-white font-bold text-lg py-5 rounded-xl shadow-lg shadow-orange-900/10 active:scale-[0.98] transition-all">Tizim yaratish</button>
          </div>
          <div className="border-t border-gray-200 pt-6">
             <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <Cloud size={20} className="text-green-500" />
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Cloud Sync</span>
                    <span className="text-sm font-bold text-gray-700 truncate max-w-[150px]">{user?.email || 'Authenticated'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <span className="text-[10px] text-green-600 font-bold uppercase">Online</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewState === 'MAJOR_EDIT') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#F8F9FA]">
        <div className="p-4 md:p-6 flex items-center justify-between bg-white border-b border-gray-100 shrink-0">
          <button onClick={() => setViewState('MAJOR_MENU')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></button>
          <h2 className="text-xl font-bold text-gray-900">Major System</h2>
          <button onClick={saveMajorSystem} disabled={syncing} className="bg-brand-tan text-white px-6 py-2 rounded-full font-bold shadow-md hover:opacity-90 active:scale-95 disabled:opacity-50 flex items-center gap-2">
            {syncing ? <Loader2 size={18} className="animate-spin" /> : 'Saqlash'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
          <div className="w-full max-w-lg space-y-8">
            {Array.from({ length: 100 }).map((_, i) => {
              const key = i.toString().padStart(2, '0');
              return (
                <div key={key} className="flex flex-col items-center gap-2">
                  <div className="w-full border-t border-dashed border-gray-300 mb-4"></div>
                  <div className="text-4xl font-normal text-gray-900 mb-2">{key}</div>
                  <div className="w-full">
                    <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Obraz</label>
                    <input type="text" value={majorSystem[key] || ''} onChange={(e) => handleMajorInput(key, e.target.value)} placeholder="Enter association..." className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 text-lg shadow-sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (viewState === 'MAJOR_PRACTICE') {
    const currentKey = practiceDeck[currentCardIndex];
    const currentValue = majorSystem[currentKey];
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#F8F9FA]">
        <div className="p-4 md:p-6 flex justify-between items-start shrink-0">
           <div className="text-xl md:text-2xl font-bold font-mono text-black">{formatMsTime(currentCardElapsedTime)}</div>
           <button onClick={finishMajorPractice} className="text-brand-tan font-bold text-base md:text-lg hover:opacity-80 transition-opacity">Hoziroq tugatish</button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="perspective-1000 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
             <div className={`relative w-64 h-96 sm:w-80 sm:h-[28rem] transition-all duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
               <div className="absolute inset-0 bg-[#D99F72] rounded-xl shadow-xl flex items-center justify-center p-8" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                 <span className="text-8xl font-medium text-white select-none">{currentKey}</span>
               </div>
               <div className="absolute inset-0 bg-[#D99F72] rounded-xl shadow-xl flex items-center justify-center p-8 text-center" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                 <span className="text-4xl font-medium text-white break-words select-none">{currentValue}</span>
               </div>
             </div>
          </div>
          <div className="mt-8 md:mt-12 flex items-center justify-center gap-8 md:gap-16 w-full">
            <button onClick={(e) => { e.stopPropagation(); handlePrevMajorCard(); }} className={`text-gray-300 hover:text-brand-tan transition-colors active:scale-95 p-2 ${currentCardIndex === 0 ? 'opacity-0 cursor-default pointer-events-none' : ''}`}><ArrowLeft size={36} strokeWidth={1.5} /></button>
            <div className="text-gray-900 font-bold text-lg md:text-xl font-mono select-none">{currentCardIndex + 1}/{practiceDeck.length}</div>
            <button onClick={(e) => { e.stopPropagation(); handleNextMajorCard(); }} className="text-gray-300 hover:text-brand-tan transition-colors active:scale-95 p-2"><ArrowRight size={36} strokeWidth={1.5} /></button>
          </div>
        </div>
      </div>
    );
  }
  
  if (viewState === 'MAJOR_RESULT') {
    const totalTime = (Object.values(cardTimings) as number[]).reduce((a, b) => a + b, 0);
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#F8F9FA] overflow-hidden">
        <div className="w-full max-w-3xl mx-auto p-6 md:p-8 flex justify-between items-end shrink-0 z-10">
           <button onClick={() => setViewState('MAJOR_MENU')} className="text-[#D99F72] font-bold text-lg md:text-xl hover:opacity-80 transition-opacity">Orqaga qaytish</button>
           <div className="text-xl md:text-2xl font-medium text-gray-900 font-mono tracking-tight">Jami: {formatMsTime(totalTime)}</div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-8 w-full flex justify-center">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-sm border border-gray-100/50 overflow-hidden">
             <div className="flex flex-col">
               {practiceDeck.map((key) => {
                 const timing = cardTimings[key];
                 if (timing === undefined) return null;
                 return (
                   <div key={key} className="group flex items-center justify-between py-4 px-6 md:px-8 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                     <div className="flex items-center gap-6 md:gap-8">
                       <span className="font-bold text-xl md:text-2xl text-gray-900 w-10 text-left font-mono">{key}</span>
                       <span className="text-gray-300 font-light text-xl">-</span>
                       <span className="font-bold text-lg md:text-xl text-gray-800">{majorSystem[key]}</span>
                     </div>
                     <span className="font-mono text-gray-400 text-sm md:text-base tracking-wider opacity-60 group-hover:opacity-100 transition-opacity">({formatMsTime(timing)})</span>
                   </div>
                 );
               })}
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewState === 'RESULT') {
    const { totalScore, correctCount, wrongCount } = calculateStats();
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#F8F9FA] overflow-hidden font-sans">
        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-2 pb-2 md:pt-4 flex flex-col w-full items-center justify-center min-h-0">
          <div className="w-full max-w-3xl mx-auto grid grid-cols-3 mb-2 px-4 shrink-0">
            <div className="flex flex-col items-center border-r-2 border-red-100 py-1"><div className="text-gray-900 text-xs sm:text-sm xl:text-base mb-1 font-medium text-center">To'g'ri</div><div className="text-2xl sm:text-3xl xl:text-4xl font-bold text-gray-900">{correctCount}</div></div>
            <div className="flex flex-col items-center border-r-2 border-red-100 py-1"><div className="text-gray-900 text-xs sm:text-sm xl:text-base mb-1 font-medium text-center">Xato</div><div className="text-2xl sm:text-3xl xl:text-4xl font-bold text-gray-900">{wrongCount}</div></div>
            <div className="flex flex-col items-center py-1"><div className="text-gray-900 text-xs sm:text-sm xl:text-base mb-1 font-medium text-center">Hisob</div><div className="text-2xl sm:text-3xl xl:text-4xl font-bold text-gray-900">{totalScore}</div></div>
          </div>
          <div className="w-full overflow-x-auto flex flex-col items-center px-2">
            <div className="min-w-fit bg-white p-2 xl:p-4 rounded-xl shadow-sm border border-gray-100 mx-auto">
              {numbersGrid[currentPage]?.map((row, rowIndex) => {
                 const rowUserAnswers = userAnswers[currentPage]?.[rowIndex] || [];
                 let lastIndex = -1;
                 for (let i = COLS_PER_ROW - 1; i >= 0; i--) { if (rowUserAnswers[i] && rowUserAnswers[i] !== "") { lastIndex = i; break; } }
                 return (
                  <div key={rowIndex} className="flex mb-[2px]">
                    <div className="w-6 md:w-8 text-gray-300 text-right mr-3 text-[10px] sm:text-xs select-none font-mono pt-1">{rowIndex + 1}</div>
                    <div className="flex flex-col">
                      <div className="flex">{row.map((digit, colIndex) => {
                        const userVal = rowUserAnswers[colIndex] || "";
                        const correctVal = digit.toString();
                        const isChecked = colIndex <= lastIndex;
                        let textColorClass = "text-transparent"; 
                        if (isChecked) {
                          if (userVal === correctVal) textColorClass = "text-green-600";
                          else if (userVal !== "") textColorClass = "text-red-600";
                        }
                        const finalDisplay = isChecked ? (userVal === "" ? digit : userVal) : "";
                        const showSeparator = (colIndex + 1) % config.separatorLines === 0 && colIndex < COLS_PER_ROW - 1;
                        return (<div key={`u-${colIndex}`} className={`w-3.5 h-5 text-[10px] sm:w-5 sm:h-7 sm:text-xs xl:w-6 xl:h-8 xl:text-sm 2xl:w-8 2xl:h-10 2xl:text-lg flex items-center justify-center font-bold border border-gray-100 bg-white ${textColorClass} ${showSeparator ? 'mr-0.5 sm:mr-1' : ''}`}>{finalDisplay}</div>);
                      })}</div>
                      <div className="flex">{row.map((digit, colIndex) => {
                        const showSeparator = (colIndex + 1) % config.separatorLines === 0 && colIndex < COLS_PER_ROW - 1;
                        return (<div key={`c-${colIndex}`} className={`w-3.5 h-5 text-[10px] sm:w-5 sm:h-7 sm:text-xs xl:w-6 xl:h-8 xl:text-sm 2xl:w-8 2xl:h-10 2xl:text-lg flex items-center justify-center font-bold border border-gray-100 bg-white text-black ${showSeparator ? 'mr-0.5 sm:mr-1' : ''}`}>{digit}</div>);
                      })}</div>
                    </div>
                  </div>
                 );
              })}
            </div>
          </div>
        </div>
        <div className="p-4 md:p-6 flex flex-col items-center gap-4 shrink-0 bg-[#F8F9FA] border-t border-gray-100 w-full">
           <div className="flex gap-4">{Array.from({ length: TOTAL_PAGES }).map((_, i) => (<button key={i} onClick={() => setCurrentPage(i)} className={`w-10 h-10 md:w-12 md:h-12 rounded-xl text-lg font-medium transition-all ${currentPage === i ? 'bg-brand-tan text-white shadow-lg' : 'bg-white text-gray-800 border shadow-sm'}`}>{i + 1}</button>))}</div>
           <button onClick={() => setViewState('SETUP')} className="w-full max-sm bg-brand-tan hover:bg-[#c98e62] text-white font-bold text-lg py-3 rounded-xl shadow-lg transition-all">Restart</button>
        </div>
      </div>
    );
  }

  if (viewState === 'RECALL') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#F8F9FA] overflow-hidden">
        <div className="p-4 md:p-6 flex justify-between items-center shrink-0">
           <div className="text-2xl sm:text-3xl xl:text-4xl font-bold font-mono text-black">{formatTime(recallTime)}</div>
           <button onClick={handleFinishRecall} className="text-brand-tan font-bold text-base sm:text-lg xl:text-xl hover:opacity-80 transition-opacity">Tugatish</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col w-full items-center justify-center">
          <div className="w-full overflow-x-auto flex justify-center">
            <div className="min-w-fit mx-auto">
              {userAnswers[currentPage]?.map((row, rowIndex) => (
                <div key={rowIndex} className="flex items-center mb-[2px]">
                  <span className="w-6 text-[10px] sm:text-xs mr-2 sm:w-8 sm:mr-4 lg:w-10 lg:mr-6 text-gray-300 text-right">{rowIndex + 1}</span>
                  <div className="flex flex-wrap gap-[1px] md:gap-[2px]">
                    {row.map((val, colIndex) => (
                      <input key={colIndex} id={`cell-${rowIndex}-${colIndex}`} type="text" inputMode="numeric" maxLength={1} value={val} onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length <= 1) {
                          handleAnswerChange(rowIndex, colIndex, val);
                        }
                      }} className="w-3.5 h-5 text-[10px] sm:w-5 sm:h-7 sm:text-xs xl:w-6 xl:h-8 xl:text-sm 2xl:w-8 2xl:h-10 2xl:text-lg text-center border border-gray-200 rounded-[2px] font-medium focus:border-brand-tan outline-none bg-white text-gray-900" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 flex justify-center shrink-0 w-full">
           <div className="flex gap-4">{Array.from({ length: TOTAL_PAGES }).map((_, i) => (<button key={i} onClick={() => setCurrentPage(i)} className={`w-10 h-10 md:w-12 md:h-12 rounded-xl text-lg font-medium transition-all ${currentPage === i ? 'bg-brand-tan text-white shadow-lg' : 'bg-white text-gray-800 border'}`}>{i + 1}</button>))}</div>
        </div>
      </div>
    );
  }

  // Fallback for generic flashcards
  const currentCard = cards[currentCardIndex];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3"><div className="p-2 bg-orange-50 rounded-xl"><category.icon size={20} className="text-brand-tan" /></div><h2 className="text-lg md:text-xl font-bold text-gray-900">{category.title}</h2></div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><X size={24} /></button>
        </div>
        <div className="flex-1 p-4 md:p-8 bg-gray-50 flex flex-col items-center justify-center overflow-y-auto">
          {loading ? (<div className="flex flex-col items-center gap-4 text-brand-tan"><Loader2 className="animate-spin" size={40} /><p className="text-gray-500 font-medium">Generatsiya qilinmoqda...</p></div>) : cards.length > 0 ? (
            <div className="w-full max-w-md flex flex-col items-center">
              <div className={`relative w-full h-64 md:h-80 transition-all duration-500 preserve-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`} onClick={() => setIsFlipped(!isFlipped)} style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                <div className="absolute inset-0 bg-white rounded-2xl shadow-lg border-2 border-orange-100 flex flex-col items-center justify-center p-6 text-center" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                  {currentCard.imageUrl ? (<img src={currentCard.imageUrl} className="w-full h-full object-contain" />) : (<><span className="text-[10px] font-bold text-orange-400 uppercase mb-2">Question</span><p className="text-xl md:text-2xl font-bold text-gray-800">{currentCard.front}</p></>)}
                </div>
                <div className="absolute inset-0 bg-brand-tan rounded-2xl shadow-lg flex flex-col items-center justify-center p-6 text-center" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}><span className="text-[10px] font-bold text-white/80 uppercase mb-2">Answer</span><p className="text-xl md:text-2xl font-bold text-white">{currentCard.back}</p></div>
              </div>
              <div className="mt-6 flex items-center justify-between w-full px-2">
                 <button onClick={() => { if (currentCardIndex > 0) { setIsFlipped(false); setTimeout(() => setCurrentCardIndex(p => p - 1), 150); } }} disabled={currentCardIndex === 0} className="p-3 rounded-full bg-white text-gray-600 shadow-md disabled:opacity-50"><ChevronLeft size={20} /></button>
                <span className="text-gray-500 font-medium font-mono">{currentCardIndex + 1} / {cards.length}</span>
                <button onClick={() => { if (currentCardIndex < cards.length - 1) { setIsFlipped(false); setTimeout(() => setCurrentCardIndex(p => p + 1), 150); } }} disabled={currentCardIndex === cards.length - 1} className="p-3 rounded-full bg-white text-gray-600 shadow-md disabled:opacity-50"><ChevronRight size={20} /></button>
              </div>
            </div>
          ) : (<div className="text-center text-gray-500"><p>Yuklab bo'lmadi.</p><button onClick={loadFlashcards} className="mt-4 text-brand-tan font-bold hover:underline">Qayta urinish</button></div>)}
        </div>
        <div className="p-4 bg-white border-t border-gray-100 flex justify-center shrink-0"><button onClick={loadFlashcards} className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-tan"><RefreshCw size={16} />Yangilash</button></div>
      </div>
    </div>
  );
};

export default ActivityModal;
