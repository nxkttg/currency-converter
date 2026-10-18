/**
 * Debounce: викликає функцію лише після паузи в delayMs.
 * Користувач друкує "1", "10", "100" — запит піде тільки один раз, для "100".
 *
 * Generic Args зберігає типи аргументів початкової функції.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number,
): ((...args: Args) => void) & { cancel: () => void } {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: Args): void => {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn(...args), delayMs);
  };

  return Object.assign(debounced, {
    cancel: () => clearTimeout(timerId),
  });
}
