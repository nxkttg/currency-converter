import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
  // «Фальшивий годинник»: керуємо часом вручну, тест не чекає реальні секунди
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('викликає функцію один раз з останніми аргументами', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('1');
    debounced('10');
    debounced('100');

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('100');
  });

  it('не викликає функцію до завершення паузи', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    vi.advanceTimersByTime(299);

    expect(fn).not.toHaveBeenCalled();
  });

  it('cancel скасовує запланований виклик', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(300);

    expect(fn).not.toHaveBeenCalled();
  });
});
