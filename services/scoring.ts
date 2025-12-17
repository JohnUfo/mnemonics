/**
 * WMC-Compliant Scoring Engine for Memory Numbers
 * Implements World Memory Championship scoring rules
 */

export interface ScoringResult {
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  rowScores: RowScore[];
}

export interface RowScore {
  rowIndex: number;
  errors: number;
  score: number;
  isComplete: boolean;
}

/**
 * Count errors in a single row by comparing recalled vs actual
 */
function countErrors(recalled: string[], actual: number[]): number {
  let errors = 0;
  const length = Math.min(recalled.length, actual.length);

  for (let i = 0; i < length; i++) {
    if (recalled[i] !== actual[i]?.toString()) {
      errors++;
    }
  }

  return errors;
}

/**
 * Score a single row according to WMC rules:
 * - 0 errors: full points (length of row)
 * - 1 error: half points (rounded up for incomplete rows, rounded down for complete)
 * - 2+ errors: 0 points
 */
function scoreRow(
  recalled: string[],
  actual: number[],
  digitsPerRow: number = 40
): RowScore {
  const errors = countErrors(recalled, actual);
  const rowLength = recalled.length;
  const isComplete = rowLength === digitsPerRow;

  let score = 0;

  if (errors === 0) {
    score = rowLength;
  } else if (errors === 1) {
    // Incomplete rows round up, complete rows round down
    score = isComplete
      ? Math.floor(rowLength / 2)
      : Math.ceil(rowLength / 2);
  }
  // 2+ errors = 0 points

  return {
    rowIndex: 0, // Will be set by caller
    errors,
    score,
    isComplete
  };
}

/**
 * Score entire number memorization event with WMC rules
 * @param recalledGrid - User's recalled digits (pages -> rows -> columns)
 * @param actualGrid - Actual digit grid
 * @param digitsPerRow - Standard is 40 digits per row
 */
export function scoreNumberEvent(
  recalledGrid: string[][][],
  actualGrid: number[][][],
  digitsPerRow: number = 40
): ScoringResult {
  let totalScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  const rowScores: RowScore[] = [];

  // Iterate through all pages
  for (let p = 0; p < actualGrid.length; p++) {
    const pageRecalled = recalledGrid[p] || [];
    const pageActual = actualGrid[p] || [];

    // Iterate through all rows in page
    for (let r = 0; r < pageActual.length; r++) {
      const rowRecalled = pageRecalled[r] || [];
      const rowActual = pageActual[r] || [];

      // Find last filled index in recalled row
      let lastFilledIndex = -1;
      for (let i = rowRecalled.length - 1; i >= 0; i--) {
        if (rowRecalled[i] && rowRecalled[i] !== '') {
          lastFilledIndex = i;
          break;
        }
      }

      // Skip empty rows
      if (lastFilledIndex === -1) continue;

      // Only score up to last filled digit
      const relevantRecalled = rowRecalled.slice(0, lastFilledIndex + 1);
      const relevantActual = rowActual.slice(0, lastFilledIndex + 1);

      // Score this row
      const rowScore = scoreRow(relevantRecalled, relevantActual, digitsPerRow);
      rowScore.rowIndex = p * pageActual.length + r;
      rowScores.push(rowScore);

      totalScore += rowScore.score;

      // Count individual digit accuracy
      for (let i = 0; i < relevantRecalled.length; i++) {
        if (relevantRecalled[i] === relevantActual[i]?.toString()) {
          correctCount++;
        } else if (relevantRecalled[i] !== '') {
          wrongCount++;
        }
      }
    }
  }

  return {
    totalScore,
    correctCount,
    wrongCount,
    rowScores
  };
}

/**
 * Calculate Millennium Standard normalized score
 * Converts raw score to championship points: (Raw Score / Standard) × 1000
 * @param rawScore - Total digits scored
 * @param standard - Event standard (Hour Numbers = 3234 digits)
 */
export function calculateMillenniumScore(
  rawScore: number,
  standard: number = 3234
): number {
  return Math.round((rawScore / standard) * 1000);
}

/**
 * Strict USA Memory Championship variant
 * Any error in a row = 0 points (no partial credit)
 */
export function scoreNumberEventUSA(
  recalledGrid: string[][][],
  actualGrid: number[][][],
  digitsPerRow: number = 40
): ScoringResult {
  let totalScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  const rowScores: RowScore[] = [];

  for (let p = 0; p < actualGrid.length; p++) {
    const pageRecalled = recalledGrid[p] || [];
    const pageActual = actualGrid[p] || [];

    for (let r = 0; r < pageActual.length; r++) {
      const rowRecalled = pageRecalled[r] || [];
      const rowActual = pageActual[r] || [];

      let lastFilledIndex = -1;
      for (let i = rowRecalled.length - 1; i >= 0; i--) {
        if (rowRecalled[i] && rowRecalled[i] !== '') {
          lastFilledIndex = i;
          break;
        }
      }

      if (lastFilledIndex === -1) continue;

      const relevantRecalled = rowRecalled.slice(0, lastFilledIndex + 1);
      const relevantActual = rowActual.slice(0, lastFilledIndex + 1);

      const errors = countErrors(relevantRecalled, relevantActual);
      const rowLength = relevantRecalled.length;

      // USA variant: any error = 0 points
      const score = errors === 0 ? rowLength : 0;

      rowScores.push({
        rowIndex: p * pageActual.length + r,
        errors,
        score,
        isComplete: rowLength === digitsPerRow
      });

      totalScore += score;

      for (let i = 0; i < relevantRecalled.length; i++) {
        if (relevantRecalled[i] === relevantActual[i]?.toString()) {
          correctCount++;
        } else if (relevantRecalled[i] !== '') {
          wrongCount++;
        }
      }
    }
  }

  return {
    totalScore,
    correctCount,
    wrongCount,
    rowScores
  };
}
