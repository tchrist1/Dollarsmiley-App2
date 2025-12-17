import { supabase } from './supabase';
import { formatCurrency as formatCurrencyUtil } from './currency-utils';

interface Region {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  supportedCurrencies: string[];
  defaultCurrency: string;
  timezone: string;
  configuration: Record<string, any>;
}

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
}

export class MultiRegionService {
  static async getAllRegions() {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async getActiveRegions() {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async getRegion(regionCode: string) {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .eq('code', regionCode)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async detectUserRegion(
    countryCode?: string,
    latitude?: number,
    longitude?: number
  ): Promise<string> {
    const { data, error } = await supabase.rpc('detect_user_region', {
      country_code: countryCode || null,
      latitude: latitude || null,
      longitude: longitude || null,
    });

    if (error) throw error;
    return data || 'US';
  }

  static async getAllCurrencies() {
    const { data, error } = await supabase
      .from('currencies')
      .select('*')
      .order('code');

    if (error) throw error;
    return data || [];
  }

  static async getActiveCurrencies() {
    const { data, error } = await supabase
      .from('currencies')
      .select('*')
      .eq('is_active', true)
      .order('code');

    if (error) throw error;
    return data || [];
  }

  static async getCurrency(currencyCode: string) {
    const { data, error } = await supabase
      .from('currencies')
      .select('*')
      .eq('code', currencyCode)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getExchangeRate(fromCurrency: string, toCurrency: string) {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const { data, error } = await supabase.rpc('convert_currency', {
      amount,
      from_curr: fromCurrency,
      to_curr: toCurrency,
    });

    if (error) throw error;
    return data || amount;
  }

  static async updateExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    rate: number
  ) {
    const { data, error } = await supabase
      .from('exchange_rates')
      .insert({
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async formatCurrency(amount: number, currencyCode: string): Promise<string> {
    const { data, error } = await supabase.rpc('format_currency_amount', {
      amount,
      currency_code: currencyCode,
    });

    if (error) {
      const currency = await this.getCurrency(currencyCode);
      return this.formatCurrencyLocal(amount, currency?.symbol || currencyCode, currency?.decimal_places || 2);
    }

    return data || this.formatCurrencyLocal(amount, currencyCode, 2);
  }

  private static formatCurrencyLocal(
    amount: number,
    symbol: string,
    decimalPlaces: number
  ): string {
    // Use global currency formatting utility
    // Note: formatCurrencyUtil already includes the $ symbol for USD
    // For other currencies, we'd need to handle symbol replacement
    if (symbol === '$' || symbol === 'USD') {
      return formatCurrencyUtil(amount);
    }

    // For non-USD currencies, apply the same formatting logic but with different symbol
    const absAmount = Math.abs(amount);
    const isNegative = amount < 0;
    let formatted: string;

    if (absAmount < 1000) {
      formatted = `${symbol}${Math.round(absAmount)}`;
    } else if (absAmount < 10000) {
      const value = absAmount / 1000;
      const rounded = Math.round(value * 10) / 10;
      if (rounded % 1 === 0) {
        formatted = `${symbol}${Math.floor(rounded)}k`;
      } else {
        formatted = `${symbol}${rounded.toFixed(1)}k`;
      }
    } else {
      const value = absAmount / 1000;
      formatted = `${symbol}${Math.round(value)}k`;
    }

    return isNegative ? `-${formatted}` : formatted;
  }

  static async updateUserRegion(userId: string, regionCode: string) {
    const region = await this.getRegion(regionCode);
    if (!region) {
      throw new Error('Invalid region code');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        region_code: regionCode,
        preferred_currency: region.default_currency,
        user_timezone: region.timezone,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateUserCurrency(userId: string, currencyCode: string) {
    const currency = await this.getCurrency(currencyCode);
    if (!currency) {
      throw new Error('Invalid currency code');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        preferred_currency: currencyCode,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getUserRegionSettings(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('region_code, preferred_currency, user_timezone')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  static async getRegionCurrencies(regionCode: string): Promise<string[]> {
    const region = await this.getRegion(regionCode);
    return region?.supported_currencies || ['USD'];
  }

  static async bulkConvertPrices(
    prices: { amount: number; currency: string }[],
    targetCurrency: string
  ): Promise<{ original: number; converted: number; currency: string }[]> {
    const results = await Promise.all(
      prices.map(async (price) => {
        const converted = await this.convertCurrency(
          price.amount,
          price.currency,
          targetCurrency
        );
        return {
          original: price.amount,
          converted,
          currency: targetCurrency,
        };
      })
    );

    return results;
  }

  static getRegionFlag(regionCode: string): string {
    const flags: Record<string, string> = {
      US: '🇺🇸',
      CA: '🇨🇦',
      MX: '🇲🇽',
      GB: '🇬🇧',
      EU: '🇪🇺',
    };

    return flags[regionCode] || '🌍';
  }

  static async getRegionStats() {
    const regions = await this.getAllRegions();

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('region_code');

    if (error) throw error;

    const stats = regions.map((region) => ({
      region: region.name,
      code: region.code,
      users: profiles?.filter((p) => p.region_code === region.code).length || 0,
      isActive: region.is_active,
    }));

    return stats;
  }

  static async getCurrencyStats() {
    const currencies = await this.getAllCurrencies();

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('preferred_currency');

    if (error) throw error;

    const stats = currencies.map((currency) => ({
      currency: currency.name,
      code: currency.code,
      symbol: currency.symbol,
      users: profiles?.filter((p) => p.preferred_currency === currency.code).length || 0,
      isActive: currency.is_active,
    }));

    return stats;
  }

  static isValidRegionCode(code: string): boolean {
    const validCodes = ['US', 'CA', 'MX', 'GB', 'EU'];
    return validCodes.includes(code);
  }

  static isValidCurrencyCode(code: string): boolean {
    const validCodes = ['USD', 'CAD', 'MXN', 'GBP', 'EUR'];
    return validCodes.includes(code);
  }

  static getTimezoneOffset(timezone: string): number {
    try {
      const now = new Date();
      const tzString = now.toLocaleString('en-US', { timeZone: timezone });
      const localString = now.toLocaleString('en-US');
      const diff = (Date.parse(tzString) - Date.parse(localString)) / 3600000;
      return diff;
    } catch {
      return 0;
    }
  }

  static async getPreferredPriceDisplay(
    userId: string,
    baseAmount: number,
    baseCurrency: string = 'USD'
  ) {
    const userSettings = await this.getUserRegionSettings(userId);
    const preferredCurrency = userSettings?.preferred_currency || 'USD';

    if (baseCurrency === preferredCurrency) {
      return {
        amount: baseAmount,
        currency: baseCurrency,
        formatted: await this.formatCurrency(baseAmount, baseCurrency),
        isConverted: false,
      };
    }

    const convertedAmount = await this.convertCurrency(
      baseAmount,
      baseCurrency,
      preferredCurrency
    );

    return {
      amount: convertedAmount,
      currency: preferredCurrency,
      formatted: await this.formatCurrency(convertedAmount, preferredCurrency),
      isConverted: true,
      originalAmount: baseAmount,
      originalCurrency: baseCurrency,
    };
  }
}

export default MultiRegionService;
