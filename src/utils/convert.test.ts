import { describe, expect, it } from 'vitest';
import { calculateChange, calculateStats, convert, invertRate, parseAmount } from './convert';

describe('parseAmount', () => {
  it('приймає ціле число', () => {
    expect(parseAmount('100')).toEqual({ ok: true, value: 100 });
  });

  it('приймає кому як десятковий роздільник', () => {
    expect(parseAmount('12,5')).toEqual({ ok: true, value: 12.5 });
  });

  it('приймає крапку як десятковий роздільник', () => {
    expect(parseAmount('12.5')).toEqual({ ok: true, value: 12.5 });
  });

  it('ігнорує пробіли між розрядами та по краях', () => {
    expect(parseAmount('  1 000 000 ')).toEqual({ ok: true, value: 1_000_000 });
  });

  it.each([
    ['', 'Введіть суму.'],
    ['   ', 'Введіть суму.'],
    ['-5', 'Сума не може бути від’ємною.'],
    ['abc', 'Введіть число, наприклад 100 або 12,50.'],
    ['1.2.3', 'Введіть число, наприклад 100 або 12,50.'],
    ['0', 'Сума має бути більшою за нуль.'],
    ['9999999999999', 'Сума занадто велика.'],
  ])('повертає помилку для "%s"', (input, error) => {
    expect(parseAmount(input)).toEqual({ ok: false, error });
  });
});

describe('convert', () => {
  it('множить суму на курс', () => {
    expect(convert(100, 44.878)).toBeCloseTo(4487.8);
  });
});

describe('invertRate', () => {
  it('повертає обернений курс', () => {
    expect(invertRate(0.02228)).toBeCloseTo(44.883, 3);
  });

  it('кидає помилку для нульового курсу', () => {
    expect(() => invertRate(0)).toThrow(RangeError);
  });
});

describe('calculateChange', () => {
  it('рахує відносну зміну', () => {
    expect(calculateChange(40, 44)).toBeCloseTo(0.1);
  });

  it('повертає 0, якщо початкове значення нульове', () => {
    expect(calculateChange(0, 5)).toBe(0);
  });
});

describe('calculateStats', () => {
  it('повертає null для порожнього масиву', () => {
    expect(calculateStats([])).toBeNull();
  });

  it('рахує мінімум, максимум, середнє та зміну', () => {
    const stats = calculateStats([40, 44, 42]);

    expect(stats).not.toBeNull();
    expect(stats?.min).toBe(40);
    expect(stats?.max).toBe(44);
    expect(stats?.average).toBeCloseTo(42);
    expect(stats?.change).toBeCloseTo(0.05);
  });
});
