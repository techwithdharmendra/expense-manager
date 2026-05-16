
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AppSettings } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, settings?: Partial<AppSettings> | string | null): string {
  let currency = 'INR';
  let numberFormat = 'in';
  let showDecimals = true;
  let showSignSymbol = true;
  
  if (typeof settings === 'string') {
    currency = settings;
  } else if (settings) {
    currency = settings.currency || 'INR';
    numberFormat = settings.numberFormat || 'in';
    showDecimals = settings.showDecimals !== false;
    showSignSymbol = settings.showSignSymbol !== false;
  }

  let locale = 'en-IN';
  if (numberFormat === 'us') locale = 'en-US';
  else if (numberFormat === 'eu') locale = 'de-DE';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
    signDisplay: showSignSymbol ? 'auto' : 'never'
  }).format(amount);
}

export function formatNumberOnly(amount: number | string, settings?: Partial<AppSettings> | string | null): string {
  if (amount === '' || amount === null || amount === undefined) return '';
  let numberFormat = 'in';
  
  if (typeof settings === 'string') {
    numberFormat = settings; // Just fallback
  } else if (settings) {
    numberFormat = settings.numberFormat || 'in';
  }

  let locale = 'en-IN';
  let decimalSeparator = '.';
  if (numberFormat === 'us') {
    locale = 'en-US';
  } else if (numberFormat === 'eu') {
    locale = 'de-DE';
    decimalSeparator = ',';
  }

  // Expect raw string to be a standard JS float string (e.g., "1000.50" or "1000")
  const amountStr = String(amount).trim();
  const parts = amountStr.split('.');
  
  if (!parts[0]) parts[0] = '0';
  const integerPart = parseInt(parts[0], 10);
  
  if (isNaN(integerPart)) return '';

  const formattedInteger = new Intl.NumberFormat(locale).format(integerPart);
  
  if (parts.length > 1) {
    return `${formattedInteger}${decimalSeparator}${parts[1]}`;
  }
  
  return formattedInteger;
}

export function getCurrencySymbol(settings?: Partial<AppSettings> | string | null): string {
  let currency = 'INR';
  let numberFormat = 'in';
  
  if (typeof settings === 'string') {
    currency = settings;
  } else if (settings) {
    currency = settings.currency || 'INR';
    numberFormat = settings.numberFormat || 'in';
  }

  let locale = 'en-IN';
  if (numberFormat === 'us') locale = 'en-US';
  else if (numberFormat === 'eu') locale = 'de-DE';
  
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  });
  const parts = formatter.formatToParts(0);
  const symbolPart = parts.find(part => part.type === 'currency');
  return symbolPart ? symbolPart.value : currency;
}
