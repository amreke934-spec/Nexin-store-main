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

let memoryProfitMarginConfig: ProfitMarginConfig | null = null;

export const DEFAULT_PROFIT_MARGIN_CONFIG: ProfitMarginConfig = {
  percentage: 10,
  fixedMarginUsd: 0,
  enabled: true,
};

/**
 * Get current profit margin configuration from memory, localStorage or default
 */
export function getProfitMarginConfig(): ProfitMarginConfig {
  if (memoryProfitMarginConfig) {
    return memoryProfitMarginConfig;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PROFIT_MARGIN);
    if (saved) {
      const parsed = JSON.parse(saved);
      const conf: ProfitMarginConfig = {
        percentage: typeof parsed.percentage === 'number' ? Math.max(0, parsed.percentage) : DEFAULT_PROFIT_MARGIN_CONFIG.percentage,
        fixedMarginUsd: typeof parsed.fixedMarginUsd === 'number' ? Math.max(0, parsed.fixedMarginUsd) : DEFAULT_PROFIT_MARGIN_CONFIG.fixedMarginUsd,
        enabled: parsed.enabled !== false,
      };
      memoryProfitMarginConfig = conf;
      return conf;
    }
  } catch {
    // fallback
  }
  return DEFAULT_PROFIT_MARGIN_CONFIG;
}

/**
 * Save profit margin config locally and dispatch change event for immediate real-time reactivity
 */
export function setProfitMarginConfig(config: ProfitMarginConfig): void {
  try {
    memoryProfitMarginConfig = config;
    localStorage.setItem(STORAGE_KEY_PROFIT_MARGIN, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('nexen-profit-margin-changed', { detail: config }));
  } catch (e) {
    console.warn('Could not save profit margin to localStorage:', e);
  }
}

/**
 * Apply profit margin immediately and synchronize to server
 */
export async function applyProfitMarginDirectly(
  percentage: number,
  fixedUsd: number = 0,
  enabled: boolean = true
): Promise<ProfitMarginConfig> {
  const cleanPercentage = Math.max(0, Number(percentage) || 0);
  const cleanFixed = Math.max(0, Number(fixedUsd) || 0);
  const newConfig: ProfitMarginConfig = {
    percentage: cleanPercentage,
    fixedMarginUsd: cleanFixed,
    enabled: enabled,
  };

  // Immediate in-memory & localStorage update
  setProfitMarginConfig(newConfig);

  // Sync with DB
  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'profit_margin', value: newConfig }),
    });
  } catch (err) {
    console.warn('Failed to sync profit margin with database:', err);
  }

  return newConfig;
}

/**
 * Fetch profit margin config from database if available
 */
export async function fetchProfitMarginFromServer(): Promise<ProfitMarginConfig> {
  try {
    const res = await fetch('/api/settings/profit_margin');
    if (res.ok) {
      const data = await res.json();
      if (data && data.value && typeof data.value.percentage === 'number') {
        const serverConfig: ProfitMarginConfig = {
          percentage: Math.max(0, data.value.percentage),
          fixedMarginUsd: Math.max(0, data.value.fixedMarginUsd || 0),
          enabled: data.value.enabled !== false,
        };
        setProfitMarginConfig(serverConfig);
        return serverConfig;
      }
    }
  } catch {
    // ignore
  }
  return getProfitMarginConfig();
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
