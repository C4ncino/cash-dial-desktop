import { describe, expect, it, vi } from "vitest";

import {
  formatAmount,
  formatInt,
  formatNumber,
  formatShortAmount,
  hyphenateText,
  lang,
} from "@/lib/formatters";

const currency = {
  id: 1,
  name: "Peso mexicano",
  symbol: "$",
  code: "MXN",
  conversionRate: 1,
} as Currency;

describe("formatters", () => {
  it("uses a supported locale and formats zero, negatives, and rounding", () => {
    expect(Intl.NumberFormat.supportedLocalesOf([lang])).toHaveLength(1);
    expect(formatNumber(0)).toMatch(/0[.,]00/);
    expect(formatNumber(-12.345)).toMatch(/-12[.,]35/);
    expect(formatInt(12.6)).toMatch(/13/);
  });

  it("switches precision symmetrically above a configured threshold", () => {
    expect(formatNumber(999, 999)).toMatch(/999[.,]00/);
    expect(formatNumber(1000, 999)).not.toMatch(/[.,]00$/);
    expect(formatNumber(-1000, 999)).not.toMatch(/[.,]00$/);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "renders non-finite value %s as a placeholder",
    (value) => {
      expect(formatNumber(value)).toBe("—");
      expect(formatInt(value)).toBe("—");
      expect(formatShortAmount(value)).toBe("—");
      expect(formatAmount(value, currency)).toBe("—");
    },
  );

  it("formats compact amount thresholds, signs, decimals, and large values", () => {
    expect(formatShortAmount(999)).not.toMatch(/[KMB]/);
    expect(formatShortAmount(1000)).toBe("1K");
    expect(formatShortAmount(-1000)).toBe("-1K");
    expect(formatShortAmount(1_000_000)).toBe("1M");
    expect(formatShortAmount(1_000_000_000)).toBe("1B");
    expect(formatShortAmount(1_250, true)).toBe("1.25K");
    expect(formatShortAmount(Number.MAX_SAFE_INTEGER)).toMatch(/B$/);
  });

  it("formats valid currencies and falls back safely for an invalid code", () => {
    expect(formatAmount(1234.5, currency)).toMatch(/1[,.]234[,.]50/);
    expect(formatAmount(12, { ...currency, code: "invalid", symbol: "¤" })).toMatch(/12.*¤/);
  });

  it("hyphenates long Spanish text while preserving short, empty, and spaced text", () => {
    expect(hyphenateText("", 5)).toBe("");
    expect(hyphenateText("casa", 10)).toBe("casa");
    expect(hyphenateText("canción extraordinaria", 4)).toContain("\u00AD");
    expect(hyphenateText("árbol  español", 3)).toContain("  ");
  });

  it("falls back to es-MX when the detected locale is invalid", async () => {
    const originalLanguage = navigator.language;
    Object.defineProperty(navigator, "language", { configurable: true, value: "not_a_locale" });
    vi.resetModules();
    const isolated = await import("@/lib/formatters");
    expect(isolated.lang).toBe("es-MX");
    Object.defineProperty(navigator, "language", { configurable: true, value: originalLanguage });
  });
});
