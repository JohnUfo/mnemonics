import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, RefreshCw, ChevronRight, ChevronLeft, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { CategoryId, CategoryItem, FlashCardData } from '../types';
import { generateContentForCategory } from '../services/geminiService';

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
  // State for View Management
  const [viewState, setViewState] = useState<
    'SETUP' | 'COUNTDOWN' | 'GAME' | 'RECALL' | 'RESULT' | 'FLASHCARDS' | 
    'MAJOR_MENU' | 'MAJOR_EDIT' | 'MAJOR_PRACTICE' | 'MAJOR_RESULT'
  >(
    category.id === CategoryId.NUMBERS ? 'SETUP' : 
    category.id === CategoryId.FLASH_CARDS ? 'MAJOR_MENU' : 'FLASHCARDS'
  );

  // Configuration for Numbers Game
  const [config, setConfig] = useState({
    cursorWidth: 2,
    separatorLines: 2,
    prepTime: 5,
  });

  // Game State (Numbers)
  const [countdown, setCountdown] = useState(5);
  const [gameTime, setGameTime] = useState(300);
  const [recallTime, setRecallTime] = useState(900);
  const [numbersGrid, setNumbersGrid] = useState<number[][][]>([]);
  const [userAnswers, setUserAnswers] = useState<string[][][]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [cursor, setCursor] = useState({ row: 0, col: 0 });

  // Flashcard State (Legacy/Other Categories)
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

  // Initialization
  useEffect(() => {
    if (category.id === CategoryId.FLASH_CARDS) {
      loadMajorSystem();
      setViewState('MAJOR_MENU');
    } else if (category.id !== CategoryId.NUMBERS) {
      loadFlashcards();
    }
  }, [category]);

  const loadMajorSystem = () => {
    const stored = localStorage.getItem(MAJOR_SYSTEM_KEY);
    let system: Record<string, string> = {};
    
    if (stored) {
      system = JSON.parse(stored);
    }
    
    // Ensure all 00-99 keys exist and have values
    for (let i = 0; i < 100; i++) {
      const key = i.toString().padStart(2, '0');
      // If key missing or empty, use default
      if (!system[key]) {
         system[key] = DEFAULT_MAJOR_SYSTEM[key] || '';
      }
    }
    
    setMajorSystem(system);
  };

  const saveMajorSystem = () => {
    localStorage.setItem(MAJOR_SYSTEM_KEY, JSON.stringify(majorSystem));
    setViewState('MAJOR_MENU');
  };

  const startMajorPractice = () => {
    // Shuffle deck
    const deck = Object.keys(majorSystem).sort(() => Math.random() - 0.5);
    setPracticeDeck(deck);
    setCurrentCardIndex(0);
    setCardTimings({});
    setIsFlipped(false);
    
    // Start timer for first card
    setCurrentCardStartTime(Date.now());
    setViewState('MAJOR_PRACTICE');
  };

  const handleMajorInput = (key: string, value: string) => {
    setMajorSystem(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const loadFlashcards = async () => {
    setLoading(true);
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
      return () => {
        if (timerRef.current) cancelAnimationFrame(timerRef.current);
      };
    }
  }, [viewState, currentCardStartTime]);

  const handleNextMajorCard = useCallback(() => {
    // Save cumulative time for current card
    const currentKey = practiceDeck[currentCardIndex];
    const duration = Date.now() - currentCardStartTime;
    
    setCardTimings(prev => ({
      ...prev,
      [currentKey]: (prev[currentKey] || 0) + duration
    }));

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
      // Save cumulative time for current card
      const currentKey = practiceDeck[currentCardIndex];
      const duration = Date.now() - currentCardStartTime;
      
      setCardTimings(prev => ({
        ...prev,
        [currentKey]: (prev[currentKey] || 0) + duration
      }));

      setIsFlipped(false);
      setCurrentCardIndex(prev => prev - 1);
      setCurrentCardStartTime(Date.now());
    }
  }, [practiceDeck, currentCardIndex, currentCardStartTime]);

  const finishMajorPractice = useCallback(() => {
    if (viewState === 'MAJOR_PRACTICE') {
       const currentKey = practiceDeck[currentCardIndex];
       const duration = Date.now() - currentCardStartTime;
       setCardTimings(prev => ({
         ...prev,
         [currentKey]: (prev[currentKey] || 0) + duration
       }));
    }
    setViewState('MAJOR_RESULT');
  }, [viewState, practiceDeck, currentCardIndex, currentCardStartTime]);

  // Keyboard Navigation for Major Practice
  useEffect(() => {
    if (viewState === 'MAJOR_PRACTICE') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') {
          handleNextMajorCard();
        } else if (e.key === 'ArrowLeft') {
          handlePrevMajorCard();
        } else if (e.key === ' ' || e.key === 'Enter') {
          setIsFlipped(prev => !prev);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [viewState, handleNextMajorCard, handlePrevMajorCard]);

  // Numbers Game Handlers
  const handleStartGame = () => {
    const grid: number[][][] = [];
    const answersGrid: string[][][] = [];

    for (let p = 0; p < TOTAL_PAGES; p++) {
      const pageRows: number[][] = [];
      const answerRows: string[][] = [];
      for (let r = 0; r < ROWS_PER_PAGE; r++) {
        const rowCols: number[] = [];
        const answerCols: string[] = [];
        for (let c = 0; c < COLS_PER_ROW; c++) {
          rowCols.push(Math.floor(Math.random() * 10));
          answerCols.push("");
        }
        pageRows.push(rowCols);
        answerRows.push(answerCols);
      }
      grid.push(pageRows);
      answersGrid.push(answerRows);
    }
    setNumbersGrid(grid);
    setUserAnswers(answersGrid);
    setCountdown(config.prepTime);
    setViewState('COUNTDOWN');
  };

  const handleFinishRecall = () => setViewState('RESULT');
  const handleFinishGame = () => setViewState('RECALL');
  const handleRestart = () => {
    setViewState('SETUP');
    setCurrentPage(0);
    setCursor({ row: 0, col: 0 });
    setGameTime(300);
    setRecallTime(900);
  };

  // Effects for Timers
  useEffect(() => {
    if (viewState === 'COUNTDOWN') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setViewState('GAME');
      }
    }
  }, [viewState, countdown]);

  useEffect(() => {
    if (viewState === 'GAME') {
      if (gameTime === 0) {
        setViewState('RECALL');
        return;
      }
      const timer = setInterval(() => setGameTime(t => Math.max(0, t - 1)), 1000);
      return () => clearInterval(timer);
    }
  }, [viewState, gameTime]);

  useEffect(() => {
    if (viewState === 'RECALL') {
       if (recallTime === 0) {
         setViewState('RESULT');
         return;
       }
       const timer = setInterval(() => setRecallTime(t => Math.max(0, t - 1)), 1000);
      return () => clearInterval(timer);
    }
  }, [viewState, recallTime]);

  // Cursor & Input Logic for Numbers
  const moveCursorNext = useCallback(() => {
    setCursor(prev => {
      let newCol = prev.col + config.cursorWidth;
      let newRow = prev.row;
      if (newCol >= COLS_PER_ROW) {
        newCol = 0;
        newRow = Math.min(newRow + 1, ROWS_PER_PAGE - 1);
      }
      return { row: newRow, col: newCol };
    });
  }, [config.cursorWidth]);

  const moveCursorPrev = useCallback(() => {
    setCursor(prev => {
      let newCol = prev.col - config.cursorWidth;
      let newRow = prev.row;
      if (newCol < 0) {
        newCol = COLS_PER_ROW - config.cursorWidth; 
        newRow = Math.max(newRow - 1, 0);
      }
      return { row: newRow, col: newCol };
    });
  }, [config.cursorWidth]);

  useEffect(() => {
    if (viewState !== 'GAME') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') moveCursorNext();
      else if (e.key === 'ArrowLeft') moveCursorPrev();
      else if (e.key === 'ArrowDown') setCursor(prev => ({ ...prev, row: Math.min(prev.row + 1, ROWS_PER_PAGE - 1) }));
      else if (e.key === 'ArrowUp') setCursor(prev => ({ ...prev, row: Math.max(prev.row - 1, 0) }));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewState, moveCursorNext, moveCursorPrev]);

  const getCurrentNumberString = () => {
    if (!numbersGrid[currentPage] || !numbersGrid[currentPage][cursor.row]) return "";
    return numbersGrid[currentPage][cursor.row].slice(cursor.col, cursor.col + config.cursorWidth).join('');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    let nextRow = row;
    let nextCol = col;
    let handled = false;

    if (e.key === 'ArrowRight') { nextCol++; if (nextCol >= COLS_PER_ROW) { nextCol = 0; nextRow++; } handled = true; } 
    else if (e.key === 'ArrowLeft') { nextCol--; if (nextCol < 0) { nextCol = COLS_PER_ROW - 1; nextRow--; } handled = true; }
    else if (e.key === 'ArrowDown') { nextRow++; handled = true; }
    else if (e.key === 'ArrowUp') { nextRow--; handled = true; }

    if (handled && nextRow >= 0 && nextRow < ROWS_PER_PAGE && nextCol >= 0 && nextCol < COLS_PER_ROW) {
      e.preventDefault();
      document.getElementById(`cell-${nextRow}-${nextCol}`)?.focus();
    }
  };

  const handleAnswerChange = (row: number, col: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^[0-9]$/.test(value)) return;

    setUserAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentPage][row][col] = value;
      return newAnswers;
    });

    if (value.length === 1) {
       let nextRow = row;
       let nextCol = col + 1;
       if (nextCol >= COLS_PER_ROW) { nextCol = 0; nextRow++; }
       if (nextRow < ROWS_PER_PAGE) document.getElementById(`cell-${nextRow}-${nextCol}`)?.focus();
    }
  };

  const calculateStats = () => {
    let globalCorrect = 0;
    let globalWrong = 0;
    let globalScore = 0;

    for (let p = 0; p < TOTAL_PAGES; p++) {
      for (let r = 0; r < ROWS_PER_PAGE; r++) {
        let rowCorrect = 0;
        let rowWrong = 0;
        const rowUserAnswers = userAnswers[p]?.[r] || [];
        const rowCorrectNumbers = numbersGrid[p]?.[r] || [];
        
        let lastIndex = -1;
        for (let i = COLS_PER_ROW - 1; i >= 0; i--) {
          if (rowUserAnswers[i] && rowUserAnswers[i] !== "") { lastIndex = i; break; }
        }
        
        if (lastIndex === -1) continue;

        for (let c = 0; c <= lastIndex; c++) {
          const userVal = rowUserAnswers[c] || "";
          const correctVal = rowCorrectNumbers[c]?.toString();
          if (userVal === correctVal) rowCorrect++;
          else if (userVal !== "") rowWrong++;
        }
        
        globalCorrect += rowCorrect;
        globalWrong += rowWrong;
        if (rowWrong === 0) globalScore += rowCorrect;
      }
    }
    return { totalScore: globalScore, correctCount: globalCorrect, wrongCount: globalWrong };
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatMsTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(3, '0')}`;
  };

  // --- RENDERERS ---

  // 1. COUNTDOWN VIEW
  if (viewState === 'COUNTDOWN') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="text-[12rem] md:text-[20rem] font-bold text-black tracking-tighter animate-pulse">
          {countdown}
        </div>
      </div>
    );
  }

  // MAJOR SYSTEM VIEWS

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
               {/* Front (Number) */}
               <div 
                 className="absolute inset-0 bg-[#D99F72] rounded-xl shadow-xl flex items-center justify-center p-8"
                 style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
               >
                 <span className="text-8xl font-medium text-white select-none">{currentKey}</span>
               </div>

               {/* Back (Word) */}
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
              onClick={(e) => {
                e.stopPropagation();
                handlePrevMajorCard();
              }}
              className={`text-gray-300 hover:text-brand-tan transition-colors active:scale-95 p-2 ${currentCardIndex === 0 ? 'opacity-0 cursor-default pointer-events-none' : ''}`}
            >
              <ArrowLeft size={36} strokeWidth={1.5} />
            </button>

            <div className="text-gray-900 font-bold text-lg md:text-xl font-mono select-none">
              {currentCardIndex + 1}/{practiceDeck.length}
            </div>

            <button 
               onClick={(e) => {
                 e.stopPropagation();
                 handleNextMajorCard();
               }}
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
    const totalTime = (Object.values(cardTimings) as number[]).reduce((a: number, b: number) => a + b, 0);

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#F8F9FA] overflow-hidden">
        
        {/* Header Section (No Navbar style) */}
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

        {/* Scrollable List Container */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 w-full flex justify-center">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-sm border border-gray-100/50 overflow-hidden">
             <div className="flex flex-col">
               {practiceDeck.map((key, index) => {
                 const timing = cardTimings[key];
                 if (typeof timing !== 'number') return null;

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

  // 2. RESULT VIEW (NUMBERS)
  if (viewState === 'RESULT') {
    const { totalScore, correctCount, wrongCount } = calculateStats();
    
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#F8F9FA] overflow-hidden font-sans">
        
        {/* Main Content - Centered & Compact to avoid scrolling */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-2 pb-2 md:pt-4 flex flex-col w-full items-center justify-center min-h-0">
          
          {/* Stats Section - Centered and Styled */}
          <div className="w-full max-w-3xl mx-auto grid grid-cols-3 mb-2 px-4 shrink-0">
            <div className="flex flex-col items-center border-r-2 border-red-100 py-1">
              <div className="text-gray-900 text-xs sm:text-sm xl:text-base mb-1 font-medium text-center">To'g'ri javoblar</div>
              <div className="text-2xl sm:text-3xl xl:text-4xl font-bold text-gray-900">{correctCount}</div>
            </div>
            <div className="flex flex-col items-center border-r-2 border-red-100 py-1">
              <div className="text-gray-900 text-xs sm:text-sm xl:text-base mb-1 font-medium text-center">Xato javoblar</div>
              <div className="text-2xl sm:text-3xl xl:text-4xl font-bold text-gray-900">{wrongCount}</div>
            </div>
            <div className="flex flex-col items-center py-1">
              <div className="text-gray-900 text-xs sm:text-sm xl:text-base mb-1 font-medium text-center">Hisob</div>
              <div className="text-2xl sm:text-3xl xl:text-4xl font-bold text-gray-900">{totalScore}</div>
            </div>
          </div>

          {/* Grid Area - Centered & Scrollable */}
          <div className="w-full overflow-x-auto flex flex-col items-center px-2">
            <div className="min-w-fit bg-white p-2 xl:p-4 rounded-xl shadow-sm border border-gray-100 mx-auto">
              {numbersGrid[currentPage]?.map((row, rowIndex) => {
                 const rowUserAnswers = userAnswers[currentPage]?.[rowIndex] || [];
                 // Find last filled index for this row to determine coloring range
                 let lastIndex = -1;
                 for (let i = COLS_PER_ROW - 1; i >= 0; i--) {
                   if (rowUserAnswers[i] && rowUserAnswers[i] !== "") {
                     lastIndex = i;
                     break;
                   }
                 }

                return (
                  <div key={rowIndex} className="flex mb-[2px]">
                    {/* Row Number */}
                    <div className="w-6 md:w-8 text-gray-300 text-right mr-3 text-[10px] sm:text-xs select-none font-mono pt-1">
                      {rowIndex + 1}
                    </div>
                    
                    <div className="flex flex-col">
                      {/* User Input Row */}
                      <div className="flex">
                        {row.map((digit, colIndex) => {
                          const userVal = rowUserAnswers[colIndex] || "";
                          const correctVal = digit.toString();
                          const isChecked = colIndex <= lastIndex;
                          
                          let textColorClass = "text-transparent"; 
                          
                          if (isChecked) {
                            if (userVal === correctVal) {
                               textColorClass = "text-green-600";
                            } else if (userVal !== "") {
                               textColorClass = "text-red-600"; // Wrong
                            }
                            // Empty cells remain transparent/neutral even if checked range
                          }

                          const finalDisplay = isChecked ? (userVal === "" ? digit : userVal) : "";

                          const showSeparator = (colIndex + 1) % config.separatorLines === 0 && colIndex < COLS_PER_ROW - 1;
                          
                          return (
                            <div 
                              key={`user-${colIndex}`}
                              className={`
                                w-3.5 h-5 text-[10px] 
                                sm:w-5 sm:h-7 sm:text-xs 
                                xl:w-6 xl:h-8 xl:text-sm 
                                2xl:w-8 2xl:h-10 2xl:text-lg 
                                flex items-center justify-center font-bold border border-gray-100 bg-white
                                ${textColorClass}
                                ${showSeparator ? 'mr-0.5 sm:mr-1' : ''}
                              `}
                            >
                              {finalDisplay}
                            </div>
                          );
                        })}
                      </div>

                      {/* Correct Answer Row */}
                      <div className="flex">
                        {row.map((digit, colIndex) => {
                          const showSeparator = (colIndex + 1) % config.separatorLines === 0 && colIndex < COLS_PER_ROW - 1;
                          return (
                            <div 
                              key={`correct-${colIndex}`}
                              className={`
                                w-3.5 h-5 text-[10px] 
                                sm:w-5 sm:h-7 sm:text-xs 
                                xl:w-6 xl:h-8 xl:text-sm 
                                2xl:w-8 2xl:h-10 2xl:text-lg 
                                flex items-center justify-center font-bold border border-gray-100 bg-white text-black
                                ${showSeparator ? 'mr-0.5 sm:mr-1' : ''}
                              `}
                            >
                              {digit}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 flex flex-col items-center gap-4 shrink-0 bg-[#F8F9FA] border-t border-gray-100 w-full">
           <div className="flex gap-4">
              {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`
                    w-10 h-10 md:w-12 md:h-12 rounded-xl text-lg font-medium transition-all
                    ${currentPage === i 
                      ? 'bg-brand-tan text-white shadow-lg shadow-orange-900/20' 
                      : 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-100 shadow-sm'}
                  `}
                >
                  {i + 1}
                </button>
              ))}
           </div>
           
           <button 
             onClick={handleRestart}
             className="w-full max-w-sm bg-brand-tan hover:bg-[#c98e62] text-white font-bold text-base md:text-lg py-3 rounded-xl shadow-lg shadow-orange-900/10 active:scale-[0.98] transition-all"
           >
             Restart
           </button>
        </div>
      </div>
    );
  }

  // 3. RECALL VIEW
  if (viewState === 'RECALL') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#F8F9FA] overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-6 flex justify-between items-center shrink-0">
           <div className="text-2xl sm:text-3xl xl:text-4xl font-bold font-mono text-black">
             {formatTime(recallTime)}
           </div>
           <button 
             onClick={handleFinishRecall} 
             className="text-brand-tan font-bold text-base sm:text-lg xl:text-xl hover:opacity-80 transition-opacity"
           >
             Hoziroq tugatish
           </button>
        </div>

        {/* Grid Input Area - Centered & Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 flex flex-col w-full items-center justify-center min-h-0">
          <div className="w-full overflow-x-auto flex justify-center">
            <div className="min-w-fit select-none mx-auto">
              {userAnswers[currentPage]?.map((row, rowIndex) => (
                <div key={rowIndex} className="flex items-center mb-[2px]">
                  {/* Row Number */}
                  <span className="w-6 text-[10px] sm:text-xs mr-2 sm:w-8 sm:mr-4 lg:w-10 lg:mr-6 text-gray-300 text-right select-none">
                    {rowIndex + 1}
                  </span>
                  
                  {/* Input Cells */}
                  <div className="flex flex-wrap gap-[1px] md:gap-[2px]">
                    {row.map((val, colIndex) => (
                      <input
                        key={colIndex}
                        id={`cell-${rowIndex}-${colIndex}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={val}
                        onKeyDown={(e) => handleInputKeyDown(e, rowIndex, colIndex)}
                        onChange={(e) => handleAnswerChange(rowIndex, colIndex, e.target.value)}
                        className={`
                          w-3.5 h-5 text-[10px] 
                          sm:w-5 sm:h-7 sm:text-xs 
                          xl:w-6 xl:h-8 xl:text-sm 
                          2xl:w-8 2xl:h-10 2xl:text-lg 
                          text-center border border-gray-200 rounded-[2px] md:rounded font-medium focus:border-brand-tan focus:ring-1 focus:ring-brand-tan outline-none bg-white text-gray-900
                        `}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Pagination */}
        <div className="p-6 flex justify-center shrink-0 w-full">
           <div className="flex gap-4">
              {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`
                    w-10 h-10 md:w-12 md:h-12 rounded-xl text-lg font-medium transition-all
                    ${currentPage === i 
                      ? 'bg-brand-tan text-white shadow-lg shadow-orange-900/20' 
                      : 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-100 shadow-sm'}
                  `}
                >
                  {i + 1}
                </button>
              ))}
           </div>
        </div>
      </div>
    );
  }

  // 4. GAME VIEW (NUMBERS MEMORIZATION)
  if (viewState === 'GAME') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden">
        {/* Header - Transparent, No Background */}
        <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center pointer-events-none z-10">
           <div className="text-2xl sm:text-3xl xl:text-4xl font-bold font-mono text-gray-900 pointer-events-auto">
             {formatTime(gameTime)}
           </div>
           
           <div className="flex items-center gap-4 pointer-events-auto">
             <button 
               onClick={handleFinishGame}
               className="text-brand-tan font-bold text-base sm:text-lg xl:text-xl hover:opacity-80 transition-opacity"
             >
               Hoziroq tugatish
             </button>
             <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
               <X size={28} />
             </button>
           </div>
        </div>

        {/* Grid Area - Centered & Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-20 pb-4 px-2 md:px-4 flex flex-col w-full items-center justify-center min-h-0">
          <div className="w-full overflow-x-auto flex justify-center">
            <div className="min-w-fit font-mono leading-relaxed select-none mx-auto px-4 self-center">
              {numbersGrid[currentPage]?.map((row, rowIndex) => (
                <div key={rowIndex} className="flex items-center mb-1 md:mb-2">
                  {/* Row Number */}
                  <span className="w-6 text-[10px] sm:text-xs mr-2 sm:w-8 sm:mr-4 lg:w-10 lg:mr-6 text-gray-300 text-right select-none">
                    {rowIndex + 1}
                  </span>
                  
                  {/* Row Digits */}
                  <div className="flex">
                    {row.map((digit, colIndex) => {
                      const isCursor = 
                        rowIndex === cursor.row && 
                        colIndex >= cursor.col && 
                        colIndex < cursor.col + config.cursorWidth;

                      const showSeparator = (colIndex + 1) % config.separatorLines === 0 && colIndex < COLS_PER_ROW - 1;

                      return (
                        <span 
                          key={colIndex}
                          className={`
                            w-3.5 h-5 text-[10px] 
                            sm:w-5 sm:h-7 sm:text-base 
                            xl:w-6 xl:h-8 xl:text-lg 
                            2xl:w-8 2xl:h-10 2xl:text-2xl 
                            text-center inline-block font-medium
                            ${isCursor ? 'bg-brand-tan text-black font-bold' : 'text-gray-900'}
                            ${showSeparator ? 'border-r-2 border-orange-200/50' : ''}
                          `}
                        >
                          {digit}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="pb-8 pt-4 px-4 flex flex-col items-center gap-4 bg-white shrink-0 z-20 w-full">
           
           {/* Navigation Controls */}
           <div className="flex items-center justify-center gap-8 md:gap-16 w-full">
              <button 
                onClick={moveCursorPrev}
                className="text-gray-300 hover:text-brand-tan transition-colors active:scale-95 p-2"
              >
                <ArrowLeft size={36} strokeWidth={1.5} />
              </button>
              
              {/* Highlighted Value Display */}
              <div className="bg-orange-50 rounded-xl px-4 py-2 min-w-[100px] text-center">
                <span className="text-2xl md:text-3xl text-gray-800 font-bold font-mono tracking-widest">
                   {getCurrentNumberString()}
                </span>
              </div>

              <button 
                 onClick={moveCursorNext}
                 className="text-gray-300 hover:text-brand-tan transition-colors active:scale-95 p-2"
              >
                 <ArrowRight size={36} strokeWidth={1.5} />
              </button>
           </div>

           {/* Pagination */}
           <div className="flex gap-4">
              {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`
                    w-10 h-10 rounded-lg text-lg font-bold transition-all
                    ${currentPage === i 
                      ? 'bg-brand-tan text-white shadow-lg shadow-orange-900/20' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}
                  `}
                >
                  {i + 1}
                </button>
              ))}
           </div>

        </div>
      </div>
    );
  }

  // 5. SETUP VIEW (Only for Numbers)
  if (viewState === 'SETUP') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50 md:bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-[#F8F9FA] md:bg-white w-full max-w-2xl md:rounded-3xl md:shadow-2xl overflow-hidden flex flex-col h-full md:h-auto max-h-[90vh]">
          
          <div className="flex items-center justify-between p-6 bg-transparent md:border-b border-gray-100 shrink-0">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-900"
            >
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 absolute left-1/2 -translate-x-1/2">{category.title}</h2>
            <div className="w-10"></div>
          </div>

          <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-900">Kursor kengligi</label>
                <input 
                  type="number" 
                  value={config.cursorWidth}
                  onChange={(e) => setConfig({...config, cursorWidth: Math.max(1, Number(e.target.value))})}
                  className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 transition-shadow text-gray-900 font-medium"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-900">Ajratuvchi chiziqlar</label>
                <input 
                  type="number" 
                  value={config.separatorLines}
                  onChange={(e) => setConfig({...config, separatorLines: Number(e.target.value)})}
                  className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 transition-shadow text-gray-900 font-medium"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-900">Tayyorgarlik vaqti</label>
              <div className="relative">
                <select 
                  value={config.prepTime}
                  onChange={(e) => setConfig({...config, prepTime: Number(e.target.value)})}
                  className="w-full p-4 bg-white border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-orange-200 transition-shadow text-gray-900 font-medium cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>

            <div className="mt-auto md:mt-8">
              <button 
                onClick={handleStartGame}
                className="w-full bg-[#D99F72] hover:bg-[#c98e62] text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-orange-900/10 active:scale-[0.98] transition-all"
              >
                Boshlash
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 6. FLASHCARD VIEW (Legacy/Other Categories)
  const currentCard = cards[currentCardIndex];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] h-auto">
        
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl">
              <category.icon size={20} className="text-brand-tan md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">{category.title}</h2>
              <p className="text-xs md:text-sm text-gray-500">Practice Mode</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 p-4 md:p-8 bg-gray-50 flex flex-col items-center justify-center overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center gap-4 text-brand-tan min-h-[300px] justify-center">
              <Loader2 className="animate-spin" size={40} />
              <p className="text-gray-500 font-medium text-sm md:text-base">Generating {category.title}...</p>
            </div>
          ) : cards.length > 0 ? (
            <div className="w-full max-w-md perspective-1000 flex flex-col items-center">
              <div 
                className={`relative w-full h-64 md:h-80 transition-all duration-500 preserve-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
                onClick={() => setIsFlipped(!isFlipped)}
                style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
              >
                <div 
                  className="absolute inset-0 bg-white rounded-2xl shadow-lg border-2 border-orange-100 flex flex-col items-center justify-center p-6 md:p-8 text-center"
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                  <span className="text-[10px] md:text-xs font-bold text-orange-400 uppercase tracking-widest mb-2 md:mb-4">Question</span>
                  <p className="text-xl md:text-2xl font-bold text-gray-800 line-clamp-6">{currentCard.front}</p>
                  {currentCard.hint && (
                    <p className="mt-4 text-xs md:text-sm text-gray-400 italic">Hint: Click to reveal</p>
                  )}
                </div>

                <div 
                  className="absolute inset-0 bg-brand-tan rounded-2xl shadow-lg flex flex-col items-center justify-center p-6 md:p-8 text-center"
                  style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                  <span className="text-[10px] md:text-xs font-bold text-white/80 uppercase tracking-widest mb-2 md:mb-4">Answer</span>
                  <p className="text-xl md:text-2xl font-bold text-white line-clamp-6">{currentCard.back}</p>
                </div>
              </div>
              
              <div className="mt-6 md:mt-8 flex items-center justify-between w-full px-2">
                 <button 
                  onClick={() => {
                    if (currentCardIndex > 0) {
                      setIsFlipped(false);
                      setTimeout(() => setCurrentCardIndex(p => p - 1), 150);
                    }
                  }}
                  disabled={currentCardIndex === 0}
                  className="p-3 rounded-full bg-white text-gray-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 active:scale-95 transition-transform"
                >
                  <ChevronLeft size={20} className="md:w-6 md:h-6" />
                </button>
                <span className="text-gray-500 font-medium font-mono text-sm md:text-base">
                  {currentCardIndex + 1} / {cards.length}
                </span>
                <button 
                  onClick={() => {
                    if (currentCardIndex < cards.length - 1) {
                      setIsFlipped(false);
                      setTimeout(() => setCurrentCardIndex(p => p + 1), 150);
                    }
                  }}
                  disabled={currentCardIndex === cards.length - 1}
                  className="p-3 rounded-full bg-white text-gray-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 active:scale-95 transition-transform"
                >
                  <ChevronRight size={20} className="md:w-6 md:h-6" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 min-h-[200px] flex flex-col justify-center">
              <p>Failed to load content.</p>
              <button onClick={loadFlashcards} className="mt-4 text-brand-tan font-bold hover:underline">Try Again</button>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-gray-100 flex justify-center shrink-0">
          <button 
            onClick={loadFlashcards}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-tan transition-colors active:text-brand-tan"
          >
            <RefreshCw size={16} />
            Generate New Set
          </button>
        </div>

      </div>
    </div>
  );
};

export default ActivityModal;