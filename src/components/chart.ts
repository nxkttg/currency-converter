/**
 * Інтерактивний лінійний SVG-графік без сторонніх бібліотек.
 * Миша / дотик — підказка біля найближчої точки.
 * Клавіатура — стрілки ← →, Home, End; значення озвучується через aria-live.
 */
import {
  buildAreaPath,
  buildLinePath,
  findNearestIndex,
  getDomain,
  getTicks,
  scalePoints,
  scaleValue,
  type ChartPoint,
  type ChartSize,
  type ScaledPoint,
} from '../utils/chart';
import { createElement } from './dom';
import { createSkeleton } from './skeleton';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PADDING = { top: 16, right: 16, bottom: 32, left: 72 };
const Y_TICKS = 4;
/** Мінімальна відстань підказки від краю, щоб вона не виходила за межі */
const TOOLTIP_EDGE = 70;

export interface LineChartOptions {
  /** Опис графіка для програм екранного читання */
  getLabel: () => string;
  /** Підписи на осі Y */
  formatValue: (value: number) => string;
  /** Підписи на осі X */
  formatAxisDate: (isoDate: string) => string;
  /** Текст підказки біля точки */
  formatTooltip: (point: ChartPoint) => string;
}

export interface LineChart {
  update: (points: readonly ChartPoint[]) => void;
  setLoading: () => void;
  destroy: () => void;
}

/** Аналог createElement для SVG: у SVG власний простір імен (namespace) */
function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) {
    element.setAttribute(name, String(value));
  }
  return element;
}

function createText(text: string, attrs: Record<string, string | number>): SVGTextElement {
  const element = createSvgElement('text', { class: 'chart__label', ...attrs });
  element.textContent = text;
  return element;
}

export function createLineChart(container: HTMLElement, options: LineChartOptions): LineChart {
  // Замикання (closure): ці змінні «живуть» усередині графіка між викликами
  let points: readonly ChartPoint[] | null = null;
  let scaled: ScaledPoint[] = [];
  let activeIndex = -1;
  let dot: SVGCircleElement | null = null;
  let cursor: SVGLineElement | null = null;

  const tooltip = createElement('div', {
    className: 'chart__tooltip',
    attrs: { 'aria-hidden': 'true' },
  });
  // Окрема «жива область» для озвучення значень при керуванні з клавіатури
  const live = createElement('p', {
    className: 'visually-hidden',
    attrs: { 'aria-live': 'polite' },
  });

  function hideActive(): void {
    activeIndex = -1;
    tooltip.hidden = true;
    dot?.setAttribute('visibility', 'hidden');
    cursor?.setAttribute('visibility', 'hidden');
  }

  function showPoint(index: number, announce = false): void {
    const point = scaled[index];
    if (!point || !dot || !cursor) return;

    activeIndex = index;

    dot.setAttribute('cx', String(point.x));
    dot.setAttribute('cy', String(point.y));
    dot.setAttribute('visibility', 'visible');

    cursor.setAttribute('x1', String(point.x));
    cursor.setAttribute('x2', String(point.x));
    cursor.setAttribute('visibility', 'visible');

    const text = options.formatTooltip(point);
    const left = Math.min(Math.max(point.x, TOOLTIP_EDGE), container.clientWidth - TOOLTIP_EDGE);

    tooltip.textContent = text;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${point.y}px`;
    tooltip.hidden = false;

    // Озвучуємо лише при керуванні клавіатурою — рух миші не повинен «засипати» повідомленнями
    if (announce) {
      live.textContent = text;
    }
  }

  function handlePointerMove(event: PointerEvent): void {
    if (!(event.currentTarget instanceof SVGSVGElement)) return;

    const rect = event.currentTarget.getBoundingClientRect();
    showPoint(findNearestIndex(scaled, event.clientX - rect.left));
  }

  function handleKeyDown(event: KeyboardEvent): void {
    const lastIndex = scaled.length - 1;
    let nextIndex: number;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = activeIndex < 0 ? lastIndex : Math.min(activeIndex + 1, lastIndex);
        break;
      case 'ArrowLeft':
        nextIndex = activeIndex < 0 ? lastIndex : Math.max(activeIndex - 1, 0);
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = lastIndex;
        break;
      default:
        return;
    }

    event.preventDefault(); // стрілки не повинні прокручувати сторінку
    showPoint(nextIndex, true);
  }

  function draw(): void {
    if (points === null) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    if (points.length === 0) {
      container.replaceChildren(
        createElement('p', { className: 'chart__empty', text: 'Немає даних за обраний період.' }),
      );
      return;
    }

    const size: ChartSize = { width, height, padding: PADDING };
    const domain = getDomain(points.map((point) => point.value));
    const baseline = height - PADDING.bottom;
    scaled = scalePoints(points, size, domain);

    const svg = createSvgElement('svg', {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      role: 'img',
      tabindex: 0,
      'aria-label': options.getLabel(),
    });

    // Горизонтальна сітка з підписами значень
    for (const tick of getTicks(domain, Y_TICKS)) {
      const y = scaleValue(tick, size, domain);
      svg.append(
        createSvgElement('line', {
          class: 'chart__grid',
          x1: PADDING.left,
          x2: width - PADDING.right,
          y1: y,
          y2: y,
        }),
        createText(options.formatValue(tick), {
          x: PADDING.left - 8,
          y,
          'text-anchor': 'end',
          'dominant-baseline': 'middle',
        }),
      );
    }

    // Підписи дат: перша, середня, остання (Set прибирає дублікати для коротких рядів)
    const lastIndex = scaled.length - 1;
    for (const index of new Set([0, Math.floor(lastIndex / 2), lastIndex])) {
      const point = scaled[index];
      if (!point) continue;

      let anchor = 'middle';
      if (index === 0) anchor = 'start';
      else if (index === lastIndex) anchor = 'end';

      svg.append(
        createText(options.formatAxisDate(point.date), {
          x: point.x,
          y: height - 8,
          'text-anchor': anchor,
        }),
      );
    }

    cursor = createSvgElement('line', {
      class: 'chart__cursor',
      y1: PADDING.top,
      y2: baseline,
      visibility: 'hidden',
    });
    dot = createSvgElement('circle', { class: 'chart__dot', r: 5, visibility: 'hidden' });

    svg.append(
      createSvgElement('path', { class: 'chart__area', d: buildAreaPath(scaled, baseline) }),
      createSvgElement('path', { class: 'chart__line', d: buildLinePath(scaled) }),
      cursor,
      dot,
    );

    svg.addEventListener('pointermove', handlePointerMove);
    svg.addEventListener('pointerleave', hideActive);
    svg.addEventListener('keydown', handleKeyDown);
    svg.addEventListener('blur', hideActive);

    hideActive();
    container.replaceChildren(svg, tooltip, live);
  }

  // Перемальовуємо графік при зміні розміру контейнера (поворот телефона, зміна вікна)
  const resizeObserver = new ResizeObserver(() => draw());
  resizeObserver.observe(container);

  return {
    update(nextPoints) {
      points = nextPoints;
      draw();
    },
    setLoading() {
      points = null;
      scaled = [];
      container.replaceChildren(createSkeleton('100%', '100%'));
    },
    destroy() {
      resizeObserver.disconnect();
    },
  };
}
