import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, X, Users, Globe, ChevronRight } from 'lucide-react';
import { User } from '../types';

interface NumbersPageProps {
  onBack: () => void;
  currentUser: User;
}

const ROWS_PER_PAGE = 12;
const COLS_PER_ROW = 40;
const TOTAL_PAGES = 3;

// Mock Online Users (In real implementation, fetch from Supabase 'profiles' where is_online = true)
const MOCK_USERS = [
  { name: "Azizbek", status: "In Game", score: 120 },
  { name: "Malika", status: "Idle", score: 0 },
  { name: "Jamshid", status: "Competing", score: 85 },
  { name: "Sardor", status: "Idle", score: 0 },
  { name: "Dildora", status: "In Game", score: 200 },
];

const NumbersPage: React.FC<NumbersPageProps> = ({ onBack, currentUser }) => {
  // View State
  const [viewState, setViewState] = useState<'SETUP' | 'COUNTDOWN' | 'GAME' | 'RECALL' | 'RESULT'>('SETUP');
  
  // Config
  const [config, setConfig] = useState({
    cursorWidth: 2,
    separatorLines: 2,
    prepTime: 5,
    isOnlineCompete: false
  });

  // Game Data
  const [countdown, setCountdown] = useState(5);
  const [gameTime, setGameTime] = useState(300);
  const [recallTime, setRecallTime] = useState(900);
  const [numbersGrid, setNumbersGrid] = useState<number[][][]>([]);
  const [userAnswers, setUserAnswers] = useState<string[][][]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [cursor, setCursor] = useState({ row: 0, col: 0 });

  // --- LOGIC COPIED & ADAPTED FROM ActivityModal ---
  
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

  // Timers
  useEffect(() => {
    if (viewState === 'COUNTDOWN') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else setViewState('GAME');
    }
  }, [viewState, countdown]);

  useEffect(() => {
    if (viewState === 'GAME') {
      if (gameTime === 0) { setViewState('RECALL'); return; }
      const timer = setInterval(() => setGameTime(t => Math.max(0, t - 1)), 1000);
      return () => clearInterval(timer);
    }
  }, [viewState, gameTime]);

  useEffect(() => {
    if (viewState === 'RECALL') {
       if (recallTime === 0) { setViewState('RESULT'); return; }
       const timer = setInterval(() => setRecallTime(t => Math.max(0, t - 1)), 1000);
      return () => clearInterval(timer);
    }
  }, [viewState, recallTime]);

  // Cursor Logic
  const moveCursorNext = useCallback(() => {
    setCursor(prev => {
      let newCol = prev.col + config.cursorWidth;
      let newRow = prev.row;
      if (newCol >= COLS_PER_ROW) { newCol = 0; newRow = Math.min(newRow + 1, ROWS_PER_PAGE - 1); }
      return { row: newRow, col: newCol };
    });
  }, [config.cursorWidth]);

  const moveCursorPrev = useCallback(() => {
    setCursor(prev => {
      let newCol = prev.col - config.cursorWidth;
      let newRow = prev.row;
      if (newCol < 0) { newCol = COLS_PER_ROW - config.cursorWidth; newRow = Math.max(newRow - 1, 0); }
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

  // Helpers
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
    let globalCorrect = 0, globalWrong = 0, globalScore = 0;
    for (let p = 0; p < TOTAL_PAGES; p++) {
      for (let r = 0; r < ROWS_PER_PAGE; r++) {
        let rowCorrect = 0, rowWrong = 0;
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

  // --- RENDER ---

  const Sidebar = () => (
    <div className="w-80 bg-white border-l border-gray-200 p-6 flex flex-col hidden xl:flex">
      <div className="flex items-center gap-2 mb-6 text-gray-900">
        <Globe size={20} className="text-green-500" />
        <h3 className="font-bold text-lg">Online Users</h3>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4">
        {MOCK_USERS.map((user, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-brand-tan font-bold text-xs">
                 {user.name[0]}
               </div>
               <div>
                 <p className="text-sm font-bold text-gray-900">{user.name}</p>
                 <p className="text-xs text-gray-500">{user.status}</p>
               </div>
             </div>
             {user.score > 0 && <span className="text-xs font-mono font-bold text-green-600">{user.score}</span>}
          </div>
        ))}
      </div>
    </div>
  );

  if (viewState === 'SETUP') {
    return (
      <div className="flex min-h-screen bg-[#F8F9FA]">
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="h-16 border-b border-gray-200 bg-white flex items-center px-6">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={20} />
              <span className="font-medium">Back to Dashboard</span>
            </button>
            <div className="ml-auto font-bold text-lg text-gray-900">Raqamlar</div>
          </div>

          <div className="flex-1 flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-2xl">
               <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">Game Setup</h1>
               <p className="text-gray-500 mb-8">Configure your training session.</p>

               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-700">Cursor Width</label>
                       <input 
                        type="number" 
                        value={config.cursorWidth}
                        onChange={(e) => setConfig({...config, cursorWidth: Math.max(1, Number(e.target.value))})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-tan focus:border-transparent outline-none font-bold"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-700">Separator Lines</label>
                       <input 
                        type="number" 
                        value={config.separatorLines}
                        onChange={(e) => setConfig({...config, separatorLines: Number(e.target.value)})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-tan focus:border-transparent outline-none font-bold"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-bold text-gray-700">Preparation Time (s)</label>
                     <div className="relative">
                        <select 
                          value={config.prepTime}
                          onChange={(e) => setConfig({...config, prepTime: Number(e.target.value)})}
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl appearance-none outline-none font-bold cursor-pointer"
                        >
                          <option value={5}>5 seconds</option>
                          <option value={10}>10 seconds</option>
                          <option value={20}>20 seconds</option>
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={20} />
                     </div>
                  </div>

                  {/* Online Compete Toggle */}
                  <div 
                    onClick={() => setConfig(p => ({...p, isOnlineCompete: !p.isOnlineCompete}))}
                    className={`flex items-center justify-between p-4 rounded-xl cursor-pointer border transition-all ${config.isOnlineCompete ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}
                  >
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.isOnlineCompete ? 'bg-brand-tan text-white' : 'bg-gray-200 text-gray-500'}`}>
                           <Users size={20} />
                        </div>
                        <div>
                           <div className="font-bold text-gray-900">Online Compete</div>
                           <div className="text-xs text-gray-500">Compete with other users in real-time</div>
                        </div>
                     </div>
                     <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${config.isOnlineCompete ? 'border-brand-tan' : 'border-gray-300'}`}>
                        {config.isOnlineCompete && <div className="w-3 h-3 bg-brand-tan rounded-full" />}
                     </div>
                  </div>

                  <button 
                    onClick={handleStartGame}
                    className="w-full bg-[#D99F72] hover:bg-[#c98e62] text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-orange-900/10 active:scale-[0.98] transition-all mt-4"
                  >
                    Start Game
                  </button>
               </div>
            </div>
          </div>
        </div>
        <Sidebar />
      </div>
    );
  }

  // --- REUSED VIEWS (Simplified for brevity, same logic as ActivityModal but full page structure) ---
  
  if (viewState === 'COUNTDOWN') {
    return (
       <div className="flex min-h-screen bg-white">
          <div className="flex-1 flex items-center justify-center">
             <div className="text-[12rem] md:text-[20rem] font-bold text-black tracking-tighter animate-pulse">
                {countdown}
             </div>
          </div>
          <Sidebar />
       </div>
    );
  }

  if (viewState === 'GAME') {
    return (
       <div className="flex min-h-screen bg-white flex-col">
          <div className="h-16 px-6 flex items-center justify-between border-b border-gray-100">
             <div className="font-mono text-3xl font-bold">{formatTime(gameTime)}</div>
             <button onClick={handleFinishGame} className="text-brand-tan font-bold">Finish Now</button>
          </div>
          <div className="flex-1 overflow-auto flex justify-center p-4">
            <div className="min-w-fit font-mono select-none">
              {numbersGrid[currentPage]?.map((row, rowIndex) => (
                <div key={rowIndex} className="flex items-center mb-2">
                  <span className="w-8 text-xs text-gray-300 text-right mr-4">{rowIndex + 1}</span>
                  <div className="flex">
                    {row.map((digit, colIndex) => {
                      const isCursor = rowIndex === cursor.row && colIndex >= cursor.col && colIndex < cursor.col + config.cursorWidth;
                      const showSeparator = (colIndex + 1) % config.separatorLines === 0 && colIndex < COLS_PER_ROW - 1;
                      return (
                        <span key={colIndex} className={`w-6 h-8 text-lg text-center inline-block font-medium ${isCursor ? 'bg-brand-tan text-black font-bold' : 'text-gray-900'} ${showSeparator ? 'border-r-2 border-orange-200/50' : ''}`}>
                          {digit}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Controls */}
          <div className="h-24 border-t border-gray-100 flex items-center justify-center gap-16">
              <button onClick={moveCursorPrev}><ArrowLeft size={32} className="text-gray-400 hover:text-gray-900" /></button>
              <div className="bg-orange-50 px-6 py-2 rounded-xl text-2xl font-mono font-bold">{getCurrentNumberString()}</div>
              <button onClick={moveCursorNext}><ArrowRight size={32} className="text-gray-400 hover:text-gray-900" /></button>
          </div>
       </div>
    );
  }

  if (viewState === 'RECALL') {
    return (
       <div className="flex min-h-screen bg-[#F8F9FA] flex-col">
          <div className="h-16 px-6 flex items-center justify-between border-b border-gray-200 bg-white">
             <div className="font-mono text-3xl font-bold">{formatTime(recallTime)}</div>
             <button onClick={handleFinishRecall} className="text-brand-tan font-bold">Finish Recall</button>
          </div>
          <div className="flex-1 overflow-auto flex justify-center p-4">
            <div className="min-w-fit select-none">
              {userAnswers[currentPage]?.map((row, rowIndex) => (
                <div key={rowIndex} className="flex items-center mb-[2px]">
                   <span className="w-8 text-xs text-gray-300 text-right mr-4">{rowIndex + 1}</span>
                   <div className="flex flex-wrap gap-[2px]">
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
                        className="w-6 h-8 text-sm text-center border border-gray-200 rounded font-medium focus:border-brand-tan focus:ring-1 focus:ring-brand-tan outline-none bg-white"
                      />
                    ))}
                   </div>
                </div>
              ))}
            </div>
          </div>
          <div className="h-20 border-t border-gray-200 bg-white flex items-center justify-center gap-4">
              {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
                <button key={i} onClick={() => setCurrentPage(i)} className={`w-10 h-10 rounded-lg font-bold ${currentPage === i ? 'bg-brand-tan text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</button>
              ))}
          </div>
       </div>
    );
  }

  // Result View
  if (viewState === 'RESULT') {
    const { totalScore, correctCount, wrongCount } = calculateStats();
    return (
      <div className="flex min-h-screen bg-[#F8F9FA] flex-col font-sans">
        <div className="h-16 px-6 flex items-center justify-between bg-white border-b border-gray-200">
           <button onClick={handleRestart} className="text-gray-500 font-medium hover:text-gray-900">Restart</button>
           <button onClick={onBack} className="text-brand-tan font-bold">Exit</button>
        </div>
        
        <div className="p-6 grid grid-cols-3 max-w-3xl mx-auto w-full gap-4">
           <div className="bg-white p-4 rounded-2xl shadow-sm text-center">
              <div className="text-sm text-gray-500 font-bold uppercase tracking-wider">Correct</div>
              <div className="text-4xl font-extrabold text-green-600 mt-2">{correctCount}</div>
           </div>
           <div className="bg-white p-4 rounded-2xl shadow-sm text-center">
              <div className="text-sm text-gray-500 font-bold uppercase tracking-wider">Wrong</div>
              <div className="text-4xl font-extrabold text-red-500 mt-2">{wrongCount}</div>
           </div>
           <div className="bg-white p-4 rounded-2xl shadow-sm text-center border-2 border-orange-100">
              <div className="text-sm text-gray-500 font-bold uppercase tracking-wider">Score</div>
              <div className="text-4xl font-extrabold text-gray-900 mt-2">{totalScore}</div>
           </div>
        </div>

        <div className="flex-1 overflow-auto flex justify-center p-4">
           {/* Result Grid Visualization (Simplified for brevity, similar to ActivityModal but cleaner) */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <div className="text-center text-gray-400 italic mb-4">Detailed result grid view</div>
               {/* Logic from ActivityModal for grid rendering goes here, reusing the same structure */}
               {numbersGrid[currentPage]?.map((row, rowIndex) => {
                   const rowUserAnswers = userAnswers[currentPage]?.[rowIndex] || [];
                   let lastIndex = -1;
                   for (let i = COLS_PER_ROW - 1; i >= 0; i--) { if (rowUserAnswers[i] && rowUserAnswers[i] !== "") { lastIndex = i; break; } }
                   
                   return (
                      <div key={rowIndex} className="flex mb-1">
                         <div className="w-6 text-xs text-gray-300 text-right mr-2 pt-1">{rowIndex+1}</div>
                         <div className="flex flex-col">
                            <div className="flex h-5">
                               {row.map((d, ci) => {
                                  const u = rowUserAnswers[ci] || "";
                                  const c = d.toString();
                                  const checked = ci <= lastIndex;
                                  let color = "text-transparent";
                                  if (checked) color = u === c ? "text-green-600" : (u ? "text-red-600" : "text-transparent");
                                  return <div key={ci} className={`w-5 text-xs text-center font-bold ${color}`}>{checked && u ? u : (checked ? d : "")}</div>
                               })}
                            </div>
                            <div className="flex h-5">
                               {row.map((d, ci) => <div key={ci} className="w-5 text-xs text-center text-gray-900">{d}</div>)}
                            </div>
                         </div>
                      </div>
                   )
               })}
           </div>
        </div>
      </div>
    );
  }

  return <div>Unknown State</div>;
};

export default NumbersPage;