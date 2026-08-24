import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { convertCurrencyAmount } from "@/lib/currencyConversion";

type AccountCurrency = {
  currencyId: number;
};

interface Props {
  currencies: Currency[];
  movement?: Movement | null;
  selectedPlanning?: Planning;
  selectedAccount?: AccountCurrency;
  selectedToAccount?: AccountCurrency;
  isTransfer: boolean;
}

const DEFAULT_AMOUNT = "0.00";

export const useMovementCurrencyConversion = ({
  currencies,
  movement,
  selectedPlanning,
  selectedAccount,
  selectedToAccount,
  isTransfer,
}: Props) => {
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number | undefined>();
  const [originalAmount, setOriginalAmount] = useState(DEFAULT_AMOUNT);
  const [accountAmount, setAccountAmount] = useState(DEFAULT_AMOUNT);
  const [hasManualAccountAmount, setHasManualAccountAmount] = useState(false);
  const skipConversionRef = useRef(false);

  useEffect(() => {
    if (movement) {
      setSelectedCurrencyId(movement.currencyId);
      setOriginalAmount(String(movement.originalAmount));
      setAccountAmount(String(movement.accountAmount ?? movement.originalAmount));
    }

    setHasManualAccountAmount(false);
    skipConversionRef.current = true;
  }, [movement]);

  useEffect(() => {
    if (!selectedPlanning) return;

    setSelectedCurrencyId(selectedPlanning.currencyId);
    if (!movement) setOriginalAmount(String(selectedPlanning.amount));
    setHasManualAccountAmount(false);
  }, [selectedPlanning?.id, selectedPlanning?.currencyId, selectedPlanning?.amount, movement?.id]);

  const movementCurrencyId =
    isTransfer && selectedAccount
      ? selectedAccount.currencyId
      : (selectedPlanning?.currencyId ?? selectedCurrencyId ?? currencies[0]?.id);

  const movementCurrency = useMemo(
    () => currencies.find((currency) => currency.id === movementCurrencyId),
    [currencies, movementCurrencyId],
  );

  const accountCurrency = useMemo(() => {
    const account = isTransfer ? selectedToAccount : selectedAccount;
    return account ? currencies.find((currency) => currency.id === account.currencyId) : undefined;
  }, [currencies, isTransfer, selectedAccount, selectedToAccount]);

  const hasCurrencyConversion = Boolean(
    movementCurrency && accountCurrency && movementCurrency.id !== accountCurrency.id,
  );

  const calculatedAccountAmount = useMemo(() => {
    const amount = Number(originalAmount);
    if (!Number.isFinite(amount) || !movementCurrency || !accountCurrency) return undefined;

    return convertCurrencyAmount(amount, movementCurrency, accountCurrency).toFixed(2);
  }, [accountCurrency, movementCurrency, originalAmount]);

  const applyEcbRate = useCallback(() => {
    if (calculatedAccountAmount === undefined) return;

    setHasManualAccountAmount(false);
    setAccountAmount(calculatedAccountAmount);
  }, [calculatedAccountAmount]);

  const onAccountAmountChange = useCallback((value: string) => {
    setHasManualAccountAmount(true);
    setAccountAmount(value);
  }, []);

  useEffect(() => {
    if (skipConversionRef.current) {
      if (
        movement &&
        (movementCurrencyId !== movement.currencyId || calculatedAccountAmount === undefined)
      ) {
        return;
      }

      skipConversionRef.current = false;
      return;
    }

    if (!calculatedAccountAmount || hasManualAccountAmount) return;
    setAccountAmount(calculatedAccountAmount);
  }, [calculatedAccountAmount, hasManualAccountAmount]);

  useEffect(() => {
    const amountInput = document.getElementById("amount") as HTMLInputElement | null;
    const accountAmountInput = document.getElementById("accountAmount") as HTMLInputElement | null;

    if (amountInput && amountInput.value !== originalAmount) amountInput.value = originalAmount;
    if (accountAmountInput && accountAmountInput.value !== accountAmount) {
      accountAmountInput.value = accountAmount;
    }
  }, [accountAmount, originalAmount]);

  const resetCurrencyConversion = useCallback(() => {
    setSelectedCurrencyId(undefined);
    setOriginalAmount(DEFAULT_AMOUNT);
    setAccountAmount(DEFAULT_AMOUNT);
    setHasManualAccountAmount(false);
    skipConversionRef.current = false;
  }, []);

  const restoreCurrencyConversion = useCallback(() => {
    if (movement) {
      setSelectedCurrencyId(movement.currencyId);
      setOriginalAmount(String(movement.originalAmount));
      setAccountAmount(String(movement.accountAmount ?? movement.originalAmount));
      skipConversionRef.current = true;
    } else if (selectedPlanning) {
      setSelectedCurrencyId(selectedPlanning.currencyId);
      setOriginalAmount(String(selectedPlanning.amount));
      setAccountAmount(DEFAULT_AMOUNT);
      skipConversionRef.current = false;
    } else {
      setSelectedCurrencyId(undefined);
      setOriginalAmount(DEFAULT_AMOUNT);
      setAccountAmount(DEFAULT_AMOUNT);
      skipConversionRef.current = false;
    }

    setHasManualAccountAmount(false);
  }, [movement, selectedPlanning]);

  return {
    selectedCurrencyId,
    setSelectedCurrencyId,
    originalAmount,
    setOriginalAmount,
    accountAmount,
    onAccountAmountChange,
    movementCurrencyId,
    movementCurrency,
    accountCurrency,
    hasCurrencyConversion,
    applyEcbRate,
    resetCurrencyConversion,
    restoreCurrencyConversion,
  };
};

export default useMovementCurrencyConversion;
