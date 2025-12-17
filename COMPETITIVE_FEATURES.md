# Competitive Memory Numbers Platform

A fully-featured competitive memory training platform based on World Memory Championship (WMC) standards.

## Features Implemented

### 🏆 Core Competition Features

- **WMC-Compliant Scoring**: Row-based evaluation with partial credit (0 errors = full points, 1 error = half points, 2+ errors = 0)
- **ELO Rating System**: Dynamic K-factors based on player experience (K=40 for new players, K=20 for established, K=10 for masters)
- **Match State Machine**: Robust state management with proper transitions and disconnection policies
- **Real-time Matchmaking**: Expanding search radius algorithm (100-500 rating range)
- **Live Presence Tracking**: Real-time player status (online, in queue, in match, away)

### 🎮 Game Modes

- **Speed Numbers**: 5 min memorization, 15 min recall
- **National**: 15 min memorization, 30 min recall
- **International**: 30 min memorization, 60 min recall
- **Hour Numbers**: 60 min memorization, 120 min recall

### 📊 Statistics & Rankings

- **Global Leaderboard**: Top 100 players ranked by ELO rating
- **Player Profiles**: Win/loss records, games played, peak rating
- **Match History**: Detailed performance tracking with rating changes
- **Rating Confidence**: Glicko-2 style rating deviation tracking

## Architecture

### Database Schema

```sql
-- Enhanced profiles table with competitive fields
profiles
  - id (UUID, primary key)
  - username (TEXT, unique)
  - rating (INTEGER, default 1500)
  - rating_deviation (DECIMAL, default 350)
  - games_played (INTEGER)
  - wins/losses/draws (INTEGER)
  - peak_rating (INTEGER)

-- Matches table
matches
  - id (UUID, primary key)
  - player1_id, player2_id (UUID)
  - status (ENUM: created, waiting, countdown, memorization, recall, completed)
  - event_type (TEXT: speed, national, international, hour)
  - scores, ratings, timestamps
  - game_data (JSONB: number grids, answers)

-- Matchmaking queue
matchmaking_queue
  - user_id (UUID, unique)
  - rating (INTEGER)
  - event_type (TEXT)
  - joined_at (TIMESTAMPTZ)

-- Match history
match_history
  - match_id, user_id (UUID)
  - score, rating changes
  - result (win/loss/draw)
```

### Services Layer

#### Scoring Service (`services/scoring.ts`)
- `scoreNumberEvent()`: WMC-compliant row-based scoring
- `scoreNumberEventUSA()`: Strict variant (any error = 0 points)
- `calculateMillenniumScore()`: Normalized championship points

#### ELO Service (`services/elo.ts`)
- `calculateExpectedScore()`: Win probability calculation
- `getDynamicKFactor()`: FIDE-style K-factor determination
- `updatePlayerRatings()`: Post-match rating updates
- `calculateRatingDeviation()`: Glicko-2 confidence intervals

#### Match State Machine (`services/matchStateMachine.ts`)
- Valid state transitions enforcement
- Phase-dependent disconnection policies
- Server-authoritative countdown synchronization

#### Matchmaking Service (`services/matchmaking.ts`)
- Queue management with expanding search radius
- Skill-based opponent matching
- Real-time match updates via Supabase channels

#### Presence Service (`services/presence.ts`)
- Real-time player status tracking
- Idle detection (30s timeout)
- Disconnection grace periods

### UI Components

#### Leaderboard (`components/Leaderboard.tsx`)
- Top 100 rankings with win rates
- Rating trends (up/down/stable)
- Current user highlighting
- Time range filters (all/month/week)

#### Matchmaking Lobby (`components/MatchmakingLobby.tsx`)
- Event type selection
- Live queue status with expanding search range
- Online player count
- Opponent preview with win probability

#### Competitive Match (`components/CompetitiveMatch.tsx`)
- Synchronized countdown (5 seconds)
- Memorization phase with timer
- Recall phase with grid input
- Results screen with rating changes

## Setup Instructions

### 1. Run Database Migrations

Execute the SQL migration in your Supabase dashboard:

```bash
# In Supabase SQL Editor, run:
supabase/migrations/20231217_competitive_schema.sql
```

This will:
- Add rating fields to profiles table
- Create matches, matchmaking_queue, and match_history tables
- Set up Row Level Security (RLS) policies
- Create triggers for automatic stat updates

### 2. Enable Realtime

In Supabase Dashboard → Database → Replication:
- Enable replication for `matches` table
- Enable replication for `matchmaking_queue` table
- Enable replication for `profiles` table

### 3. Configure Presence

Realtime Presence is enabled by default for all channels. No additional configuration needed.

## Usage Guide

### For Players

1. **Practice Mode**: Solo training with WMC-standard number grids
2. **Competitive Mode**:
   - Select event type (Speed/National/International/Hour)
   - Click "Find Match" to join matchmaking queue
   - Wait for opponent (search range expands every 5 seconds)
   - Ready up when match is found
   - Complete memorization and recall phases
   - View results and rating changes

3. **Leaderboard**: Track your ranking against top players

### For Developers

#### Creating Custom Event Types

```typescript
// In services/matchStateMachine.ts
export const EVENT_TIMINGS: Record<string, MatchPhaseTimings> = {
  custom: {
    countdownDuration: 5,
    memorizationDuration: 600, // 10 min
    recallDuration: 1200 // 20 min
  }
};
```

#### Customizing Scoring Rules

```typescript
// In services/scoring.ts
export function scoreCustomRules(
  recalledGrid: string[][][],
  actualGrid: number[][][]
): ScoringResult {
  // Implement custom scoring logic
}
```

#### Adjusting ELO Parameters

```typescript
// In services/elo.ts
export const CUSTOM_K_FACTORS = {
  beginner: 50,
  intermediate: 30,
  expert: 15
};
```

## Performance Optimizations

- **Database Indexes**: Optimized for leaderboard queries (rating DESC)
- **Real-time Subscriptions**: Channel-based updates instead of polling
- **Presence Batching**: Updates throttled to every 5 seconds
- **Lazy Loading**: Match history loaded on demand

## Security Features

- **Row Level Security (RLS)**: Players can only update their own data
- **Server-side Validation**: All rating calculations done server-side
- **Anti-cheating**:
  - Rating floors prevent manipulation
  - Abnormal pattern detection (placeholder for implementation)
  - Match data stored immutably

## Testing Checklist

- [ ] Solo practice mode works correctly
- [ ] Matchmaking finds opponents within rating range
- [ ] Match countdown synchronizes correctly
- [ ] Memorization timer counts down properly
- [ ] Recall phase accepts and validates input
- [ ] Scoring matches WMC rules
- [ ] ELO ratings update correctly
- [ ] Leaderboard displays accurate rankings
- [ ] Profile stats update after matches
- [ ] Presence tracking shows online status

## Known Limitations

1. **Opponent Ready Status**: Currently auto-starts when both players join. Real implementation should use presence channels for ready checks.

2. **Real-time Synchronization**: Game state updates via database polling (2s interval). Production should use dedicated WebSocket channels for sub-second updates.

3. **Matchmaking Scale**: Current implementation uses simple polling. For >1000 concurrent users, implement dedicated matchmaking server.

4. **Anti-cheat**: Basic validation only. Production needs:
   - Input timing analysis
   - Browser focus detection
   - Statistical anomaly detection

## Future Enhancements

- [ ] Tournament brackets
- [ ] Team competitions
- [ ] Practice challenges with AI opponents
- [ ] Replay system
- [ ] Achievement badges
- [ ] Social features (friends, challenges)
- [ ] Mobile app with React Native
- [ ] Voice chat during matches
- [ ] Spectator mode
- [ ] Analytics dashboard

## Technical Debt

- Replace React useState with useReducer for complex match state
- Add error boundaries for graceful failure handling
- Implement proper TypeScript types for all Supabase queries
- Add comprehensive unit tests for scoring and ELO calculations
- Set up E2E tests with Playwright
- Add monitoring and logging (Sentry, LogRocket)

## References

- [World Memory Championship Rules](https://www.worldmemorychampionships.com)
- [ELO Rating System](https://en.wikipedia.org/wiki/Elo_rating_system)
- [Glicko-2 Rating System](http://www.glicko.net/glicko.html)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Major System for Number Memorization](https://en.wikipedia.org/wiki/Mnemonic_major_system)
