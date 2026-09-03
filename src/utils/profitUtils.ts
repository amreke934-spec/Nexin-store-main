/**
 * Global Profit Margin / Markup Utilities for Nexen Store
 * Allows store owner to set a comprehensive profit margin percentage (or fixed fee)
 * that is automatically calculated and added to SC Store wholesale product prices.
 */

import { useState, useEffect } from 'react';

export interface ProfitMarginConfig {
  percentage: number; // e.g. 10 for 10%
  fixedMarginUsd: number; // e.g. 0.20 for +$0.20
  enabled: boolean;
}

const STORAGE_KEY_PROFIT_MARGIN = 'nexen_store_profit_margin_config';

export const DEFAULT_PROFIT_MARGIN_CONFIG: ProfitMarginConfig = {
  percentage: 10,
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
        percentage: typeof parsed.percentage === 'number' ? Math.max(0, parsed.percentage) : DEFAULT_PROFIT_MARGIN_CONFIG.percentage,
        fixedMarginUsd: typeof parsed.fixedMarginUsd === 'number' ? Math.max(0, parsed.fixedMarginUsd) : DEFAULT_PROFIT_MARGIN_CONFIG.fixedMarginUsd,
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
 * Hook to subscribe to profit margin configuration updates in real-time
 */
export function useProfitMargin(): ProfitMarginConfig {
  const [config, setConfig] = useState<ProfitMarginConfig>(getProfitMarginConfig);

  useEffect(() => {
    const update = () => setConfig(getProfitMarginConfig());
    window.addEventListener('nexen-profit-margin-changed', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('nexen-profit-margin-changed', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return config;
}

/**
 * Calculate final retail price after applying profit margin percentage and fixed fee on top of supplier price
 * @param basePrice Wholesale/supplier price in USD or SYP
 * @param customConfig Optional override config
 * @returns Retail price with profit margin included
 */
export function calculateRetailPrice(
  basePrice: number,
  customConfig?: ProfitMarginConfig
): number {
  if (typeof basePrice !== 'number' || isNaN(basePrice) || basePrice <= 0) {
    return 0;
  }

  const config = customConfig || getProfitMarginConfig();

  if (!config.enabled) {
    return basePrice;
  }

  const percentMultiplier = 1 + Math.max(0, config.percentage) / 100;
  const withPercentage = basePrice * percentMultiplier;
  const finalPrice = withPercentage + (Math.max(0, config.fixedMarginUsd) || 0);

  if (Number.isInteger(finalPrice)) {
    return finalPrice;
  }
  if (finalPrice < 10) {
    return parseFloat(finalPrice.toFixed(4));
  }
  return parseFloat(finalPrice.toFixed(2));
}
