import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Medal, Award } from 'lucide-react';
import { supabase } from '../services/supabase';

interface LeaderboardEntry {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  rating: number;
  rating_deviation: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  peak_rating: number;
}

interface LeaderboardProps {
  currentUserId?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ currentUserId }) => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'week'>('all');

  useEffect(() => {
    fetchLeaderboard();
  }, [timeRange]);

  const fetchLeaderboard = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('rating', { ascending: false })
      .limit(100);

    if (data) {
      setLeaders(data);
    }

    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="text-yellow-500" size={24} />;
    if (rank === 2) return <Medal className="text-gray-400" size={24} />;
    if (rank === 3) return <Award className="text-amber-600" size={24} />;
    return null;
  };

  const getWinRate = (wins: number, losses: number, draws: number) => {
    const total = wins + losses + draws;
    if (total === 0) return 0;
    return Math.round((wins / total) * 100);
  };

  const getRatingTrend = (rating: number, peakRating: number) => {
    if (rating === peakRating) return <TrendingUp className="text-green-500" size={16} />;
    if (rating < peakRating - 50) return <TrendingDown className="text-red-500" size={16} />;
    return <Minus className="text-gray-400" size={16} />;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-100 rounded-xl">
            <Trophy className="text-brand-tan" size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Leaderboard</h2>
            <p className="text-sm text-gray-500">Top memory athletes</p>
          </div>
        </div>

        {/* Time range filter */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          {(['all', 'month', 'week'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                timeRange === range
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {range === 'all' ? 'All Time' : range === 'month' ? 'Month' : 'Week'}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Games
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Peak
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaders.map((entry, index) => {
                  const rank = index + 1;
                  const isCurrentUser = entry.id === currentUserId;
                  const winRate = getWinRate(entry.wins, entry.losses, entry.draws);

                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        isCurrentUser ? 'bg-orange-50/50' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getRankIcon(rank) || (
                            <span className="text-lg font-bold text-gray-400 w-6 text-center">
                              {rank}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Player */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {entry.avatar_url ? (
                            <img
                              src={entry.avatar_url}
                              alt={entry.username}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-brand-tan font-bold">
                              {entry.username[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-gray-900">
                              {entry.full_name || entry.username}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-orange-600">(You)</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">@{entry.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl font-bold text-gray-900 font-mono">
                            {entry.rating}
                          </span>
                          {getRatingTrend(entry.rating, entry.peak_rating)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          ±{entry.rating_deviation?.toFixed(0) || '350'}
                        </div>
                      </td>

                      {/* Games */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-lg font-bold text-gray-900">
                          {entry.games_played}
                        </div>
                        <div className="text-xs text-gray-400">
                          {entry.wins}W {entry.losses}L {entry.draws}D
                        </div>
                      </td>

                      {/* Win Rate */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-lg font-bold text-gray-900">{winRate}%</div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                          <div
                            className="bg-green-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${winRate}%` }}
                          />
                        </div>
                      </td>

                      {/* Peak */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-lg font-bold text-gray-600 font-mono">
                          {entry.peak_rating}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
