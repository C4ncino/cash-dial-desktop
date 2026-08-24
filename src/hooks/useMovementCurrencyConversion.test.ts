import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import useMovementCurrencyConversion from "@/hooks/useMovementCurrencyConversion";

const currencies: Currency[] = [
  { id: 1, name: "Mexican Peso", code: "MXN", symbol: "$", conversionRate: 20 },
  { id: 2, name: "US Dollar", code: "USD", symbol: "$", conversionRate: 1 },
];

const cashAccount = { currencyId: 1 };

describe("useMovementCurrencyConversion", () => {
  it("calculates the account amount using the stored currency rates", async () => {
    const { result } = renderHook(() =>
      useMovementCurrencyConversion({
        currencies,
        selectedAccount: cashAccount,
        isTransfer: false,
      }),
    );

    act(() => {
      result.current.setSelectedCurrencyId(2);
      result.current.setOriginalAmount("100");
    });

    await waitFor(() => expect(result.current.accountAmount).toBe("2000.00"));
    expect(result.current.hasCurrencyConversion).toBe(true);
  });

  it("preserves manual amounts until the ECB conversion is requested", async () => {
    const { result } = renderHook(() =>
      useMovementCurrencyConversion({
        currencies,
        selectedAccount: cashAccount,
        isTransfer: false,
      }),
    );

    act(() => {
      result.current.setSelectedCurrencyId(2);
      result.current.setOriginalAmount("100");
    });
    await waitFor(() => expect(result.current.accountAmount).toBe("2000.00"));

    act(() => result.current.onAccountAmountChange("2100"));
    act(() => result.current.setOriginalAmount("200"));
    expect(result.current.accountAmount).toBe("2100");

    act(() => result.current.applyEcbRate());
    expect(result.current.accountAmount).toBe("4000.00");
  });

  it("initializes from a movement and resets its conversion state", async () => {
    const movement: Movement = {
      id: 10,
      typeId: 1,
      accountId: 1,
      categoryId: 1,
      currencyId: 2,
      originalAmount: 100,
      accountAmount: 2100,
      timestamp: Date.now(),
    };

    const { result } = renderHook(() =>
      useMovementCurrencyConversion({
        currencies,
        movement,
        selectedAccount: cashAccount,
        isTransfer: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.originalAmount).toBe("100");
      expect(result.current.accountAmount).toBe("2100");
    });

    act(() => result.current.resetCurrencyConversion());
    expect(result.current.originalAmount).toBe("0.00");
    expect(result.current.accountAmount).toBe("0.00");
    expect(result.current.selectedCurrencyId).toBeUndefined();

    act(() => result.current.restoreCurrencyConversion());
    expect(result.current.originalAmount).toBe("100");
    expect(result.current.accountAmount).toBe("2100");
    expect(result.current.selectedCurrencyId).toBe(2);
  });

  it("uses the origin account currency for transfers", async () => {
    const { result } = renderHook(() =>
      useMovementCurrencyConversion({
        currencies,
        selectedAccount: { currencyId: 1 },
        selectedToAccount: { currencyId: 2 },
        isTransfer: true,
      }),
    );

    expect(result.current.movementCurrencyId).toBe(1);
    expect(result.current.movementCurrency?.code).toBe("MXN");
    expect(result.current.accountCurrency?.code).toBe("USD");
    expect(result.current.hasCurrencyConversion).toBe(true);

    act(() => result.current.setOriginalAmount("100"));
    await waitFor(() => expect(result.current.accountAmount).toBe("5.00"));

    act(() => result.current.onAccountAmountChange("4.75"));
    act(() => result.current.setOriginalAmount("200"));
    expect(result.current.accountAmount).toBe("4.75");

    act(() => result.current.applyEcbRate());
    expect(result.current.accountAmount).toBe("10.00");
  });
});
