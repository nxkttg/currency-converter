/** Відображення станів завантаження та помилки в контейнері з role="status" */
import { createElement } from './dom';

export function showLoading(container: HTMLElement, message = 'Завантаження…'): void {
  container.className = 'status status--loading';
  container.replaceChildren(
    createElement('span', { className: 'spinner', attrs: { 'aria-hidden': 'true' } }),
    message,
  );
}

/** Показує помилку. Якщо передано onRetry — додає кнопку «Спробувати знову» */
export function showError(container: HTMLElement, message: string, onRetry?: () => void): void {
  container.className = 'status status--error';

  const children: Node[] = [createElement('span', { text: message })];

  if (onRetry) {
    const retryButton = createElement('button', {
      className: 'btn btn--ghost',
      text: 'Спробувати знову',
      attrs: { type: 'button' },
    });
    retryButton.addEventListener('click', onRetry, { once: true });
    children.push(retryButton);
  }

  container.replaceChildren(...children);
}

export function clearStatus(container: HTMLElement): void {
  container.className = 'status';
  container.replaceChildren();
}
