import React, { useEffect, useState, useRef } from 'react';
import { Users, Search, Loader2, Trophy, Zap, Clock, Target } from 'lucide-react';
import { supabase } from '../services/supabase';
import { matchmakingService } from '../services/matchmaking';
import { PresenceManager, PresenceState } from '../services/presence';
import { getWinProbability } from '../services/elo';

interface MatchmakingLobbyProps {
  userId: string;
  userProfile: {
    username: string;
    rating: number;
    avatar_url?: string;
  };
  onMatchFound: (matchId: string) => void;
}

const EVENT_TYPES = [
  { id: 'speed', name: 'Speed Numbers', time: '5 min', icon: Zap },
  { id: 'national', name: 'National', time: '15 min', icon: Target },
  { id: 'international', name: 'International', time: '30 min', icon: Trophy },
  { id: 'hour', name: 'Hour Numbers', time: '60 min', icon: Clock }
];

const MatchmakingLobby: React.FC<MatchmakingLobbyProps> = ({
  userId,
  userProfile,
  onMatchFound
}) => {
  const [selectedEvent, setSelectedEvent] = useState('speed');
  const [inQueue, setInQueue] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [searchRange, setSearchRange] = useState(100);
  const [onlinePlayers, setOnlinePlayers] = useState<PresenceState[]>([]);
  const [potentialOpponent, setPotentialOpponent] = useState<any>(null);

  const presenceManager = useRef<PresenceManager | null>(null);
  const matchmakingInterval = useRef<NodeJS.Timeout | null>(null);
  const queueTimeInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize presence
    presenceManager.current = new PresenceManager(userId);
    presenceManager.current.init(userProfile);
    presenceManager.current.onPlayersChange(setOnlinePlayers);

    return () => {
      presenceManager.current?.cleanup();
      if (matchmakingInterval.current) clearInterval(matchmakingInterval.current);
      if (queueTimeInterval.current) clearInterval(queueTimeInterval.current);
    };
  }, [userId, userProfile]);

  const joinQueue = async () => {
    const entry = await matchmakingService.joinQueue(
      userId,
      userProfile.rating,
      selectedEvent
    );

    if (entry) {
      setInQueue(true);
      setQueueTime(0);
      presenceManager.current?.updatePresence({ status: 'in_queue' });

      // Start matchmaking polling
      matchmakingInterval.current = setInterval(async () => {
        const match = await matchmakingService.findMatch(
          userId,
          userProfile.rating,
          selectedEvent
        );

        if (match) {
          // Found opponent!
          setPotentialOpponent(match);

          // Create match
          const matchId = await matchmakingService.createMatch(
            userId,
            match.user_id,
            selectedEvent
          );

          if (matchId) {
            clearInterval(matchmakingInterval.current!);
            clearInterval(queueTimeInterval.current!);
            presenceManager.current?.updatePresence({ status: 'in_match', matchId });
            onMatchFound(matchId);
          }
        }
      }, 2000); // Check every 2 seconds

      // Update queue time and search range
      queueTimeInterval.current = setInterval(() => {
        setQueueTime(prev => {
          const newTime = prev + 1;
          // Calculate search range (expands by 10 every 5 seconds)
          const newRange = Math.min(100 + Math.floor(newTime / 5) * 10, 500);
          setSearchRange(newRange);
          return newTime;
        });
      }, 1000);
    }
  };

  const leaveQueue = async () => {
    await matchmakingService.leaveQueue(userId);
    setInQueue(false);
    setQueueTime(0);
    setSearchRange(100);
    setPotentialOpponent(null);
    presenceManager.current?.updatePresence({ status: 'online' });

    if (matchmakingInterval.current) {
      clearInterval(matchmakingInterval.current);
      matchmakingInterval.current = null;
    }

    if (queueTimeInterval.current) {
      clearInterval(queueTimeInterval.current);
      queueTimeInterval.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-orange-100 rounded-xl">
            <Users className="text-brand-tan" size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Competitive Matchmaking</h2>
            <p className="text-sm text-gray-500">
              {onlinePlayers.length} players online
            </p>
          </div>
        </div>
      </div>

      {!inQueue ? (
        <>
          {/* Event type selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {EVENT_TYPES.map((event) => (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event.id)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedEvent === event.id
                    ? 'border-brand-tan bg-orange-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <event.icon
                  className={
                    selectedEvent === event.id ? 'text-brand-tan' : 'text-gray-400'
                  }
                  size={24}
                />
                <div className="mt-2">
                  <div className="font-bold text-gray-900 text-sm">{event.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{event.time}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Start matchmaking button */}
          <button
            onClick={joinQueue}
            className="w-full bg-brand-tan hover:bg-[#c98e62] text-white font-bold text-lg py-5 rounded-xl shadow-lg shadow-orange-900/10 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <Search size={24} />
            Find Match
          </button>

          {/* Player stats */}
          <div className="mt-6 bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Your Rating</div>
                <div className="text-3xl font-bold text-gray-900 font-mono">
                  {userProfile.rating}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-1">Event Type</div>
                <div className="text-lg font-bold text-gray-900">
                  {EVENT_TYPES.find(e => e.id === selectedEvent)?.name}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          {/* Searching animation */}
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative mb-6">
              <Loader2 className="animate-spin text-brand-tan" size={64} />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Searching for opponent...
            </h3>

            <div className="text-lg text-gray-500 mb-6">
              Time in queue: {formatTime(queueTime)}
            </div>

            {/* Search range indicator */}
            <div className="w-full max-w-md">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Rating Range</span>
                <span>
                  {userProfile.rating - searchRange} - {userProfile.rating + searchRange}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-brand-tan h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min((searchRange / 500) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Cancel button */}
            <button
              onClick={leaveQueue}
              className="mt-8 px-6 py-3 text-gray-600 hover:text-gray-900 font-bold transition-colors"
            >
              Cancel Search
            </button>
          </div>

          {/* Potential opponent preview */}
          {potentialOpponent && (
            <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
              <div className="text-sm font-bold text-gray-700 mb-2">
                Opponent Found!
              </div>
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold text-gray-900">
                  Rating: {potentialOpponent.rating}
                </div>
                <div className="text-sm text-gray-600">
                  Win probability:{' '}
                  {getWinProbability(userProfile.rating, potentialOpponent.rating)}%
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchmakingLobby;
