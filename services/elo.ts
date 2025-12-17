/**
 * ELO Rating System with Dynamic K-Factors
 * Implements chess-style rating calculations for competitive memory sports
 */

export interface RatingUpdate {
  newRating: number;
  ratingChange: number;
  expectedScore: number;
  kFactor: number;
}

export interface PlayerRating {
  rating: number;
  gamesPlayed: number;
  peakRating?: number;
  ratingDeviation?: number;
}

/**
 * Calculate expected score (win probability) for player A
 * Formula: E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 */
export function calculateExpectedScore(
  ratingA: number,
  ratingB: number
): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Get dynamic K-factor based on FIDE-style rules
 * @param rating - Current rating
 * @param gamesPlayed - Total games played
 * @param peakRating - Highest rating ever achieved
 */
export function getDynamicKFactor(
  rating: number,
  gamesPlayed: number,
  peakRating?: number
): number {
  // Master level (ever reached 2400+): K=10
  if (peakRating && peakRating >= 2400) {
    return 10;
  }

  // New players (<30 games): K=40
  if (gamesPlayed < 30) {
    return 40;
  }

  // Established players: K=20
  return 20;
}

/**
 * Calculate new rating after a match
 * @param currentRating - Player's current rating
 * @param opponentRating - Opponent's current rating
 * @param actualScore - Match result (1 = win, 0.5 = draw, 0 = loss)
 * @param kFactor - K-factor (if not provided, uses default 32)
 */
export function calculateNewRating(
  currentRating: number,
  opponentRating: number,
  actualScore: number,
  kFactor: number = 32
): RatingUpdate {
  const expectedScore = calculateExpectedScore(currentRating, opponentRating);
  const ratingChange = Math.round(kFactor * (actualScore - expectedScore));
  const newRating = currentRating + ratingChange;

  return {
    newRating: Math.max(100, newRating), // Minimum rating floor
    ratingChange,
    expectedScore,
    kFactor
  };
}

/**
 * Update ratings for both players after a match
 * Uses dynamic K-factors based on player history
 */
export function updatePlayerRatings(
  player1: PlayerRating,
  player2: PlayerRating,
  result: 'player1' | 'player2' | 'draw'
): {
  player1Update: RatingUpdate;
  player2Update: RatingUpdate;
} {
  // Determine actual scores
  const player1Score = result === 'player1' ? 1 : result === 'draw' ? 0.5 : 0;
  const player2Score = 1 - player1Score;

  // Get dynamic K-factors
  const k1 = getDynamicKFactor(
    player1.rating,
    player1.gamesPlayed,
    player1.peakRating
  );
  const k2 = getDynamicKFactor(
    player2.rating,
    player2.gamesPlayed,
    player2.peakRating
  );

  // Calculate updates
  const player1Update = calculateNewRating(
    player1.rating,
    player2.rating,
    player1Score,
    k1
  );

  const player2Update = calculateNewRating(
    player2.rating,
    player1.rating,
    player2Score,
    k2
  );

  return {
    player1Update,
    player2Update
  };
}

/**
 * Calculate rating floor to prevent rating manipulation
 * Formula: max(100, peak - 200)
 */
export function calculateRatingFloor(peakRating: number): number {
  return Math.max(100, peakRating - 200);
}

/**
 * Glicko-2 Rating Deviation calculation
 * Represents confidence in rating (lower = more certain)
 * @param currentRD - Current rating deviation
 * @param inactivePeriods - Number of inactive time periods
 * @param c - Constant (typically 34.6 for monthly periods)
 */
export function calculateRatingDeviation(
  currentRD: number,
  inactivePeriods: number = 0,
  c: number = 34.6
): number {
  const newRD = Math.sqrt(currentRD * currentRD + c * c * inactivePeriods);
  return Math.min(350, newRD); // Cap at initial RD
}

/**
 * Get 95% confidence interval for rating
 * Returns [lower bound, upper bound]
 */
export function getConfidenceInterval(
  rating: number,
  ratingDeviation: number
): [number, number] {
  return [
    Math.max(100, Math.round(rating - 2 * ratingDeviation)),
    Math.round(rating + 2 * ratingDeviation)
  ];
}

/**
 * Determine match result based on scores
 */
export function determineMatchResult(
  score1: number,
  score2: number
): 'player1' | 'player2' | 'draw' {
  if (score1 > score2) return 'player1';
  if (score2 > score1) return 'player2';
  return 'draw';
}

/**
 * Calculate win probability percentage
 */
export function getWinProbability(
  ratingA: number,
  ratingB: number
): number {
  return Math.round(calculateExpectedScore(ratingA, ratingB) * 100);
}
