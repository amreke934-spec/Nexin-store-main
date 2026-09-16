/**
 * Currency Conversion and Formatting Utilities for Nexen Store
 * Formats all prices and balances in Syrian Pounds (SYP / ل.س) exclusively,
 * and incorporates the global store profit margin markup when enabled.
 */

import { calculateRetailPrice } from './profitUtils';

// Default exchange rate: 1 USD = 15,000 SYP (can be customized dynamically)
export const DEFAULT_USD_TO_SYP_RATE = 15000;
const STORAGE_KEY_EXCHANGE_RATE = 'nexen_usd_to_syp_rate';

/**
 * Gets the current exchange rate (USD to SYP) from localStorage or returns default.
 */
export function getExchangeRate(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_EXCHANGE_RATE);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_USD_TO_SYP_RATE;
}

/**
 * Sets a custom exchange rate (USD to SYP) and notifies listeners.
 */
export function setExchangeRate(newRate: number): void {
  try {
    if (newRate > 0) {
      localStorage.setItem(STORAGE_KEY_EXCHANGE_RATE, String(newRate));
      window.dispatchEvent(new CustomEvent('nexen-exchange-rate-changed', { detail: newRate }));
    }
  } catch {
    // ignore
  }
}

/**
 * Converts any amount to Syrian Pounds (SYP).
 * Applies the dashboard profit margin percentage on top of the original supplier price.
 */
export function convertToSyp(
  amount: number,
  currency: string = 'USD',
  rate?: number,
  applyMargin: boolean = true
): number {
  if (typeof amount !== 'number' || isNaN(amount)) return 0;
  const curr = (currency || 'USD').trim().toUpperCase();

  // Apply dashboard profit margin percentage on top of original supplier price
  const adjustedAmount = applyMargin ? calculateRetailPrice(amount) : amount;

  if (curr === 'SYP' || curr === 'ل.س' || curr === 'SP') {
    return Math.round(adjustedAmount * 1000) / 1000;
  }

  const effectiveRate = rate && rate > 0 ? rate : getExchangeRate();
  return Math.round(adjustedAmount * effectiveRate * 1000) / 1000;
}

/**
 * Formats a number with thousands separators for Syrian Pounds / store currency,
 * supporting up to 3 decimal places (e.g. "1,400.259" or "25,000").
 */
export function formatSypNumber(amount: number, maxDecimals: number = 3): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '0';

  // Round to maxDecimals to avoid floating point anomalies (e.g. 1400.2590000000002 -> 1400.259)
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round(amount * factor) / factor;

  if (Number.isInteger(rounded)) {
    return rounded.toLocaleString('en-US');
  }

  // Display up to 3 decimal places without losing decimals
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Returns a fully formatted price string with the Syrian Pound symbol exclusively (e.g. "150,000 ل.س").
 */
export function formatPriceSyp(
  price: number,
  currency: string = 'USD',
  options?: { showOriginalUsd?: boolean; customRate?: number; applyMargin?: boolean }
): string {
  if (typeof price !== 'number' || isNaN(price)) return '0 ل.س';

  const applyMargin = options?.applyMargin !== false;
  const sypAmount = convertToSyp(price, currency, options?.customRate, applyMargin);
  return `${formatSypNumber(sypAmount)} ل.س`;
}

/**
 * Hook or helper to format price for cards and display in pure Syrian Pounds (ل.س)
 */
export function getProductDisplayPrice(
  price: number,
  currency: string = 'USD',
  rate?: number,
  applyMargin: boolean = true
): {
  sypAmount: number;
  formattedNumber: string;
  currencySymbol: string;
  retailUsdPrice: number;
} {
  const retailPrice = applyMargin ? calculateRetailPrice(price) : price;
  const sypAmount = convertToSyp(price, currency, rate, applyMargin);
  const formattedNumber = formatSypNumber(sypAmount);

  return {
    sypAmount,
    formattedNumber,
    currencySymbol: 'ل.س',
    retailUsdPrice: retailPrice,
  };
}

