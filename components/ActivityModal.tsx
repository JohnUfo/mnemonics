import React, { useState, useEffect } from 'react';
import { X, RefreshCw, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { CategoryItem, FlashCardData } from '../types';
import { generateContentForCategory } from '../services/geminiService';

interface ActivityModalProps {
  category: CategoryItem;
  onClose: () => void;
}

const ActivityModal: React.FC<ActivityModalProps> = ({ category, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<FlashCardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const loadContent = async () => {
    setLoading(true);
    setCurrentIndex(0);
    setIsFlipped(false);
    const data = await generateContentForCategory(category.promptTopic);
    setCards(data);
    setLoading(false);
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
    }
  };

  const currentCard = cards[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] h-auto">
        
        {/* Header */}
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

        {/* Content */}
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
                {/* Front */}
                <div className="absolute inset-0 backface-hidden bg-white rounded-2xl shadow-lg border-2 border-orange-100 flex flex-col items-center justify-center p-6 md:p-8 text-center">
                  <span className="text-[10px] md:text-xs font-bold text-orange-400 uppercase tracking-widest mb-2 md:mb-4">Question</span>
                  <p className="text-xl md:text-2xl font-bold text-gray-800 line-clamp-6">{currentCard.front}</p>
                  {currentCard.hint && (
                    <p className="mt-4 text-xs md:text-sm text-gray-400 italic">Hint: Click to reveal</p>
                  )}
                </div>

                {/* Back */}
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
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="p-3 rounded-full bg-white text-gray-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 active:scale-95 transition-transform"
                >
                  <ChevronLeft size={20} className="md:w-6 md:h-6" />
                </button>
                <span className="text-gray-500 font-medium font-mono text-sm md:text-base">
                  {currentIndex + 1} / {cards.length}
                </span>
                <button 
                  onClick={handleNext}
                  disabled={currentIndex === cards.length - 1}
                  className="p-3 rounded-full bg-white text-gray-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 active:scale-95 transition-transform"
                >
                  <ChevronRight size={20} className="md:w-6 md:h-6" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 min-h-[200px] flex flex-col justify-center">
              <p>Failed to load content.</p>
              <button onClick={loadContent} className="mt-4 text-brand-tan font-bold hover:underline">Try Again</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-100 flex justify-center shrink-0">
          <button 
            onClick={loadContent}
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