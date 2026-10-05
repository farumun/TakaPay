export function normalizeSupportedCurrencies(value: string[] | string): string[] {
  const currencies = Array.isArray(value) ? value : value.split(",");
  return currencies.map((currency) => currency.trim()).filter(Boolean);
}
