-- ============================================================================
-- COMPLETE SCHEMA FOR MEMORY NUMBERS PLATFORM
-- This creates EVERYTHING from scratch
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE (Main user profiles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,

  -- Basic info
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,

  -- Competitive fields
  rating INTEGER DEFAULT 1500,
  rating_deviation DECIMAL(5,2) DEFAULT 350.0,
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  peak_rating INTEGER DEFAULT 1500,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON public.profiles(rating DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Public profiles viewable" ON public.profiles;
CREATE POLICY "Public profiles viewable" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================================
-- 2. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'user_name', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. MAJOR SYSTEM TABLE (for flash cards)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.major_systems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  number_key TEXT NOT NULL,
  word TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_number UNIQUE(user_id, number_key)
);

CREATE INDEX IF NOT EXISTS idx_major_systems_user ON public.major_systems(user_id);

ALTER TABLE public.major_systems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own major system" ON public.major_systems;
CREATE POLICY "Users manage own major system" ON public.major_systems
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 4. TRAINING RESULTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.training_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  score INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_results_user ON public.training_results(user_id, created_at DESC);

ALTER TABLE public.training_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own results" ON public.training_results;
CREATE POLICY "Users view own results" ON public.training_results
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own results" ON public.training_results;
CREATE POLICY "Users insert own results" ON public.training_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. MATCH STATUS ENUM
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
-- 6. MATCHES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Players
  player1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Match state
  status match_status DEFAULT 'created',
  event_type TEXT DEFAULT 'speed',

  -- Scores
  player1_score INTEGER,
  player2_score INTEGER,

  -- Rating snapshots
  player1_rating_before INTEGER,
  player2_rating_before INTEGER,
  player1_rating_after INTEGER,
  player2_rating_after INTEGER,
  player1_rating_change INTEGER,
  player2_rating_change INTEGER,

  -- Game data
  game_data JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  memorization_started_at TIMESTAMPTZ,
  recall_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Winner
  winner_id UUID REFERENCES public.profiles(id),
  result TEXT,

  CONSTRAINT different_players CHECK (player1_id != player2_id)
);

-- Indexes for matches
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_players ON public.matches(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_player1 ON public.matches(player1_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON public.matches(player2_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_completed ON public.matches(completed_at DESC) WHERE status = 'completed';

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players view their matches" ON public.matches;
CREATE POLICY "Players view their matches" ON public.matches
  FOR SELECT USING (
    auth.uid() IN (player1_id, player2_id) OR status = 'completed'
  );

DROP POLICY IF EXISTS "Players insert matches" ON public.matches;
CREATE POLICY "Players insert matches" ON public.matches
  FOR INSERT WITH CHECK (auth.uid() IN (player1_id, player2_id));

DROP POLICY IF EXISTS "Players update own matches" ON public.matches;
CREATE POLICY "Players update own matches" ON public.matches
  FOR UPDATE USING (auth.uid() IN (player1_id, player2_id));

-- ============================================================================
-- 7. MATCHMAKING QUEUE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  event_type TEXT DEFAULT 'speed',
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_in_queue UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_queue_rating ON public.matchmaking_queue(rating, joined_at);
CREATE INDEX IF NOT EXISTS idx_queue_event_type ON public.matchmaking_queue(event_type, rating);

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own queue entry" ON public.matchmaking_queue;
CREATE POLICY "Users manage own queue entry" ON public.matchmaking_queue
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public view queue" ON public.matchmaking_queue;
CREATE POLICY "Public view queue" ON public.matchmaking_queue
  FOR SELECT USING (true);

-- ============================================================================
-- 8. MATCH HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.match_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  score INTEGER NOT NULL,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,

  rating_before INTEGER NOT NULL,
  rating_after INTEGER NOT NULL,
  rating_change INTEGER NOT NULL,

  result TEXT NOT NULL,
  opponent_id UUID NOT NULL REFERENCES public.profiles(id),
  opponent_rating INTEGER NOT NULL,

  played_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_user ON public.match_history(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_match ON public.match_history(match_id);

ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own history" ON public.match_history;
CREATE POLICY "Users view own history" ON public.match_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System insert history" ON public.match_history;
CREATE POLICY "System insert history" ON public.match_history
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 9. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update profile stats after match completion
CREATE OR REPLACE FUNCTION update_profile_stats_after_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Update player1
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

    -- Update player2
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

    -- Insert match history
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

DROP TRIGGER IF EXISTS on_match_completed ON public.matches;
CREATE TRIGGER on_match_completed
  AFTER UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_stats_after_match();

-- Clean stale queue entries
CREATE OR REPLACE FUNCTION clean_stale_queue_entries()
RETURNS void AS $$
BEGIN
  DELETE FROM public.matchmaking_queue
  WHERE joined_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
