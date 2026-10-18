// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, buildUrl, getCurrencies, getErrorMessage, getRate } from './frankfurter';

/** Створює фальшиву відповідь сервера */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const USD_UAH = { date: '2026-10-18', base: 'USD', quote: 'UAH', rate: 44.878 };

describe('buildUrl', () => {
  it('додає параметри запиту', () => {
    expect(buildUrl('/rates', { base: 'USD', quotes: 'UAH' })).toBe(
      'https://api.frankfurter.dev/v2/rates?base=USD&quotes=UAH',
    );
  });

  it('пропускає порожні параметри', () => {
    expect(buildUrl('/rates', { base: 'USD', to: undefined, from: '' })).toBe(
      'https://api.frankfurter.dev/v2/rates?base=USD',
    );
  });
});

describe('API-клієнт', () => {
  // Після кожного тесту повертаємо справжній fetch
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getRate повертає курс валютної пари', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(USD_UAH));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getRate('USD', 'UAH')).resolves.toEqual(USD_UAH);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.frankfurter.dev/v2/rate/USD/UAH',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('getCurrencies повертає список валют', async () => {
    const currencies = [
      {
        iso_code: 'UAH',
        iso_numeric: '980',
        name: 'Ukrainian Hryvnia',
        symbol: '₴',
        start_date: '1996-09-02',
        end_date: '2026-10-18',
      },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(currencies)));

    await expect(getCurrencies()).resolves.toEqual(currencies);
  });

  it('кидає помилку типу http, якщо сервер відповів помилкою', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ status: 422, message: 'invalid currency: ABC' }, 422)),
    );

    const error = await getRate('ABC', 'UAH').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: 'http', status: 422, details: 'invalid currency: ABC' });
  });

  it('кидає помилку типу invalid-data для неочікуваного формату', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ unexpected: true })));

    await expect(getRate('USD', 'UAH')).rejects.toMatchObject({ kind: 'invalid-data' });
  });

  it('кидає помилку типу network, якщо немає з’єднання', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    await expect(getRate('USD', 'UAH')).rejects.toMatchObject({ kind: 'network' });
  });

  it('кидає помилку типу timeout, якщо сервер не відповідає', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Timeout', 'TimeoutError')));

    await expect(getRate('USD', 'UAH')).rejects.toMatchObject({ kind: 'timeout' });
  });
});

describe('getErrorMessage', () => {
  it('повертає повідомлення ApiError', () => {
    expect(getErrorMessage(new ApiError('Тест', 'network'))).toBe('Тест');
  });

  it('повертає загальне повідомлення для інших помилок', () => {
    expect(getErrorMessage(new Error('?'))).toBe('Сталася неочікувана помилка. Спробуйте ще раз.');
  });
});
