import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearStatus, showError, showLoading } from './status';

describe('status', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('showLoading показує спінер і текст', () => {
    showLoading(container, 'Завантаження…');

    expect(container.classList.contains('status--loading')).toBe(true);
    expect(container.querySelector('.spinner')).not.toBeNull();
    expect(container.textContent).toContain('Завантаження…');
  });

  it('showError без onRetry не показує кнопку', () => {
    showError(container, 'Помилка');

    expect(container.classList.contains('status--error')).toBe(true);
    expect(container.querySelector('button')).toBeNull();
  });

  it('кнопка «Спробувати знову» викликає onRetry', () => {
    const onRetry = vi.fn();
    showError(container, 'Помилка', onRetry);

    const button = container.querySelector('button');
    expect(button?.textContent).toBe('Спробувати знову');

    button?.click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('clearStatus очищає контейнер', () => {
    showLoading(container);
    clearStatus(container);

    expect(container.childElementCount).toBe(0);
    expect(container.className).toBe('status');
  });
});
