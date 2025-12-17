/**
 * Matchmaking Service with Expanding Search Radius
 * Implements skill-based matching with widening range over time
 */

import { supabase } from './supabase';
import { calculateExpectedScore } from './elo';

export interface QueueEntry {
  id: string;
  user_id: string;
  rating: number;
  event_type: string;
  joined_at: string;
}

export interface MatchmakingConfig {
  baseRange: number; // Initial rating range (default: 100)
  expansionRate: number; // Points added per time interval (default: 10 per 5s)
  maxRange: number; // Maximum rating range (default: 500)
  timeInterval: number; // Time interval in seconds (default: 5)
}

const DEFAULT_CONFIG: MatchmakingConfig = {
  baseRange: 100,
  expansionRate: 10,
  maxRange: 500,
  timeInterval: 5
};

export class MatchmakingService {
  private config: MatchmakingConfig;

  constructor(config: Partial<MatchmakingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Join matchmaking queue
   */
  async joinQueue(
    userId: string,
    rating: number,
    eventType: string = 'speed'
  ): Promise<QueueEntry | null> {
    const { data, error } = await supabase
      .from('matchmaking_queue')
      .insert({
        user_id: userId,
        rating,
        event_type: eventType
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to join queue:', error);
      return null;
    }

    return data;
  }

  /**
   * Leave matchmaking queue
   */
  async leaveQueue(userId: string): Promise<void> {
    await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('user_id', userId);
  }

  /**
   * Find match for a player with expanding search radius
   */
  async findMatch(
    userId: string,
    rating: number,
    eventType: string = 'speed'
  ): Promise<QueueEntry | null> {
    // Get our queue entry to check wait time
    const { data: queueEntry } = await supabase
      .from('matchmaking_queue')
      .select('joined_at')
      .eq('user_id', userId)
      .single();

    if (!queueEntry) return null;

    // Calculate current search range based on wait time
    const waitTime = (Date.now() - new Date(queueEntry.joined_at).getTime()) / 1000;
    const currentRange = this.calculateSearchRange(waitTime);

    // Find opponent within range
    const { data: opponents, error } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('event_type', eventType)
      .neq('user_id', userId)
      .gte('rating', rating - currentRange)
      .lte('rating', rating + currentRange)
      .order('joined_at', { ascending: true })
      .limit(10);

    if (error || !opponents || opponents.length === 0) {
      return null;
    }

    // Find best match (closest rating with reasonable wait time)
    const bestMatch = this.selectBestOpponent(opponents, rating);
    return bestMatch;
  }

  /**
   * Calculate search range based on wait time
   */
  private calculateSearchRange(waitTimeSeconds: number): number {
    const intervals = Math.floor(waitTimeSeconds / this.config.timeInterval);
    const expandedRange =
      this.config.baseRange + intervals * this.config.expansionRate;
    return Math.min(expandedRange, this.config.maxRange);
  }

  /**
   * Select best opponent from candidates
   * Prioritizes: 1) Rating closeness 2) Wait time fairness
   */
  private selectBestOpponent(
    opponents: QueueEntry[],
    myRating: number
  ): QueueEntry {
    // Score each opponent
    const scored = opponents.map(opponent => {
      const ratingDiff = Math.abs(opponent.rating - myRating);
      const waitTime =
        (Date.now() - new Date(opponent.joined_at).getTime()) / 1000;

      // Prioritize closer ratings, but give bonus for longer wait times
      const score = ratingDiff - waitTime * 2;

      return { opponent, score };
    });

    // Sort by score (lower is better)
    scored.sort((a, b) => a.score - b.score);

    return scored[0].opponent;
  }

  /**
   * Create a match between two players
   */
  async createMatch(
    player1Id: string,
    player2Id: string,
    eventType: string = 'speed'
  ): Promise<string | null> {
    // Get player profiles for rating snapshot
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, rating')
      .in('id', [player1Id, player2Id]);

    if (!profiles || profiles.length !== 2) {
      console.error('Failed to get player profiles');
      return null;
    }

    const player1 = profiles.find(p => p.id === player1Id);
    const player2 = profiles.find(p => p.id === player2Id);

    if (!player1 || !player2) return null;

    // Create match
    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        player1_id: player1Id,
        player2_id: player2Id,
        status: 'waiting_for_players',
        event_type: eventType,
        player1_rating_before: player1.rating,
        player2_rating_before: player2.rating
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create match:', error);
      return null;
    }

    // Remove both players from queue
    await Promise.all([
      this.leaveQueue(player1Id),
      this.leaveQueue(player2Id)
    ]);

    return match.id;
  }

  /**
   * Get all players in queue
   */
  async getQueuedPlayers(eventType?: string): Promise<QueueEntry[]> {
    let query = supabase
      .from('matchmaking_queue')
      .select('*')
      .order('joined_at', { ascending: true });

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get queue:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Clean stale queue entries (older than 5 minutes)
   */
  async cleanStaleEntries(): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    await supabase
      .from('matchmaking_queue')
      .delete()
      .lt('joined_at', fiveMinutesAgo);
  }

  /**
   * Get match details
   */
  async getMatch(matchId: string): Promise<any> {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        player1:player1_id(id, username, rating, avatar_url),
        player2:player2_id(id, username, rating, avatar_url)
      `)
      .eq('id', matchId)
      .single();

    if (error) {
      console.error('Failed to get match:', error);
      return null;
    }

    return data;
  }

  /**
   * Subscribe to match updates in real-time
   */
  subscribeToMatch(
    matchId: string,
    callback: (payload: any) => void
  ): RealtimeChannel {
    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`
        },
        callback
      )
      .subscribe();

    return channel;
  }

  /**
   * Update match status
   */
  async updateMatchStatus(
    matchId: string,
    status: string,
    additionalData?: any
  ): Promise<void> {
    const updateData: any = { status };

    if (status === 'memorization') {
      updateData.memorization_started_at = new Date().toISOString();
    } else if (status === 'recall') {
      updateData.recall_started_at = new Date().toISOString();
    } else if (status === 'countdown') {
      updateData.started_at = new Date().toISOString();
    }

    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    await supabase
      .from('matches')
      .update(updateData)
      .eq('id', matchId);
  }
}

// Singleton instance
export const matchmakingService = new MatchmakingService();
