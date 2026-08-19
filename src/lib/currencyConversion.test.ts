import { describe, expect, it } from "vitest";

import { convertCurrencyAmount, effectiveConversionRate } from "@/lib/currencyConversion";

const mxn = { id: 1, name: "Peso", symbol: "$", code: "MXN", conversionRate: 20 } as Currency;
const usd = { id: 2, name: "Dollar", symbol: "$", code: "USD", conversionRate: 1.2 } as Currency;

describe("currency conversion", () => {
  it("converts through the EUR reference rate", () => {
    expect(convertCurrencyAmount(100, usd, mxn)).toBeCloseTo(1666.6667, 3);
  });

  it("does not change same-currency amounts", () => {
    expect(convertCurrencyAmount(100, mxn, mxn)).toBe(100);
  });

  it("derives the effective rate from persisted amounts", () => {
    expect(effectiveConversionRate(100, 1666.67)).toBeCloseTo(16.6667, 3);
  });
});
