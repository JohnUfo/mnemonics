-- Competitive Memory Numbers Platform Schema
-- This migration creates all necessary tables for competitive gameplay

-- ============================================================================
-- PROFILES TABLE ENHANCEMENTS
-- ============================================================================

-- Add rating and competitive fields to existing profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 1500;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating_deviation DECIMAL(5,2) DEFAULT 350.0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS draws INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS peak_rating INTEGER DEFAULT 1500;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON public.profiles(rating DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- ============================================================================
-- MATCH STATUS ENUM
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE match_status AS ENUM (
    'created',
    'waiting_for_players',
    'countdown',
    'memorization',
    'recall',
    'completed',
    'cancelled',
    'paused'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- MATCHES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Players
  player1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Match state
  status match_status DEFAULT 'created',
  event_type TEXT DEFAULT 'speed', -- speed, national, international, hour

  -- Scores
  player1_score INTEGER,
  player2_score INTEGER,

  -- Rating snapshots (before match)
  player1_rating_before INTEGER,
  player2_rating_before INTEGER,

  -- Rating changes (after match)
  player1_rating_after INTEGER,
  player2_rating_after INTEGER,
  player1_rating_change INTEGER,
  player2_rating_change INTEGER,

  -- Game data (stores number grids, answers, etc.)
  game_data JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  memorization_started_at TIMESTAMPTZ,
  recall_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Winner
  winner_id UUID REFERENCES public.profiles(id),
  result TEXT, -- 'player1', 'player2', 'draw'

  -- Ensure different players
  CONSTRAINT different_players CHECK (player1_id != player2_id)
);

-- Indexes for match queries
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_players ON public.matches(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_player1 ON public.matches(player1_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON public.matches(player2_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_completed ON public.matches(completed_at DESC) WHERE status = 'completed';

-- ============================================================================
-- MATCHMAKING QUEUE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  event_type TEXT DEFAULT 'speed',
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one entry per user
  CONSTRAINT unique_user_in_queue UNIQUE(user_id)
);

-- Index for matchmaking queries
CREATE INDEX IF NOT EXISTS idx_queue_rating ON public.matchmaking_queue(rating, joined_at);
CREATE INDEX IF NOT EXISTS idx_queue_event_type ON public.matchmaking_queue(event_type, rating);

-- ============================================================================
-- MATCH HISTORY TABLE (for detailed statistics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.match_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Performance metrics
  score INTEGER NOT NULL,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,

  -- Rating changes
  rating_before INTEGER NOT NULL,
  rating_after INTEGER NOT NULL,
  rating_change INTEGER NOT NULL,

  -- Match outcome
  result TEXT NOT NULL, -- 'win', 'loss', 'draw'
  opponent_id UUID NOT NULL REFERENCES public.profiles(id),
  opponent_rating INTEGER NOT NULL,

  -- Timestamp
  played_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for history queries
CREATE INDEX IF NOT EXISTS idx_history_user ON public.match_history(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_match ON public.match_history(match_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;

-- Profiles: public read, self-edit
DROP POLICY IF EXISTS "Public profiles viewable" ON public.profiles;
CREATE POLICY "Public profiles viewable" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- Matches: participants can view, service role manages state
DROP POLICY IF EXISTS "Players view their matches" ON public.matches;
CREATE POLICY "Players view their matches" ON public.matches
  FOR SELECT USING (
    auth.uid() IN (player1_id, player2_id) OR status = 'completed'
  );

DROP POLICY IF EXISTS "Players insert matches" ON public.matches;
CREATE POLICY "Players insert matches" ON public.matches
  FOR INSERT WITH CHECK (
    auth.uid() IN (player1_id, player2_id)
  );

DROP POLICY IF EXISTS "Players update own matches" ON public.matches;
CREATE POLICY "Players update own matches" ON public.matches
  FOR UPDATE USING (
    auth.uid() IN (player1_id, player2_id)
  );

-- Matchmaking queue
DROP POLICY IF EXISTS "Users manage own queue entry" ON public.matchmaking_queue;
CREATE POLICY "Users manage own queue entry" ON public.matchmaking_queue
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public view queue" ON public.matchmaking_queue;
CREATE POLICY "Public view queue" ON public.matchmaking_queue
  FOR SELECT USING (true);

-- Match history
DROP POLICY IF EXISTS "Users view own history" ON public.match_history;
CREATE POLICY "Users view own history" ON public.match_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System insert history" ON public.match_history;
CREATE POLICY "System insert history" ON public.match_history
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update profile stats after match completion
CREATE OR REPLACE FUNCTION update_profile_stats_after_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update when match is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update player1 stats
    UPDATE public.profiles
    SET
      games_played = games_played + 1,
      wins = wins + CASE WHEN NEW.result = 'player1' THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN NEW.result = 'player2' THEN 1 ELSE 0 END,
      draws = draws + CASE WHEN NEW.result = 'draw' THEN 1 ELSE 0 END,
      rating = NEW.player1_rating_after,
      peak_rating = GREATEST(peak_rating, NEW.player1_rating_after),
      updated_at = NOW()
    WHERE id = NEW.player1_id;

    -- Update player2 stats
    UPDATE public.profiles
    SET
      games_played = games_played + 1,
      wins = wins + CASE WHEN NEW.result = 'player2' THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN NEW.result = 'player1' THEN 1 ELSE 0 END,
      draws = draws + CASE WHEN NEW.result = 'draw' THEN 1 ELSE 0 END,
      rating = NEW.player2_rating_after,
      peak_rating = GREATEST(peak_rating, NEW.player2_rating_after),
      updated_at = NOW()
    WHERE id = NEW.player2_id;

    -- Insert match history for both players
    INSERT INTO public.match_history (
      match_id, user_id, score, rating_before, rating_after,
      rating_change, result, opponent_id, opponent_rating
    ) VALUES
    (
      NEW.id, NEW.player1_id, NEW.player1_score,
      NEW.player1_rating_before, NEW.player1_rating_after,
      NEW.player1_rating_change,
      CASE
        WHEN NEW.result = 'player1' THEN 'win'
        WHEN NEW.result = 'player2' THEN 'loss'
        ELSE 'draw'
      END,
      NEW.player2_id, NEW.player2_rating_before
    ),
    (
      NEW.id, NEW.player2_id, NEW.player2_score,
      NEW.player2_rating_before, NEW.player2_rating_after,
      NEW.player2_rating_change,
      CASE
        WHEN NEW.result = 'player2' THEN 'win'
        WHEN NEW.result = 'player1' THEN 'loss'
        ELSE 'draw'
      END,
      NEW.player1_id, NEW.player1_rating_before
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update stats
DROP TRIGGER IF EXISTS on_match_completed ON public.matches;
CREATE TRIGGER on_match_completed
  AFTER UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_stats_after_match();

-- Function to clean old queue entries (remove users who left)
CREATE OR REPLACE FUNCTION clean_stale_queue_entries()
RETURNS void AS $$
BEGIN
  DELETE FROM public.matchmaking_queue
  WHERE joined_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
