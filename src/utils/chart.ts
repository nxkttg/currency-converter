/**
 * Геометрія лінійного графіка: перетворення значень курсу на координати SVG.
 * Чисті функції без DOM — легко тестуються.
 */

export interface ChartPoint {
  /** Дата у форматі YYYY-MM-DD */
  date: string;
  value: number;
}

/** Точка з обчисленими координатами в пікселях */
export interface ScaledPoint extends ChartPoint {
  x: number;
  y: number;
}

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartSize {
  width: number;
  height: number;
  /** Відступи для підписів осей */
  padding: Padding;
}

/** Діапазон значень на вертикальній осі */
export interface Domain {
  min: number;
  max: number;
}

/**
 * Діапазон осі Y з невеликим запасом зверху і знизу,
 * щоб лінія не торкалась країв графіка.
 */
export function getDomain(values: readonly number[], paddingRatio = 0.1): Domain {
  if (values.length === 0) {
    return { min: 0, max: 1 };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  // Якщо курс не змінювався (пряма лінія) — робимо штучний запас 1%
  const padding = range === 0 ? Math.abs(max) * 0.01 || 1 : range * paddingRatio;

  return { min: min - padding, max: max + padding };
}

/** Значення → вертикальна координата. У SVG вісь Y спрямована вниз, тому віднімаємо */
export function scaleValue(value: number, size: ChartSize, domain: Domain): number {
  const { top, bottom } = size.padding;
  const innerHeight = size.height - top - bottom;
  const ratio = (value - domain.min) / (domain.max - domain.min);

  return top + innerHeight * (1 - ratio);
}

/** Розставляє точки рівномірно по горизонталі та масштабує по вертикалі */
export function scalePoints(
  points: readonly ChartPoint[],
  size: ChartSize,
  domain: Domain,
): ScaledPoint[] {
  const { left, right } = size.padding;
  const innerWidth = size.width - left - right;
  const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  return points.map((point, index) => ({
    ...point,
    // Одна точка — ставимо по центру
    x: points.length > 1 ? left + index * step : left + innerWidth / 2,
    y: scaleValue(point.value, size, domain),
  }));
}

/** Рівномірні значення для горизонтальних ліній сітки */
export function getTicks(domain: Domain, count: number): number[] {
  const step = (domain.max - domain.min) / (count - 1);
  return Array.from({ length: count }, (_, index) => domain.min + step * index);
}

const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * Атрибут d для <path>: "M x,y L x,y L x,y…"
 * M (move) — перейти до точки, L (line) — провести лінію до точки.
 */
export function buildLinePath(points: readonly Pick<ScaledPoint, 'x' | 'y'>[]): string {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${round(point.x)},${round(point.y)}`)
    .join(' ');
}

/** Замкнена область під лінією (для заливки): лінія → вниз → назад → Z (закрити) */
export function buildAreaPath(
  points: readonly Pick<ScaledPoint, 'x' | 'y'>[],
  baselineY: number,
): string {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return '';

  return `${buildLinePath(points)} L${round(last.x)},${round(baselineY)} L${round(first.x)},${round(baselineY)} Z`;
}

/** Індекс точки, найближчої по горизонталі до курсора. -1 для порожнього масиву */
export function findNearestIndex(points: readonly Pick<ScaledPoint, 'x'>[], x: number): number {
  let nearestIndex = -1;
  let minDistance = Infinity;

  points.forEach((point, index) => {
    const distance = Math.abs(point.x - x);
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}
