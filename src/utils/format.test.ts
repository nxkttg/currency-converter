import { describe, expect, it } from 'vitest';
import {
  capitalize,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  getCurrencyName,
  getFractionDigits,
  getTrendClass,
} from './format';

/** Intl використовує нерозривні пробіли — замінюємо їх звичайними для порівняння */
const normalize = (text: string): string => text.replace(/\s/g, ' ');

describe('getFractionDigits', () => {
  it.each([
    [4487.8, 2],
    [1, 2],
    [0, 2],
    [0.5, 4],
    [0.0223, 4],
    [0.0001, 6],
  ])('для %d повертає %d знаків', (value, digits) => {
    expect(getFractionDigits(value)).toBe(digits);
  });
});

describe('formatNumber', () => {
  it('розділяє розряди та ставить кому', () => {
    expect(normalize(formatNumber(4487.8))).toBe('4 487,80');
  });

  it('показує більше знаків для малих чисел', () => {
    expect(normalize(formatNumber(0.02228))).toBe('0,0223');
  });
});

describe('formatMoney', () => {
  it('додає код валюти', () => {
    expect(normalize(formatMoney(100, 'USD'))).toBe('100,00 USD');
  });
});

describe('formatPercent', () => {
  it('показує плюс для зростання', () => {
    expect(normalize(formatPercent(0.0123))).toMatch(/^\+1,23\s?%$/);
  });

  it('показує мінус для падіння', () => {
    expect(normalize(formatPercent(-0.015))).toMatch(/^[-−]1,50\s?%$/);
  });
});

describe('formatDate', () => {
  it('форматує дату українською', () => {
    const result = formatDate('2026-10-18');

    expect(result).toContain('18');
    expect(result).toContain('жовтня');
    expect(result).toContain('2026');
  });
});

describe('capitalize', () => {
  it('робить першу літеру великою', () => {
    expect(capitalize('долар США')).toBe('Долар США');
  });
});

describe('getCurrencyName', () => {
  it('повертає українську назву валюти', () => {
    expect(getCurrencyName('UAH')).toMatch(/гривня/i);
  });

  it('повертає запасний варіант для невідомої валюти', () => {
    expect(getCurrencyName('ZZZ', 'Unknown')).toBe('Unknown');
  });

  it('повертає запасний варіант для некоректного коду', () => {
    expect(getCurrencyName('US', 'Unknown')).toBe('Unknown');
  });
});

describe('getTrendClass', () => {
  it.each([
    [0.05, 'is-up'],
    [-0.05, 'is-down'],
    [0, ''],
  ])('для %d повертає "%s"', (change, expected) => {
    expect(getTrendClass(change)).toBe(expected);
  });
});
