import { describe, it, expect } from 'vitest';

describe('Налаштування тестів', () => {
  it('Vitest працює', () => {
    expect(1 + 1).toBe(2);
  });

  it('jsdom надає доступ до DOM', () => {
    document.body.innerHTML = '<p>Привіт</p>';
    expect(document.querySelector('p')?.textContent).toBe('Привіт');
  });
});
