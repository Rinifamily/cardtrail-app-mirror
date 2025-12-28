/**
 * Price Display Component
 * 
 * Displays price in CNY with original currency in parentheses.
 * Handles loading states and currency formatting.
 */

'use client';

import { useEffect, useState } from 'react';
import { convertToCNY, formatPriceDisplay } from '@/lib/currency';

interface PriceDisplayProps {
  /** Original price amount */
  amount: number;
  /** Original currency code (USD, JPY, EUR, etc.) */
  currency: string;
  /** Optional className for styling */
  className?: string;
  /** Show skeleton loader while converting */
  showLoader?: boolean;
}

/**
 * Price Display Component
 * 
 * @example
 * ```tsx
 * <PriceDisplay amount={100} currency="USD" />
 * // Displays: ¥725.00 ($100.00)
 * 
 * <PriceDisplay amount={10000} currency="JPY" />
 * // Displays: ¥485.00 (¥10,000)
 * 
 * <PriceDisplay amount={500} currency="CNY" />
 * // Displays: ¥500.00
 * ```
 */
export function PriceDisplay({
  amount,
  currency,
  className = '',
  showLoader = true,
}: PriceDisplayProps) {
  const [cnyAmount, setCnyAmount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function convert() {
      try {
        setIsLoading(true);
        const converted = await convertToCNY(amount, currency);
        if (isMounted) {
          setCnyAmount(converted);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[PriceDisplay] Conversion error:', error);
        if (isMounted) {
          // Fallback: assume 1:1 with CNY
          setCnyAmount(amount);
          setIsLoading(false);
        }
      }
    }

    convert();

    return () => {
      isMounted = false;
    };
  }, [amount, currency]);

  // Loading state
  if (isLoading && showLoader) {
    return (
      <span className={`inline-block animate-pulse bg-gray-200 rounded ${className}`}>
        <span className="opacity-0">¥0.00</span>
      </span>
    );
  }

  // Error state (fallback)
  if (cnyAmount === null) {
    return <span className={className}>¥{amount.toFixed(2)}</span>;
  }

  // Format and display
  const formatted = formatPriceDisplay(cnyAmount, amount, currency);

  return <span className={className}>{formatted}</span>;
}

/**
 * Simple CNY Price Display (no conversion)
 * Use when amount is already in CNY
 */
export function CNYPrice({ amount, className = '' }: { amount: number; className?: string }) {
  const formatted = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return <span className={className}>{formatted}</span>;
}

/**
 * Price comparison component
 * Shows price change with color coding
 */
export function PriceChange({
  currentAmount,
  previousAmount,
  currency,
  className = '',
}: {
  currentAmount: number;
  previousAmount: number;
  currency: string;
  className?: string;
}) {
  const [currentCNY, setCurrentCNY] = useState<number | null>(null);
  const [previousCNY, setPreviousCNY] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function convert() {
      const [current, previous] = await Promise.all([
        convertToCNY(currentAmount, currency),
        convertToCNY(previousAmount, currency),
      ]);

      if (isMounted) {
        setCurrentCNY(current);
        setPreviousCNY(previous);
      }
    }

    convert();

    return () => {
      isMounted = false;
    };
  }, [currentAmount, previousAmount, currency]);

  if (currentCNY === null || previousCNY === null) {
    return <span className={className}>-</span>;
  }

  const change = currentCNY - previousCNY;
  const changePercent = ((change / previousCNY) * 100).toFixed(2);
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <span
      className={`${className} ${
        isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
      }`}
    >
      {isPositive && '+'}
      ¥{change.toFixed(2)} ({isPositive && '+'}
      {changePercent}%)
    </span>
  );
}

