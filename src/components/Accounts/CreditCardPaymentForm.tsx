import { Icon } from "@iconify/react";
import { useEffect, useRef, useState } from "react";
import { Input } from "webcoreui/react";

import FormErrors from "@/components/Forms/FormErrors";
import SelectAccounts from "@/components/Forms/SelectAccounts";
import AmountText from "@/components/General/AmountText";
import { convertCurrencyAmount } from "@/lib/currencyConversion";
import { formatAmount } from "@/lib/formatters";
import { logger } from "@/lib/logger";
import { accountsStore } from "@/stores/accountsStore";
import { currencyStore } from "@/stores/currencyStore";
import { movementsStore } from "@/stores/movementsStore";

interface PaymentSourceRow {
  key: number;
  accountId: number | null;
  amount: string;
}

interface Props {
  creditAccountId: number;
  totalAmount: number;
  installmentIds: number[];
  currency: Currency;
  onSuccess: () => void;
  onCancel: () => void;
}

let nextKey = 0;

function createRow(): PaymentSourceRow {
  return { key: nextKey++, accountId: null, amount: "" };
}

const CreditCardPaymentForm = ({
  creditAccountId,
  totalAmount,
  installmentIds,
  currency,
  onSuccess,
  onCancel,
}: Props) => {
  const [rows, setRows] = useState<PaymentSourceRow[]>([createRow()]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const amountCovered = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const remaining = Math.max(0, totalAmount - amountCovered);
  const isExactlyCovered = Math.abs(totalAmount - amountCovered) < 0.005;
  const isOverfunded = amountCovered > totalAmount + 0.005;

  const handleAccountChange = (key: number, accountId: number) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, accountId } : row)));
  };

  const handleAmountChange = (key: number, value: string) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, amount: value } : row)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, createRow()]);
  };

  const removeRow = (key: number) => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

  const validate = (): string[] => {
    const errs: string[] = [];

    if (rows.length === 0) {
      errs.push("Agrega al menos una cuenta de origen");
      return errs;
    }

    for (const row of rows) {
      if (row.accountId === null) {
        errs.push("Selecciona una cuenta de origen para cada fila");
        break;
      }
    }

    for (const row of rows) {
      const amount = Number(row.amount);
      if (!row.amount || Number.isNaN(amount) || amount <= 0) {
        errs.push("Cada monto debe ser mayor a 0");
        break;
      }
    }

    const seen = new Set<number>();
    for (const row of rows) {
      if (row.accountId !== null) {
        if (seen.has(row.accountId)) {
          errs.push("No puedes seleccionar la misma cuenta dos veces");
          break;
        }
        seen.add(row.accountId);
      }
    }

    if (isOverfunded) {
      errs.push("El monto total excede el pago requerido");
    }

    if (!isExactlyCovered && !isOverfunded) {
      errs.push("El monto total debe cubrir el pago completo");
    }

    return errs;
  };

  const onSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    submittingRef.current = true;
    setSubmitting(true);

    const payments: CreditCardPaymentRequest[] = rows.map((row) => {
      const accountAmount = Number(row.amount);
      const sourceAccount = accountsStore.getState().getById(row.accountId as number);
      const sourceCurrency = sourceAccount
        ? currencyStore.getState().getById(sourceAccount.currencyId)
        : undefined;
      const originalAmount =
        Math.round(convertCurrencyAmount(accountAmount, currency, sourceCurrency) * 100) / 100;

      return {
        fromAccountId: row.accountId as number,
        originalAmount,
        accountAmount,
      };
    });

    try {
      const result = await accountsStore
        .getState()
        .payCreditCard(creditAccountId, payments, installmentIds);

      movementsStore.getState().refresh([...result.transferMovementIds, ...result.paidMovementIds]);

      logger.info("Credit card payment completed", {
        transferMovementIds: result.transferMovementIds,
        installmentIds,
        movementIds: result.paidMovementIds,
      });

      onSuccess();
    } catch (error) {
      logger.error("Payment failed", error);
      submittingRef.current = false;
      if (mountedRef.current) {
        setErrors([String(error)]);
        setSubmitting(false);
      }
    }
  };

  return (
    <form className="space-y-4 border-t border-zinc-200 bg-zinc-100/60 p-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/60" onSubmit={onSubmit}>
      <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">Pagar tarjeta</h3>

      {rows.map((row) => (
        <div key={row.key} className="flex items-end gap-2">
          <div className="flex-1">
            <SelectAccounts
              name={`source-account-${row.key}`}
              label="Cuenta origen"
              accountId={row.accountId ?? undefined}
              excludeId={creditAccountId}
              excludeCredit
              onChange={(id) => handleAccountChange(row.key, id)}
            />
          </div>
          <div className="flex-1">
            <fieldset className="space-y-1">
              <label htmlFor={`amount-${row.key}`} className="text-zinc-700 dark:text-zinc-300">
                Monto
              </label>
              <Input
                type="number"
                name={`amount-${row.key}`}
                id={`amount-${row.key}`}
                value={row.amount}
                min={0.01}
                step={0.01}
                required
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleAmountChange(row.key, e.target.value)
                }
              />
            </fieldset>
          </div>
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => removeRow(row.key)}
              className="mb-1 p-2 text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-500"
              aria-label="Eliminar cuenta de origen"
            >
              <Icon icon="iconoir:trash" className="text-xl" />
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-500"
      >
        <Icon icon="iconoir:plus" />
        Agregar cuenta
      </button>

      <div className="space-y-1 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Próximo pago:</span>
          <AmountText
            amount={totalAmount}
            currency={currency}
            format="currency"
            inline
            className="text-zinc-700 dark:text-zinc-300"
          />
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Monto cubierto:</span>
          <span className={`font-medium ${isExactlyCovered ? "text-green-600 dark:text-green-400" : "text-zinc-700 dark:text-zinc-300"}`}>
            {formatAmount(amountCovered, currency)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Restante:</span>
          <span className={`font-medium ${remaining === 0 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}>
            {formatAmount(remaining, currency)}
          </span>
        </div>
      </div>

      <FormErrors errors={errors} />

      <menu className="flex justify-end gap-3">
        <li>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded border-2 border-zinc-400 px-4 py-2 text-zinc-700 hover:cursor-pointer hover:bg-zinc-200 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50"
          >
            Cancelar
          </button>
        </li>
        <li>
          <button
            type="submit"
            disabled={submitting || !isExactlyCovered}
            className="rounded border-2 border-green-600 bg-green-600 px-4 py-2 text-zinc-50 hover:cursor-pointer hover:border-green-500 hover:bg-green-500 dark:border-green-400 dark:bg-green-400 dark:text-zinc-950 dark:hover:border-green-500 dark:hover:bg-green-500 disabled:opacity-50"
          >
            {submitting ? "Pagando..." : "Pagar"}
          </button>
        </li>
      </menu>
    </form>
  );
};

export default CreditCardPaymentForm;
