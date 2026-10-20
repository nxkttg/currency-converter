/** Скелетон — сіра «заглушка», що переливається під час завантаження даних */
import { createElement } from './dom';

export function createSkeleton(height = '1rem', width = '100%'): HTMLSpanElement {
  const skeleton = createElement('span', { className: 'skeleton' });
  skeleton.style.setProperty('--skeleton-height', height);
  skeleton.style.width = width;
  return skeleton;
}
