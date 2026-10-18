/**
 * Безпечна робота з localStorage.
 * try/catch потрібен, бо localStorage може бути недоступний
 * (приватний режим, заборона cookies) або містити пошкоджені дані.
 */

/** Читає значення і перевіряє його тип. Якщо щось не так — повертає fallback */
export function readStorage<T>(key: string, guard: (value: unknown) => value is T, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;

    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/** Зберігає значення. Повертає false, якщо зберегти не вдалося */
export function writeStorage(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
