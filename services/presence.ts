/**
 * Real-time Presence Tracking for Competitive Matchmaking
 * Uses Supabase Realtime Presence to track online players
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type PlayerStatus = 'online' | 'in_queue' | 'in_match' | 'away';

export interface PresenceState {
  userId: string;
  username: string;
  rating: number;
  status: PlayerStatus;
  online_at: string;
  matchId?: string;
}

export class PresenceManager {
  private channel: RealtimeChannel | null = null;
  private userId: string;
  private currentStatus: PlayerStatus = 'online';
  private onlinePlayersCallback?: (players: PresenceState[]) => void;
  private idleTimeout: NodeJS.Timeout | null = null;
  private disconnectTimer: NodeJS.Timeout | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Initialize presence tracking
   */
  async init(userProfile: { username: string; rating: number }): Promise<void> {
    this.channel = supabase.channel('matchmaking', {
      config: { presence: { key: this.userId } }
    });

    // Subscribe to presence changes
    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel?.presenceState();
        if (state) {
          const players = this.getOnlinePlayers(state);
          this.onlinePlayersCallback?.(players);
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Player joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Player left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our presence
          await this.updatePresence({
            userId: this.userId,
            username: userProfile.username,
            rating: userProfile.rating,
            status: 'online',
            online_at: new Date().toISOString()
          });

          // Start idle detection
          this.startIdleDetection();
        }
      });
  }

  /**
   * Update presence status
   */
  async updatePresence(state: Partial<PresenceState>): Promise<void> {
    if (!this.channel) return;

    await this.channel.track({
      userId: this.userId,
      ...state,
      online_at: new Date().toISOString()
    });

    if (state.status) {
      this.currentStatus = state.status;
    }
  }

  /**
   * Set callback for online players updates
   */
  onPlayersChange(callback: (players: PresenceState[]) => void): void {
    this.onlinePlayersCallback = callback;
  }

  /**
   * Get all online players from presence state
   */
  private getOnlinePlayers(state: any): PresenceState[] {
    return Object.values(state)
      .flat()
      .filter((presence: any) => presence.userId !== this.userId) as PresenceState[];
  }

  /**
   * Get current online players
   */
  getOnlinePlayers(): PresenceState[] {
    if (!this.channel) return [];
    const state = this.channel.presenceState();
    return this.getOnlinePlayers(state);
  }

  /**
   * Start idle detection (30 seconds of inactivity)
   */
  private startIdleDetection(timeout: number = 30000): void {
    const resetTimer = () => {
      if (this.idleTimeout) clearTimeout(this.idleTimeout);

      // Set status to online when active
      if (this.currentStatus === 'away') {
        this.updatePresence({ status: 'online' });
      }

      this.idleTimeout = setTimeout(() => {
        this.updatePresence({ status: 'away' });
      }, timeout);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(event =>
      window.addEventListener(event, resetTimer, { passive: true })
    );

    // Tab visibility detection
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.updatePresence({ status: 'away' });
      } else {
        resetTimer();
      }
    });

    resetTimer();
  }

  /**
   * Handle disconnect with grace period
   */
  onDisconnect(gracePeriodMs: number = 5000): void {
    this.disconnectTimer = setTimeout(() => {
      this.cleanup();
    }, gracePeriodMs);
  }

  /**
   * Handle reconnect (cancel disconnect timer)
   */
  onReconnect(): void {
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
    this.updatePresence({ status: this.currentStatus });
  }

  /**
   * Clean up presence tracking
   */
  cleanup(): void {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }

    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }

    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
  }
}

/**
 * Hook for idle detection in React
 */
export function useIdleDetection(timeout: number = 30000): boolean {
  const [isIdle, setIsIdle] = React.useState(false);

  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      setIsIdle(false);
      timeoutId = setTimeout(() => setIsIdle(true), timeout);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(event =>
      window.addEventListener(event, resetTimer, { passive: true })
    );

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) setIsIdle(true);
      else resetTimer();
    });

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [timeout]);

  return isIdle;
}

// Add React import at the top (this is needed for the hook)
import React from 'react';
