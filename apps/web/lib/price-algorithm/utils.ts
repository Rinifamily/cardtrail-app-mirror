/**
 * Utility functions for CT Price calculation
 */

/**
 * Calculate percentile of sorted array
 * 
 * @param sorted - Sorted array of numbers
 * @param p - Percentile (0-100)
 * @returns Percentile value
 */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];

  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate days between two dates
 * 
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Absolute number of days between dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.abs((date2.getTime() - date1.getTime()) / msPerDay);
}

/**
 * Calculate standard deviation of array
 * 
 * @param values - Array of numbers
 * @returns Standard deviation
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;

  return Math.sqrt(variance);
}

/**
 * Check if price is within reasonable bounds
 * 
 * @param price - Price to validate
 * @returns True if price is valid ($0-$100k range)
 */
export function isValidPrice(price: number): boolean {
  return price > 0 && price < 100000; // $0-$100k range
}

/**
 * Round number to specified decimal places
 * 
 * @param num - Number to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded number
 */
export function roundTo(num: number, decimals: number = 2): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(num * multiplier) / multiplier;
}
