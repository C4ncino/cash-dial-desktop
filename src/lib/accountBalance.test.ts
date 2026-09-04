import { describe, expect, it } from "vitest";

import { getAccountDisplayBalance } from "@/lib/accountBalance";

describe("getAccountDisplayBalance", () => {
  it("keeps regular balances and derives credit-card debt without clamping", () => {
    expect(getAccountDisplayBalance({ balance: -25 })).toBe(-25);
    expect(
      getAccountDisplayBalance({
        balance: 4_000,
        creditInfo: { creditLimit: 5_000, cutoffDay: 15, daysToPay: 20 },
      }),
    ).toBe(1_000);
    expect(
      getAccountDisplayBalance({
        balance: 5_000,
        creditInfo: { creditLimit: 5_000, cutoffDay: 15, daysToPay: 20 },
      }),
    ).toBe(0);
    expect(
      getAccountDisplayBalance({
        balance: -100,
        creditInfo: { creditLimit: 5_000, cutoffDay: 15, daysToPay: 20 },
      }),
    ).toBe(5_100);
  });
});
