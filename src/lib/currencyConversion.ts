export function convertCurrencyAmount(
  amount: number,
  from: Currency | undefined,
  to: Currency | undefined,
): number {
  if (!Number.isFinite(amount) || !from || !to || from.id === to.id) return amount;
  if (!Number.isFinite(from.conversionRate) || !Number.isFinite(to.conversionRate)) return amount;
  return amount * (to.conversionRate / from.conversionRate);
}

export function effectiveConversionRate(originalAmount: number, accountAmount: number): number {
  if (!Number.isFinite(originalAmount) || originalAmount <= 0) return 1;
  return accountAmount / originalAmount;
}
