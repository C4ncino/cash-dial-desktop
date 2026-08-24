import { convertCurrencyAmount } from "@/lib/currencyConversion";
import { validationResult } from "@/lib/forms/general";

export interface PaymentSourceRow {
  key: number;
  accountId: number | null;
  amount: string;
}

export function getPaymentCoverage(rows: PaymentSourceRow[], totalAmount: number) {
  const amountCovered = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  return {
    amountCovered,
    remaining: Math.max(0, totalAmount - amountCovered),
    isExactlyCovered: Math.abs(totalAmount - amountCovered) < 0.005,
    isOverfunded: amountCovered > totalAmount + 0.005,
  };
}

export function validateCreditCardPayment(rows: PaymentSourceRow[], totalAmount: number) {
  const errors: string[] = [];
  if (rows.length === 0) return validationResult(["Agrega al menos una cuenta de origen"]);
  if (rows.some((row) => row.accountId === null))
    errors.push("Selecciona una cuenta de origen para cada fila");
  if (
    rows.some((row) => !row.amount || Number.isNaN(Number(row.amount)) || Number(row.amount) <= 0)
  )
    errors.push("Cada monto debe ser mayor a 0");
  const accountIds = rows.flatMap((row) => (row.accountId === null ? [] : [row.accountId]));
  if (new Set(accountIds).size !== accountIds.length)
    errors.push("No puedes seleccionar la misma cuenta dos veces");
  const { isExactlyCovered, isOverfunded } = getPaymentCoverage(rows, totalAmount);
  if (isOverfunded) errors.push("El monto total excede el pago requerido");
  else if (!isExactlyCovered) errors.push("El monto total debe cubrir el pago completo");
  return validationResult(errors);
}

export function createCreditCardPaymentRequests(
  rows: PaymentSourceRow[],
  targetCurrency: Currency,
  getSourceCurrency: (accountId: number) => Currency | undefined,
): CreditCardPaymentRequest[] {
  return rows.map((row) => {
    const accountAmount = Number(row.amount);
    const originalAmount =
      Math.round(
        convertCurrencyAmount(
          accountAmount,
          targetCurrency,
          getSourceCurrency(row.accountId as number),
        ) * 100,
      ) / 100;
    return { fromAccountId: row.accountId as number, originalAmount, accountAmount };
  });
}
