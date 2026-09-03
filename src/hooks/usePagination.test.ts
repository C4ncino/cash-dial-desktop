import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import usePagination from "@/hooks/usePagination";

describe("usePagination", () => {
  it("clamps the initial value and navigation at both boundaries", () => {
    const { result } = renderHook(() => usePagination(2, 99));
    expect(result.current.current).toBe(2);
    expect(result.current.isLast).toBe(true);
    act(() => result.current.next());
    expect(result.current.current).toBe(2);
    act(() => result.current.set(-4));
    expect(result.current.current).toBe(0);
    expect(result.current.isFirst).toBe(true);
    act(() => result.current.prev());
    expect(result.current.current).toBe(0);
  });

  it("normalizes fractional and non-finite values", () => {
    const { result, rerender } = renderHook(
      ({ max }) => usePagination(max, Number.POSITIVE_INFINITY),
      { initialProps: { max: 3.9 } },
    );
    expect(result.current.current).toBe(0);
    act(() => result.current.set(2.8));
    expect(result.current.current).toBe(2);
    rerender({ max: Number.NaN });
    expect(result.current.current).toBe(0);
  });

  it("moves the current value back when the maximum shrinks", () => {
    const { result, rerender } = renderHook(({ max }) => usePagination(max, 4), {
      initialProps: { max: 5 },
    });
    rerender({ max: 2 });
    expect(result.current.current).toBe(2);
    expect(result.current.isLast).toBe(true);
  });
});
