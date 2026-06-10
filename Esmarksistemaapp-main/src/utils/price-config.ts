import { safeParse } from './safe-parse';

export const PRICE_CONFIG_STORAGE_KEY = 'esmark_price_config';

export const DEFAULT_PRICE_CONFIG: Record<string, any> = {
  banner_price_per_cm: 0.02,
  banner_price_per_in: 2,
  banner_price_per_m: 200,
  banner_price_per_ft: 18.58,
  stickers_price_per_cm: 0.015,
  stickers_price_per_in: 1.5,
  stickers_price_per_m: 150,
  stickers_price_per_ft: 13.94,
  shirt_base_price: 150,
  shirt_vinil_price: 50,
  shirt_sublimation_price: 70,
  shirt_design_prices: {
    normal: 30,
    medio: 60,
    avanzado: 100,
  },
  termo_price_per_cm: 0.05,
  pvc_price_per_cm: 0.03,
  taza_price_per_cm: 0.04,
  materials: ['Vinil', 'Lona', 'Tela', 'Microperforado'],
};

export function extractPriceConfig(response: any): Record<string, any> {
  return response?.config || response?.priceConfig || response?.settings?.price_config || {};
}

export function isPriceConfigConfigured(config: Record<string, any> | null | undefined) {
  if (!config || typeof config !== 'object') return false;
  return Object.keys(config).some((key) => {
    const value = config[key];
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return value !== undefined && value !== null && value !== '';
  });
}

export function readStoredPriceConfig(): Record<string, any> {
  return safeParse(localStorage.getItem(PRICE_CONFIG_STORAGE_KEY), {});
}

export function writeStoredPriceConfig(config: Record<string, any>) {
  if (isPriceConfigConfigured(config)) {
    localStorage.setItem(PRICE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  }
}

export function getUsablePriceConfig(remoteConfig?: Record<string, any>) {
  if (isPriceConfigConfigured(remoteConfig)) return remoteConfig as Record<string, any>;

  const localConfig = readStoredPriceConfig();
  if (isPriceConfigConfigured(localConfig)) return localConfig;

  return DEFAULT_PRICE_CONFIG;
}
