/**
 * Типи даних Frankfurter API v2.
 * Описують форму JSON-відповідей сервера.
 * Документація: https://frankfurter.dev/
 */

/** Валюта з ендпоінту GET /currencies */
export interface Currency {
  /** Код ISO 4217, наприклад "UAH" */
  iso_code: string;
  /** Цифровий код ISO 4217, наприклад "980". У деяких валют відсутній */
  iso_numeric: string | null;
  /** Назва англійською */
  name: string;
  /** Символ валюти, наприклад "₴". У деяких валют відсутній */
  symbol: string | null;
  /** Дата початку даних у форматі YYYY-MM-DD */
  start_date: string;
  /** Дата останніх даних у форматі YYYY-MM-DD */
  end_date: string;
}

/** Курс валютної пари: GET /rate/{base}/{quote} або елемент масиву GET /rates */
export interface Rate {
  /** Дата курсу у форматі YYYY-MM-DD */
  date: string;
  /** Базова валюта */
  base: string;
  /** Котирувана валюта */
  quote: string;
  /** Скільки одиниць quote коштує 1 одиниця base */
  rate: number;
}

/** Тіло відповіді сервера з помилкою */
export interface ApiErrorBody {
  status: number;
  message: string;
}
