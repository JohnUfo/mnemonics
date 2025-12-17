/**
 * Match State Machine for Competitive Memory Numbers
 * Manages valid state transitions and lifecycle
 */

export enum MatchState {
  CREATED = 'CREATED',
  WAITING_FOR_PLAYERS = 'WAITING_FOR_PLAYERS',
  COUNTDOWN = 'COUNTDOWN',
  MEMORIZATION = 'MEMORIZATION',
  RECALL = 'RECALL',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED'
}

export interface MatchPhaseTimings {
  countdownDuration: number; // seconds
  memorizationDuration: number; // seconds
  recallDuration: number; // seconds
}

export const DEFAULT_TIMINGS: MatchPhaseTimings = {
  countdownDuration: 5,
  memorizationDuration: 300, // 5 minutes (Speed Numbers)
  recallDuration: 900 // 15 minutes
};

export const EVENT_TIMINGS: Record<string, MatchPhaseTimings> = {
  speed: {
    countdownDuration: 5,
    memorizationDuration: 300, // 5 min
    recallDuration: 900 // 15 min
  },
  national: {
    countdownDuration: 5,
    memorizationDuration: 900, // 15 min
    recallDuration: 1800 // 30 min
  },
  international: {
    countdownDuration: 5,
    memorizationDuration: 1800, // 30 min
    recallDuration: 3600 // 60 min
  },
  hour: {
    countdownDuration: 5,
    memorizationDuration: 3600, // 60 min
    recallDuration: 7200 // 120 min
  }
};

const VALID_TRANSITIONS: Record<MatchState, MatchState[]> = {
  [MatchState.CREATED]: [MatchState.WAITING_FOR_PLAYERS, MatchState.CANCELLED],
  [MatchState.WAITING_FOR_PLAYERS]: [MatchState.COUNTDOWN, MatchState.CANCELLED],
  [MatchState.COUNTDOWN]: [MatchState.MEMORIZATION, MatchState.PAUSED, MatchState.CANCELLED],
  [MatchState.MEMORIZATION]: [MatchState.RECALL, MatchState.PAUSED, MatchState.CANCELLED],
  [MatchState.RECALL]: [MatchState.COMPLETED, MatchState.PAUSED, MatchState.CANCELLED],
  [MatchState.PAUSED]: [MatchState.COUNTDOWN, MatchState.MEMORIZATION, MatchState.RECALL, MatchState.CANCELLED],
  [MatchState.COMPLETED]: [],
  [MatchState.CANCELLED]: []
};

export interface DisconnectionPolicy {
  gracePeriodMs: number;
  action: 'PAUSE' | 'FORFEIT' | 'WAIT' | 'NONE';
  allowReconnect: boolean;
}

const DISCONNECTION_POLICIES: Record<MatchState, DisconnectionPolicy> = {
  [MatchState.CREATED]: {
    gracePeriodMs: 60000,
    action: 'WAIT',
    allowReconnect: true
  },
  [MatchState.WAITING_FOR_PLAYERS]: {
    gracePeriodMs: 60000,
    action: 'WAIT',
    allowReconnect: true
  },
  [MatchState.COUNTDOWN]: {
    gracePeriodMs: 10000,
    action: 'PAUSE',
    allowReconnect: true
  },
  [MatchState.MEMORIZATION]: {
    gracePeriodMs: 15000,
    action: 'PAUSE',
    allowReconnect: true
  },
  [MatchState.RECALL]: {
    gracePeriodMs: 10000,
    action: 'FORFEIT',
    allowReconnect: true // Can reconnect but timer continues
  },
  [MatchState.PAUSED]: {
    gracePeriodMs: 60000,
    action: 'WAIT',
    allowReconnect: true
  },
  [MatchState.COMPLETED]: {
    gracePeriodMs: 0,
    action: 'NONE',
    allowReconnect: false
  },
  [MatchState.CANCELLED]: {
    gracePeriodMs: 0,
    action: 'NONE',
    allowReconnect: false
  }
};

export class MatchStateMachine {
  private state: MatchState;
  private stateHistory: Array<{ state: MatchState; timestamp: Date }> = [];

  constructor(initialState: MatchState = MatchState.CREATED) {
    this.state = initialState;
    this.stateHistory.push({ state: initialState, timestamp: new Date() });
  }

  getCurrentState(): MatchState {
    return this.state;
  }

  getStateHistory() {
    return [...this.stateHistory];
  }

  canTransition(newState: MatchState): boolean {
    return VALID_TRANSITIONS[this.state].includes(newState);
  }

  transition(newState: MatchState, metadata?: any): boolean {
    if (!this.canTransition(newState)) {
      console.error(
        `Invalid transition: ${this.state} -> ${newState}`,
        'Valid transitions:',
        VALID_TRANSITIONS[this.state]
      );
      return false;
    }

    this.onExit(this.state, metadata);
    const oldState = this.state;
    this.state = newState;
    this.stateHistory.push({ state: newState, timestamp: new Date() });
    this.onEnter(newState, oldState, metadata);

    return true;
  }

  getDisconnectionPolicy(state?: MatchState): DisconnectionPolicy {
    return DISCONNECTION_POLICIES[state || this.state];
  }

  private onExit(state: MatchState, metadata?: any): void {
    // Hook for state exit logic
    console.log(`Exiting state: ${state}`, metadata);
  }

  private onEnter(state: MatchState, previousState: MatchState, metadata?: any): void {
    // Hook for state entry logic
    console.log(`Entering state: ${state} from ${previousState}`, metadata);
  }

  isTerminalState(): boolean {
    return this.state === MatchState.COMPLETED || this.state === MatchState.CANCELLED;
  }

  reset(): void {
    this.state = MatchState.CREATED;
    this.stateHistory = [{ state: MatchState.CREATED, timestamp: new Date() }];
  }
}

/**
 * Server-authoritative countdown synchronization
 */
export interface GameStartMessage {
  type: 'GAME_START';
  serverTime: number;
  gameStartTime: number;
  countdownDuration: number;
}

export class CountdownSync {
  private serverOffset: number = 0;
  private onGameStartCallback?: () => void;
  private animationFrameId?: number;

  setOnGameStart(callback: () => void): void {
    this.onGameStartCallback = callback;
  }

  handleGameStart(message: GameStartMessage, onTick: (remaining: number) => void): void {
    this.serverOffset = message.serverTime - Date.now();
    this.startCountdown(message.gameStartTime, onTick);
  }

  private startCountdown(gameStartTime: number, onTick: (remaining: number) => void): void {
    const tick = () => {
      const adjustedNow = Date.now() + this.serverOffset;
      const remaining = Math.max(0, gameStartTime - adjustedNow);

      if (remaining <= 0) {
        this.onGameStartCallback?.();
        onTick(0);
      } else {
        onTick(Math.ceil(remaining / 1000));
        this.animationFrameId = requestAnimationFrame(tick);
      }
    };

    tick();
  }

  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }
}
