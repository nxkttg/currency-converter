import { describe, expect, it } from 'vitest';
import {
  buildAreaPath,
  buildLinePath,
  findNearestIndex,
  getDomain,
  getTicks,
  scalePoints,
  scaleValue,
  type ChartSize,
} from './chart';

/** Графік 200×100 без відступів — легко рахувати очікувані координати */
const SIZE: ChartSize = {
  width: 200,
  height: 100,
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
};
const DOMAIN = { min: 0, max: 100 };

describe('getDomain', () => {
  it('додає запас 10% зверху і знизу', () => {
    expect(getDomain([10, 20])).toEqual({ min: 9, max: 21 });
  });

  it('створює діапазон для незмінного курсу', () => {
    const domain = getDomain([5, 5, 5]);
    expect(domain.min).toBeLessThan(5);
    expect(domain.max).toBeGreaterThan(5);
  });

  it('повертає діапазон за замовчуванням для порожнього масиву', () => {
    expect(getDomain([])).toEqual({ min: 0, max: 1 });
  });
});

describe('scaleValue', () => {
  it.each([
    [100, 0],
    [50, 50],
    [0, 100],
  ])('значення %d → y = %d (вісь Y спрямована вниз)', (value, y) => {
    expect(scaleValue(value, SIZE, DOMAIN)).toBe(y);
  });
});

describe('scalePoints', () => {
  it('розставляє точки рівномірно на всю ширину', () => {
    const points = [
      { date: '2026-10-01', value: 0 },
      { date: '2026-10-02', value: 50 },
      { date: '2026-10-03', value: 100 },
    ];
    const scaled = scalePoints(points, SIZE, DOMAIN);

    expect(scaled.map((p) => p.x)).toEqual([0, 100, 200]);
    expect(scaled.map((p) => p.y)).toEqual([100, 50, 0]);
  });

  it('ставить єдину точку по центру', () => {
    const [point] = scalePoints([{ date: '2026-10-01', value: 50 }], SIZE, DOMAIN);
    expect(point?.x).toBe(100);
  });
});

describe('getTicks', () => {
  it('повертає рівномірні значення', () => {
    expect(getTicks({ min: 0, max: 30 }, 4)).toEqual([0, 10, 20, 30]);
  });
});

describe('buildLinePath', () => {
  it('будує шлях з округленням координат', () => {
    expect(
      buildLinePath([
        { x: 0, y: 10 },
        { x: 5.556, y: 20 },
      ]),
    ).toBe('M0,10 L5.56,20');
  });
});

describe('buildAreaPath', () => {
  it('повертає порожній рядок для порожнього масиву', () => {
    expect(buildAreaPath([], 100)).toBe('');
  });

  it('замикає область до базової лінії', () => {
    expect(
      buildAreaPath(
        [
          { x: 0, y: 10 },
          { x: 10, y: 20 },
        ],
        100,
      ),
    ).toBe('M0,10 L10,20 L10,100 L0,100 Z');
  });
});

describe('findNearestIndex', () => {
  const points = [{ x: 0 }, { x: 10 }, { x: 20 }];

  it('знаходить найближчу точку', () => {
    expect(findNearestIndex(points, 12)).toBe(1);
    expect(findNearestIndex(points, 18)).toBe(2);
  });

  it('повертає -1 для порожнього масиву', () => {
    expect(findNearestIndex([], 5)).toBe(-1);
  });
});
