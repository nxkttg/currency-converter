// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { getFavorites, isFavorite, toggleFavorite } from './favorites';

describe('favorites', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('додає валюту в обране', () => {
    expect(toggleFavorite('USD')).toBe(true);
    expect(isFavorite('USD')).toBe(true);
  });

  it('видаляє валюту з обраного при повторному виклику', () => {
    toggleFavorite('USD');

    expect(toggleFavorite('USD')).toBe(false);
    expect(isFavorite('USD')).toBe(false);
  });

  it('зберігає кілька валют', () => {
    toggleFavorite('USD');
    toggleFavorite('EUR');

    expect(getFavorites()).toEqual(new Set(['USD', 'EUR']));
  });
});
