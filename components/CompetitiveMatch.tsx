import React, { useState, useEffect, useRef } from 'react';
import { User, Clock, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabase';
import { matchmakingService } from '../services/matchmaking';
import { MatchState, CountdownSync, EVENT_TIMINGS } from '../services/matchStateMachine';
import { scoreNumberEvent } from '../services/scoring';
import { updatePlayerRatings, determineMatchResult } from '../services/elo';

interface CompetitiveMatchProps {
  matchId: string;
  userId: string;
  onExit: () => void;
}

const ROWS_PER_PAGE = 12;
const COLS_PER_ROW = 40;
const TOTAL_PAGES = 3;

const CompetitiveMatch: React.FC<CompetitiveMatchProps> = ({
  matchId,
  userId,
  onExit
}) => {
  const [match, setMatch] = useState<any>(null);
  const [matchState, setMatchState] = useState<MatchState>(MatchState.WAITING_FOR_PLAYERS);
  const [countdown, setCountdown] = useState(5);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [numbersGrid, setNumbersGrid] = useState<number[][][]>([]);
  const [userAnswers, setUserAnswers] = useState<string[][][]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [opponentReady, setOpponentReady] = useState(false);
  const [userReady, setUserReady] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const countdownSync = useRef(new CountdownSync());

  useEffect(() => {
    loadMatch();
    subscribeToMatch();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (channelRef.current) channelRef.current.unsubscribe();
      countdownSync.current.stop();
    };
  }, [matchId]);

  const loadMatch = async () => {
    const matchData = await matchmakingService.getMatch(matchId);
    if (matchData) {
      setMatch(matchData);
      setMatchState(matchData.status as MatchState);

      // If game data exists, load it
      if (matchData.game_data?.numbersGrid) {
        setNumbersGrid(matchData.game_data.numbersGrid);
        initializeAnswersGrid(matchData.game_data.numbersGrid);
      }
    }
  };

  const subscribeToMatch = () => {
    channelRef.current = matchmakingService.subscribeToMatch(matchId, (payload) => {
      const newMatch = payload.new;
      setMatch(newMatch);
      setMatchState(newMatch.status as MatchState);

      // Handle state transitions
      if (newMatch.status === 'countdown' && newMatch.game_data?.gameStartTime) {
        handleCountdownStart(newMatch.game_data);
      }
    });
  };

  const initializeAnswersGrid = (grid: number[][][]) => {
    const answers: string[][][] = grid.map(page =>
      page.map(row => row.map(() => ''))
    );
    setUserAnswers(answers);
  };

  const handleReady = async () => {
    setUserReady(true);

    const opponentId =
      match.player1_id === userId ? match.player2_id : match.player1_id;

    // Check if opponent is ready
    // In a real implementation, you'd use realtime channels for this
    // For now, auto-start if both players are ready

    if (!numbersGrid.length) {
      // Generate numbers grid
      const grid = generateNumbersGrid();
      setNumbersGrid(grid);
      initializeAnswersGrid(grid);

      // Start countdown
      await startCountdown(grid);
    }
  };

  const generateNumbersGrid = (): number[][][] => {
    const grid: number[][][] = [];
    for (let p = 0; p < TOTAL_PAGES; p++) {
      const page: number[][] = [];
      for (let r = 0; r < ROWS_PER_PAGE; r++) {
        const row: number[] = [];
        for (let c = 0; c < COLS_PER_ROW; c++) {
          row.push(Math.floor(Math.random() * 10));
        }
        page.push(row);
      }
      grid.push(page);
    }
    return grid;
  };

  const startCountdown = async (grid: number[][][]) => {
    const eventTimings = EVENT_TIMINGS[match.event_type] || EVENT_TIMINGS.speed;
    const gameStartTime = Date.now() + eventTimings.countdownDuration * 1000;

    await matchmakingService.updateMatchStatus(matchId, 'countdown', {
      game_data: {
        numbersGrid: grid,
        gameStartTime,
        countdownDuration: eventTimings.countdownDuration
      }
    });
  };

  const handleCountdownStart = (gameData: any) => {
    countdownSync.current.setOnGameStart(() => {
      startMemorization();
    });

    countdownSync.current.handleGameStart(
      {
        type: 'GAME_START',
        serverTime: Date.now(),
        gameStartTime: gameData.gameStartTime,
        countdownDuration: gameData.countdownDuration
      },
      setCountdown
    );
  };

  const startMemorization = async () => {
    setMatchState(MatchState.MEMORIZATION);
    const eventTimings = EVENT_TIMINGS[match.event_type] || EVENT_TIMINGS.speed;
    setTimeRemaining(eventTimings.memorizationDuration);

    await matchmakingService.updateMatchStatus(matchId, 'memorization');

    // Start timer
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          startRecall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecall = async () => {
    setMatchState(MatchState.RECALL);
    const eventTimings = EVENT_TIMINGS[match.event_type] || EVENT_TIMINGS.speed;
    setTimeRemaining(eventTimings.recallDuration);

    await matchmakingService.updateMatchStatus(matchId, 'recall');

    // Start recall timer
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          submitAnswers();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAnswerChange = (rowIndex: number, colIndex: number, value: string) => {
    setUserAnswers((prev) => {
      const next = [...prev];
      if (!next[currentPage]) return prev;
      next[currentPage] = [...next[currentPage]];
      next[currentPage][rowIndex] = [...next[currentPage][rowIndex]];
      next[currentPage][rowIndex][colIndex] = value;
      return next;
    });

    // Auto-advance
    if (value !== '' && colIndex < COLS_PER_ROW - 1) {
      document.getElementById(`cell-${rowIndex}-${colIndex + 1}`)?.focus();
    }
  };

  const submitAnswers = async () => {
    // Score the answers
    const result = scoreNumberEvent(userAnswers, numbersGrid);

    // Get opponent's score from database
    // In real implementation, wait for both players to submit
    const myScore = result.totalScore;

    // Update match with score
    const updateData: any = {};
    if (match.player1_id === userId) {
      updateData.player1_score = myScore;
    } else {
      updateData.player2_score = myScore;
    }

    await supabase.from('matches').update(updateData).eq('id', matchId);

    // Check if both scores are in
    const { data: updatedMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (updatedMatch && updatedMatch.player1_score !== null && updatedMatch.player2_score !== null) {
      // Both players finished - complete match
      await completeMatch(updatedMatch);
    }
  };

  const completeMatch = async (matchData: any) => {
    // Determine winner
    const result = determineMatchResult(
      matchData.player1_score,
      matchData.player2_score
    );

    // Get player profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', [matchData.player1_id, matchData.player2_id]);

    if (!profiles || profiles.length !== 2) return;

    const player1 = profiles.find(p => p.id === matchData.player1_id);
    const player2 = profiles.find(p => p.id === matchData.player2_id);

    if (!player1 || !player2) return;

    // Calculate new ratings
    const ratingUpdates = updatePlayerRatings(
      {
        rating: player1.rating,
        gamesPlayed: player1.games_played,
        peakRating: player1.peak_rating
      },
      {
        rating: player2.rating,
        gamesPlayed: player2.games_played,
        peakRating: player2.peak_rating
      },
      result
    );

    // Update match with results
    await supabase
      .from('matches')
      .update({
        status: 'completed',
        result,
        winner_id:
          result === 'player1'
            ? matchData.player1_id
            : result === 'player2'
            ? matchData.player2_id
            : null,
        player1_rating_after: ratingUpdates.player1Update.newRating,
        player2_rating_after: ratingUpdates.player2Update.newRating,
        player1_rating_change: ratingUpdates.player1Update.ratingChange,
        player2_rating_change: ratingUpdates.player2Update.ratingChange,
        completed_at: new Date().toISOString()
      })
      .eq('id', matchId);

    setMatchState(MatchState.COMPLETED);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render different states
  if (!match) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading match...</div>
      </div>
    );
  }

  if (matchState === MatchState.WAITING_FOR_PLAYERS) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Match Found!
          </h2>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                {match.player1?.avatar_url ? (
                  <img
                    src={match.player1.avatar_url}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <User className="text-brand-tan" size={24} />
                  </div>
                )}
                <div>
                  <div className="font-bold">{match.player1?.username}</div>
                  <div className="text-sm text-gray-500">
                    Rating: {match.player1?.rating}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-gray-400 font-bold">VS</div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                {match.player2?.avatar_url ? (
                  <img
                    src={match.player2.avatar_url}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <User className="text-brand-tan" size={24} />
                  </div>
                )}
                <div>
                  <div className="font-bold">{match.player2?.username}</div>
                  <div className="text-sm text-gray-500">
                    Rating: {match.player2?.rating}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleReady}
            disabled={userReady}
            className="w-full bg-brand-tan hover:bg-[#c98e62] text-white font-bold py-4 rounded-xl disabled:opacity-50 transition-all"
          >
            {userReady ? 'Waiting for opponent...' : 'Ready'}
          </button>
        </div>
      </div>
    );
  }

  if (matchState === MatchState.COUNTDOWN) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="text-[12rem] md:text-[20rem] font-bold text-black tracking-tighter animate-pulse">
          {countdown}
        </div>
      </div>
    );
  }

  if (matchState === MatchState.MEMORIZATION) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#F8F9FA]">
        <div className="p-4 md:p-6 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center gap-4">
            <Clock className="text-brand-tan" size={24} />
            <span className="text-2xl font-bold font-mono">{formatTime(timeRemaining)}</span>
          </div>
          <div className="text-sm font-bold text-gray-600">MEMORIZATION PHASE</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex justify-center items-center">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            {numbersGrid[currentPage]?.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center mb-[2px]">
                <span className="w-8 text-xs mr-4 text-gray-300 text-right">
                  {rowIndex + 1}
                </span>
                <div className="flex gap-[2px]">
                  {row.map((digit, colIndex) => {
                    const showSeparator = (colIndex + 1) % 2 === 0 && colIndex < COLS_PER_ROW - 1;
                    return (
                      <div
                        key={colIndex}
                        className={`w-6 h-8 text-sm flex items-center justify-center font-bold border border-gray-100 bg-white text-black ${
                          showSeparator ? 'mr-1' : ''
                        }`}
                      >
                        {digit}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 flex justify-center">
          <div className="flex gap-4">
            {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-12 h-12 rounded-xl text-lg font-medium transition-all ${
                  currentPage === i
                    ? 'bg-brand-tan text-white shadow-lg'
                    : 'bg-white text-gray-800 border'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (matchState === MatchState.RECALL) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#F8F9FA]">
        <div className="p-4 md:p-6 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center gap-4">
            <Clock className="text-brand-tan" size={24} />
            <span className="text-2xl font-bold font-mono">{formatTime(timeRemaining)}</span>
          </div>
          <button
            onClick={submitAnswers}
            className="bg-brand-tan text-white px-6 py-2 rounded-xl font-bold hover:bg-[#c98e62]"
          >
            Submit
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex justify-center items-center">
          <div className="min-w-fit">
            {userAnswers[currentPage]?.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center mb-[2px]">
                <span className="w-8 text-xs mr-4 text-gray-300 text-right">
                  {rowIndex + 1}
                </span>
                <div className="flex gap-[2px]">
                  {row.map((val, colIndex) => (
                    <input
                      key={colIndex}
                      id={`cell-${rowIndex}-${colIndex}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={val}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length <= 1) {
                          handleAnswerChange(rowIndex, colIndex, val);
                        }
                      }}
                      className="w-6 h-8 text-sm text-center border border-gray-200 rounded-[2px] font-medium focus:border-brand-tan outline-none bg-white"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 flex justify-center">
          <div className="flex gap-4">
            {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-12 h-12 rounded-xl text-lg font-medium transition-all ${
                  currentPage === i
                    ? 'bg-brand-tan text-white shadow-lg'
                    : 'bg-white text-gray-800 border'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (matchState === MatchState.COMPLETED) {
    const isPlayer1 = match.player1_id === userId;
    const myScore = isPlayer1 ? match.player1_score : match.player2_score;
    const opponentScore = isPlayer1 ? match.player2_score : match.player1_score;
    const myRatingChange = isPlayer1
      ? match.player1_rating_change
      : match.player2_rating_change;
    const won = myScore > opponentScore;
    const draw = myScore === opponentScore;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
          <h2 className="text-3xl font-bold text-center mb-6">
            {won ? '🎉 Victory!' : draw ? '🤝 Draw' : '😔 Defeat'}
          </h2>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Your Score</span>
              <span className="text-2xl font-bold">{myScore}</span>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Opponent Score</span>
              <span className="text-2xl font-bold">{opponentScore}</span>
            </div>

            <div className="flex justify-between items-center p-4 bg-orange-50 rounded-xl border border-orange-100">
              <span className="text-gray-700 font-bold">Rating Change</span>
              <span
                className={`text-2xl font-bold ${
                  myRatingChange > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {myRatingChange > 0 ? '+' : ''}
                {myRatingChange}
              </span>
            </div>
          </div>

          <button
            onClick={onExit}
            className="w-full bg-brand-tan hover:bg-[#c98e62] text-white font-bold py-4 rounded-xl transition-all"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default CompetitiveMatch;
