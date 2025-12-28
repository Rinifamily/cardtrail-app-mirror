/**
 * Currency Module
 * 
 * Provides real-time currency conversion with CNY as primary display currency.
 * Integrates with exchangerate-api.com for live rates.
 */

export {
  convertToCNY,
  getExchangeRates,
  formatPriceDisplay,
  getCurrencySymbol,
  isUsingLiveRates,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from './exchange-rates';

