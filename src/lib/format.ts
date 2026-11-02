export function formatMoney(amount: string | number, currency = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(Number(amount));
}
