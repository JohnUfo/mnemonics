import React, { useState, useEffect, useCallback } from 'react';
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

const ActivityModal: React.FC<ActivityModalProps> = ({ category, onClose }) => {
  // State for View Management
  const [viewState, setViewState] = useState<'SETUP' | 'COUNTDOWN' | 'GAME' | 'FLASHCARDS'>(
    category.id === CategoryId.NUMBERS ? 'SETUP' : 'FLASHCARDS'
  );

  // Configuration for Numbers Game
  const [config, setConfig] = useState({
    cursorWidth: 2,
    separatorLines: 2,
    prepTime: 5,
    indicator: 'Custom'
  });

  // Game State
  const [countdown, setCountdown] = useState(5);
  const [gameTime, setGameTime] = useState(300); // 5 minutes in seconds
  const [numbersGrid, setNumbersGrid] = useState<number[][][]>([]); // [page][row][col]
  const [currentPage, setCurrentPage] = useState(0);
  const [cursor, setCursor] = useState({ row: 0, col: 0 }); // Cursor position

  // Flashcard State (Legacy/Other Categories)
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<FlashCardData[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Initialization
  useEffect(() => {
    if (category.id !== CategoryId.NUMBERS) {
      loadFlashcards();
    }
  }, [category]);

  const loadFlashcards = async () => {
    setLoading(true);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    const data = await generateContentForCategory(category.promptTopic);
    setCards(data);
    setLoading(false);
  };

  // Start Game Handler
  const handleStartGame = () => {
    // Generate Random Numbers
    const grid: number[][][] = [];
    for (let p = 0; p < TOTAL_PAGES; p++) {
      const pageRows: number[][] = [];
      for (let r = 0; r < ROWS_PER_PAGE; r++) {
        const rowCols: number[] = [];
        for (let c = 0; c < COLS_PER_ROW; c++) {
          rowCols.push(Math.floor(Math.random() * 10));
        }
        pageRows.push(rowCols);
      }
      grid.push(pageRows);
    }
    setNumbersGrid(grid);
    
    // Start Countdown
    setCountdown(config.prepTime);
    setViewState('COUNTDOWN');
  };

  // Countdown Logic
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

  // Game Timer Logic
  useEffect(() => {
    if (viewState === 'GAME') {
      const timer = setInterval(() => {
        setGameTime(t => Math.max(0, t - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [viewState]);

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

  // Keyboard Navigation for Game
  useEffect(() => {
    if (viewState !== 'GAME') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        moveCursorNext();
      } else if (e.key === 'ArrowLeft') {
         moveCursorPrev();
      } else if (e.key === 'ArrowDown') {
        setCursor(prev => ({ ...prev, row: Math.min(prev.row + 1, ROWS_PER_PAGE - 1) }));
      } else if (e.key === 'ArrowUp') {
        setCursor(prev => ({ ...prev, row: Math.max(prev.row - 1, 0) }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewState, moveCursorNext, moveCursorPrev]);

  const getCurrentNumberString = () => {
    if (!numbersGrid[currentPage] || !numbersGrid[currentPage][cursor.row]) return "";
    return numbersGrid[currentPage][cursor.row]
      .slice(cursor.col, cursor.col + config.cursorWidth)
      .join('');
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

  // 2. GAME VIEW (NUMBERS)
  if (viewState === 'GAME') {
    const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60).toString().padStart(2, '0');
      const s = (seconds % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    };

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden">
        {/* Header - Transparent, No Background */}
        <div className="absolute top-0 left-0 w-full p-6 md:p-8 flex justify-between items-start pointer-events-none z-10">
           <div className="text-3xl md:text-4xl font-bold font-mono text-gray-900 pointer-events-auto">
             {formatTime(gameTime)}
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 pointer-events-auto transition-colors">
             <X size={32} />
           </button>
        </div>

        {/* Grid Area */}
        <div className="flex-1 overflow-auto pt-24 pb-4 px-2 md:px-4 flex justify-center items-center">
          <div className="font-mono leading-relaxed select-none">
            {numbersGrid[currentPage]?.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center mb-1 md:mb-2">
                {/* Row Number */}
                <span className="w-8 md:w-12 text-gray-300 text-right mr-4 md:mr-8 text-sm md:text-base select-none">
                  {rowIndex + 1}
                </span>
                
                {/* Row Digits */}
                <div className="flex flex-wrap max-w-[95vw] md:max-w-none">
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
                          w-7 md:w-11 text-center inline-block text-2xl md:text-4xl font-medium
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

        {/* Footer Controls */}
        <div className="pb-10 pt-4 px-4 flex flex-col items-center gap-6 bg-white shrink-0 z-20">
           
           {/* Navigation Controls */}
           <div className="flex items-center justify-center gap-12 md:gap-24 w-full">
              <button 
                onClick={moveCursorPrev}
                className="text-gray-300 hover:text-brand-tan transition-colors active:scale-95 p-2"
              >
                <ArrowLeft size={48} strokeWidth={1.5} />
              </button>
              
              {/* Highlighted Value Display */}
              <div className="bg-orange-50 rounded-xl px-6 py-3 min-w-[120px] text-center">
                <span className="text-3xl md:text-4xl text-gray-800 font-bold font-mono tracking-widest">
                   {getCurrentNumberString()}
                </span>
              </div>

              <button 
                 onClick={moveCursorNext}
                 className="text-gray-300 hover:text-brand-tan transition-colors active:scale-95 p-2"
              >
                 <ArrowRight size={48} strokeWidth={1.5} />
              </button>
           </div>

           {/* Pagination */}
           <div className="flex gap-4">
              {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`
                    w-12 h-12 rounded-lg text-lg font-bold transition-all
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

  // 3. SETUP VIEW (Only for Numbers)
  if (viewState === 'SETUP') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50 md:bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-[#F8F9FA] md:bg-white w-full max-w-2xl md:rounded-3xl md:shadow-2xl overflow-hidden flex flex-col h-full md:h-auto md:max-h-[90vh]">
          
          <div className="flex items-center justify-between p-6 bg-transparent md:border-b border-gray-100">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-900"
            >
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 absolute left-1/2 -translate-x-1/2">{category.title}</h2>
            <div className="w-10"></div>
          </div>

          <div className="flex-1 p-6 flex flex-col gap-6">
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
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-900">Ko'rsatkichni tanlash</label>
              <div className="relative">
                <select 
                  value={config.indicator}
                  onChange={(e) => setConfig({...config, indicator: e.target.value})}
                  className="w-full p-4 bg-white border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-orange-200 transition-shadow text-gray-900 font-medium cursor-pointer"
                >
                  <option value="Custom">Custom</option>
                  <option value="Fixed">Fixed</option>
                  <option value="Random">Random</option>
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

  // 4. FLASHCARD VIEW (Legacy/Other Categories)
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
                <div className="absolute inset-0 backface-hidden bg-white rounded-2xl shadow-lg border-2 border-orange-100 flex flex-col items-center justify-center p-6 md:p-8 text-center">
                  <span className="text-[10px] md:text-xs font-bold text-orange-400 uppercase tracking-widest mb-2 md:mb-4">Question</span>
                  <p className="text-xl md:text-2xl font-bold text-gray-800 line-clamp-6">{currentCard.front}</p>
                  {currentCard.hint && (
                    <p className="mt-4 text-xs md:text-sm text-gray-400 italic">Hint: Click to reveal</p>
                  )}
                </div>

                <div 
                  className="absolute inset-0 backface-hidden bg-brand-tan rounded-2xl shadow-lg flex flex-col items-center justify-center p-6 md:p-8 text-center"
                  style={{ transform: 'rotateY(180deg)' }}
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