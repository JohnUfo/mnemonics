import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, RefreshCw, ChevronRight, ChevronLeft, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { CategoryId, CategoryItem, FlashCardData } from '../types';
import { generateContentForCategory } from '../services/geminiService';

interface ActivityModalProps {
  category: CategoryItem;
  onClose: () => void;
}

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
  // Only handle Flashcards / Major System here. 
  // Numbers are handled in NumbersPage.tsx.
  // Other categories are WIP.
  
  const [viewState, setViewState] = useState<
    'FLASHCARDS' | 'MAJOR_MENU' | 'MAJOR_EDIT' | 'MAJOR_PRACTICE' | 'MAJOR_RESULT'
  >(
    category.id === CategoryId.FLASH_CARDS ? 'MAJOR_MENU' : 'FLASHCARDS'
  );

  // Flashcard State
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<FlashCardData[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Major System State
  const [majorSystem, setMajorSystem] = useState<Record<string, string>>({});
  const [practiceDeck, setPracticeDeck] = useState<string[]>([]);
  const [cardTimings, setCardTimings] = useState<Record<string, number>>({});
  const [currentCardStartTime, setCurrentCardStartTime] = useState(0);
  const [currentCardElapsedTime, setCurrentCardElapsedTime] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (category.id === CategoryId.FLASH_CARDS) {
      loadMajorSystem();
      setViewState('MAJOR_MENU');
    } else {
      // Should effectively not be reached if App.tsx filters properly, 
      // but keeping as fallback for legacy logic
      loadFlashcards();
    }
  }, [category]);

  const loadMajorSystem = () => {
    const stored = localStorage.getItem(MAJOR_SYSTEM_KEY);
    let system: Record<string, string> = {};
    if (stored) system = JSON.parse(stored);
    for (let i = 0; i < 100; i++) {
      const key = i.toString().padStart(2, '0');
      if (!system[key]) system[key] = DEFAULT_MAJOR_SYSTEM[key] || '';
    }
    setMajorSystem(system);
  };

  const saveMajorSystem = () => {
    localStorage.setItem(MAJOR_SYSTEM_KEY, JSON.stringify(majorSystem));
    setViewState('MAJOR_MENU');
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

  const handleMajorInput = (key: string, value: string) => {
    setMajorSystem(prev => ({ ...prev, [key]: value }));
  };

  const loadFlashcards = async () => {
    setLoading(true);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    const data = await generateContentForCategory(category.promptTopic);
    setCards(data);
    setLoading(false);
  };

  useEffect(() => {
    if (viewState === 'MAJOR_PRACTICE') {
      const updateTimer = () => {
        setCurrentCardElapsedTime(Date.now() - currentCardStartTime);
        timerRef.current = requestAnimationFrame(updateTimer);
      };
      timerRef.current = requestAnimationFrame(updateTimer);
      return () => {
        if (timerRef.current) cancelAnimationFrame(timerRef.current);
      };
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
  }, [practiceDeck, currentCardIndex, currentCardStartTime]);

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

  const finishMajorPractice = useCallback(() => {
    if (viewState === 'MAJOR_PRACTICE') {
       const currentKey = practiceDeck[currentCardIndex];
       const duration = Date.now() - currentCardStartTime;
       setCardTimings(prev => ({ ...prev, [currentKey]: (prev[currentKey] || 0) + duration }));
    }
    setViewState('MAJOR_RESULT');
  }, [viewState, practiceDeck, currentCardIndex, currentCardStartTime]);

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

  const formatMsTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(3, '0')}`;
  };

  // --- RENDERERS ---

  if (viewState === 'MAJOR_MENU') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50 md:bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-[#F8F9FA] md:bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 relative">
          <div className="flex items-center justify-center mb-6 relative">
            <button 
              onClick={onClose}
              className="absolute left-0 p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-900"
            >
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-900">Flash Cards</h2>
          </div>
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={startMajorPractice}
              className="w-full bg-[#D99F72] hover:bg-[#c98e62] text-white font-bold text-lg py-5 rounded-xl shadow-lg shadow-orange-900/10 active:scale-[0.98] transition-all"
            >
              Mashq qilish
            </button>
            <button 
              onClick={() => setViewState('MAJOR_EDIT')}
              className="w-full bg-[#D99F72] hover:bg-[#c98e62] text-white font-bold text-lg py-5 rounded-xl shadow-lg shadow-orange-900/10 active:scale-[0.98] transition-all"
            >
              Tizim yaratish
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (viewState === 'MAJOR_EDIT') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#F8F9FA]">
        <div className="p-4 md:p-6 flex items-center justify-between bg-white border-b border-gray-100 shrink-0">
          <button onClick={() => setViewState('MAJOR_MENU')} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-xl font-bold text-gray-900">Major</h2>
          <div className="w-10"></div>
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
                    <input 
                      type="text"
                      value={majorSystem[key] || ''}
                      onChange={(e) => handleMajorInput(key, e.target.value)}
                      placeholder="Enter association..."
                      className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 text-lg shadow-sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="w-full max-w-lg mt-12 mb-8">
             <button 
              onClick={saveMajorSystem}
              className="w-full bg-[#D99F72] hover:bg-[#c98e62] text-white font-bold text-lg py-4 rounded-xl shadow-lg active:scale-[0.95] transition-all"
            >
              Yaratish
            </button>
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
           <div className="flex flex-col">
             <div className="text-xl md:text-2xl font-bold font-mono text-black">
               {formatMsTime(currentCardElapsedTime)}
             </div>
           </div>
           <button 
             onClick={finishMajorPractice}
             className="text-brand-tan font-bold text-base md:text-lg hover:opacity-80 transition-opacity"
           >
             Hoziroq tugatish
           </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div 
            className="perspective-1000 cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
          >
             <div 
               className={`relative w-64 h-96 sm:w-80 sm:h-[28rem] transition-all duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
               style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
             >
               <div 
                 className="absolute inset-0 bg-[#D99F72] rounded-xl shadow-xl flex items-center justify-center p-8"
                 style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
               >
                 <span className="text-8xl font-medium text-white select-none">{currentKey}</span>
               </div>
               <div 
                 className="absolute inset-0 bg-[#D99F72] rounded-xl shadow-xl flex items-center justify-center p-8 text-center"
                 style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
               >
                 <span className="text-4xl font-medium text-white break-words select-none">{currentValue}</span>
               </div>
             </div>
          </div>

          <div className="mt-8 md:mt-12 flex items-center justify-center gap-8 md:gap-16 w-full">
            <button 
              onClick={(e) => { e.stopPropagation(); handlePrevMajorCard(); }}
              className={`text-gray-300 hover:text-brand-tan transition-colors active:scale-95 p-2 ${currentCardIndex === 0 ? 'opacity-0 cursor-default pointer-events-none' : ''}`}
            >
              <ArrowLeft size={36} strokeWidth={1.5} />
            </button>
            <div className="text-gray-900 font-bold text-lg md:text-xl font-mono select-none">
              {currentCardIndex + 1}/{practiceDeck.length}
            </div>
            <button 
               onClick={(e) => { e.stopPropagation(); handleNextMajorCard(); }}
               className={`text-gray-300 hover:text-brand-tan transition-colors active:scale-95 p-2`}
            >
               <ArrowRight size={36} strokeWidth={1.5} />
            </button>
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
           <button 
             onClick={() => setViewState('MAJOR_MENU')}
             className="text-[#D99F72] font-bold text-lg md:text-xl hover:opacity-80 transition-opacity"
           >
             Orqaga qaytish
           </button>
           <div className="text-xl md:text-2xl font-medium text-gray-900 font-mono tracking-tight">
             Jami: {formatMsTime(totalTime)}
           </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-8 w-full flex justify-center">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-sm border border-gray-100/50 overflow-hidden">
             <div className="flex flex-col">
               {practiceDeck.map((key) => {
                 const timing = cardTimings[key] as number | undefined;
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

  // Fallback for generic flashcards if ever needed (not reachable by WIP logic currently)
  const currentCard = cards[currentCardIndex];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] h-auto">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 shrink-0">
          <h2 className="text-lg md:text-xl font-bold text-gray-900">{category.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"><X size={24} /></button>
        </div>
        <div className="flex-1 p-4 md:p-8 bg-gray-50 flex flex-col items-center justify-center overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center gap-4 text-brand-tan min-h-[300px] justify-center"><Loader2 className="animate-spin" size={40} /></div>
          ) : cards.length > 0 ? (
            <div className="w-full max-w-md perspective-1000 flex flex-col items-center">
              <div 
                className={`relative w-full h-64 md:h-80 transition-all duration-500 preserve-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
                onClick={() => setIsFlipped(!isFlipped)}
                style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
              >
                <div className="absolute inset-0 bg-white rounded-2xl shadow-lg border-2 border-orange-100 flex flex-col items-center justify-center p-6 md:p-8 text-center" style={{ backfaceVisibility: 'hidden' }}>
                  <p className="text-xl md:text-2xl font-bold text-gray-800">{currentCard.front}</p>
                </div>
                <div className="absolute inset-0 bg-brand-tan rounded-2xl shadow-lg flex flex-col items-center justify-center p-6 md:p-8 text-center" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
                  <p className="text-xl md:text-2xl font-bold text-white">{currentCard.back}</p>
                </div>
              </div>
            </div>
          ) : <div>Failed to load.</div>}
        </div>
      </div>
    </div>
  );
};

export default ActivityModal;