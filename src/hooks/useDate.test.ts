import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import useDate from "@/hooks/useDate";

describe("useDate", () => {
  it("returns a stable Date and localized date strings", () => {
    const timestamp = new Date(2026, 7, 19, 13, 5).getTime();
    const { result, rerender } = renderHook(({ value }) => useDate(value), {
      initialProps: { value: timestamp },
    });
    const firstDate = result.current.dateObject;
    expect(result.current.dateShort).not.toBe("");
    expect(result.current.dateLong).toMatch(/2026/);
    rerender({ value: timestamp });
    expect(result.current.dateObject).toBe(firstDate);
  });

  it("uses the configured 12-hour clock", () => {
    const { result } = renderHook(() => useDate(new Date(2026, 7, 19, 13, 5).getTime()));
    expect(result.current.time).toMatch(/01.*05|1.*05/);
  });
});
