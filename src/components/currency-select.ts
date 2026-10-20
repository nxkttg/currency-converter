/** Заповнення <select> списком валют */
import type { CurrencyInfo } from '../services/currencies';
import { getCurrencyName } from '../utils/format';

function createOption(code: string, name: string): HTMLOptionElement {
  return new Option(`${code} — ${name}`, code);
}

/** Заповнює список. Повертає false, якщо потрібної валюти в списку немає */
export function fillCurrencySelect(
  select: HTMLSelectElement,
  currencies: readonly CurrencyInfo[],
  selected: string,
): boolean {
  select.replaceChildren(...currencies.map((c) => createOption(c.code, c.name)));

  const exists = currencies.some((c) => c.code === selected);
  if (exists) {
    select.value = selected;
  }
  return exists;
}

/** Обирає валюту; якщо такої опції ще немає — додає її */
export function selectCurrency(select: HTMLSelectElement, code: string): void {
  const exists = Array.from(select.options).some((option) => option.value === code);

  if (!exists) {
    select.add(createOption(code, getCurrencyName(code)));
  }
  select.value = code;
}
