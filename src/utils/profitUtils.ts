/**
 * Global Profit Margin / Markup Utilities for Nexen Store
 * Allows store owner to set a comprehensive profit margin percentage (or fixed fee)
 * that is automatically calculated and added to SC Store wholesale product prices.
 */

export interface ProfitMarginConfig {
  percentage: number; // e.g. 10 for 10%
  fixedMarginUsd: number; // e.g. 0.20 for +$0.20
  enabled: boolean;
}

const STORAGE_KEY_PROFIT_MARGIN = 'nexen_store_profit_margin_config';

export const DEFAULT_PROFIT_MARGIN_CONFIG: ProfitMarginConfig = {
  percentage: 0,
  fixedMarginUsd: 0,
  enabled: true,
};

/**
 * Get current profit margin configuration from localStorage or default
 */
export function getProfitMarginConfig(): ProfitMarginConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PROFIT_MARGIN);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        percentage: typeof parsed.percentage === 'number' ? Math.max(0, parsed.percentage) : 0,
        fixedMarginUsd: typeof parsed.fixedMarginUsd === 'number' ? Math.max(0, parsed.fixedMarginUsd) : 0,
        enabled: parsed.enabled !== false,
      };
    }
  } catch {
    // fallback
  }
  return DEFAULT_PROFIT_MARGIN_CONFIG;
}

/**
 * Save profit margin config locally and dispatch change event for real-time reactivity
 */
export function setProfitMarginConfig(config: ProfitMarginConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROFIT_MARGIN, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('nexen-profit-margin-changed', { detail: config }));
  } catch (e) {
    console.warn('Could not save profit margin to localStorage:', e);
  }
}

/**
 * Calculate final retail price after applying profit margin
 * @param basePriceUsd Wholesale price in USD
 * @param customConfig Optional override config
 * @returns Retail price with profit margin included
 */
export function calculateRetailPrice(
  basePriceUsd: number,
  customConfig?: ProfitMarginConfig
): number {
  if (typeof basePriceUsd !== 'number' || isNaN(basePriceUsd) || basePriceUsd <= 0) {
    return 0;
  }

  const config = customConfig || getProfitMarginConfig();

  if (!config.enabled) {
    return basePriceUsd;
  }

  const percentMultiplier = 1 + Math.max(0, config.percentage) / 100;
  const withPercentage = basePriceUsd * percentMultiplier;
  const finalPrice = withPercentage + (Math.max(0, config.fixedMarginUsd) || 0);

  // Round to 4 decimal places for micro-transactions or 2 for normal
  return parseFloat(finalPrice.toFixed(4));
}
