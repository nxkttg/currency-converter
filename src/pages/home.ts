import '../styles/main.css';
import { getCurrencies, getRate, getTimeSeries } from '../api/frankfurter';
import { subtractDays, toIsoDate } from '../utils/date';

// ТИМЧАСОВА перевірка API — на наступному етапі замінимо справжнім кодом
async function checkApi(): Promise<void> {
  try {
    const rate = await getRate('USD', 'UAH');
    console.log('Курс USD → UAH:', rate);

    const currencies = await getCurrencies();
    console.log(`Отримано валют: ${currencies.length}`, currencies.slice(0, 3));

    const weekAgo = toIsoDate(subtractDays(new Date(), 7));
    const series = await getTimeSeries('USD', 'UAH', weekAgo);
    console.table(series);

    // Навмисна помилка: неіснуюча валюта
    await getRate('ABC', 'UAH');
  } catch (error) {
    console.error('Помилка API:', error);
  }
}

void checkApi();
