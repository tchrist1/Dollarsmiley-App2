/**
 * Currency formatting utilities
 * Formats prices into readable USD notation with smart abbreviations
 */

/**
 * Format currency with smart abbreviations
 * - Under $1,000: Show full number, no decimals (e.g., $50, $300, $999)
 * - $1,000 to $9,999: One decimal + "k" (e.g., $1.0k, $2.5k, $9.2k)
 * - $10,000+: Whole-number "k", no decimals (e.g., $10k, $15k, $38k)
 * - Never show trailing zeros (e.g., $1k not $1.0k)
 */
export function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) {
    return '$0';
  }

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    return '$0';
  }

  // Handle negative numbers
  const isNegative = numericAmount < 0;
  const absAmount = Math.abs(numericAmount);

  // Round first to handle edge cases like 999.9 -> 1000
  const roundedAmount = Math.round(absAmount);

  let formatted: string;

  if (roundedAmount < 1000) {
    // Under $1,000: Show full number, no decimals
    formatted = `$${roundedAmount}`;
  } else if (roundedAmount < 10000) {
    // $1,000 to $9,999: One decimal + "k"
    const value = roundedAmount / 1000;
    const roundedK = Math.round(value * 10) / 10;

    // Remove trailing .0
    if (roundedK % 1 === 0) {
      formatted = `$${Math.floor(roundedK)}k`;
    } else {
      formatted = `$${roundedK.toFixed(1)}k`;
    }
  } else {
    // $10,000+: Whole-number "k", no decimals
    const value = roundedAmount / 1000;
    formatted = `$${Math.round(value)}k`;
  }

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format currency with label (e.g., "$50/hr", "$2.5k/month")
 */
export function formatCurrencyWithLabel(
  amount: number | string | undefined | null,
  label?: string
): string {
  const formatted = formatCurrency(amount);
  return label ? `${formatted}${label}` : formatted;
}

/**
 * Get the raw numeric value from any price input
 * Use this for comparisons, sorting, and calculations
 */
export function getPriceValue(amount: number | string | undefined | null): number {
  if (amount === undefined || amount === null) {
    return 0;
  }

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return isNaN(numericAmount) ? 0 : numericAmount;
}

/**
 * Format distance consistently across all views
 * - < 1 mile: display in feet (rounded)
 * - >= 1 mile: display in miles (1 decimal)
 * - null/undefined: return null (do not display)
 */
export function formatDistance(distanceMiles: number | null | undefined): string | null {
  if (distanceMiles === null || distanceMiles === undefined || isNaN(distanceMiles)) {
    return null;
  }

  if (distanceMiles < 0.1) {
    // Very close - show in feet
    const feet = Math.round(distanceMiles * 5280);
    return `${feet} ft`;
  } else if (distanceMiles < 1) {
    // Less than 1 mile - show in feet for precision
    const feet = Math.round(distanceMiles * 5280);
    return `${feet} ft`;
  } else {
    // 1 mile or more - show in miles with 1 decimal
    return `${distanceMiles.toFixed(1)} mi`;
  }
}

/**
 * Format rating with validation
 * Only show rating if both average and count are available
 */
export function formatRating(
  average: number | null | undefined,
  count?: number | null | undefined
): { display: boolean; text: string; value: number } {
  const hasValidAverage = average !== null && average !== undefined && average > 0;

  // If count is provided, require it to be > 0
  const hasValidCount = count === undefined || (count !== null && count > 0);

  if (!hasValidAverage || !hasValidCount) {
    return { display: false, text: '', value: 0 };
  }

  return {
    display: true,
    text: average.toFixed(1),
    value: average,
  };
}
