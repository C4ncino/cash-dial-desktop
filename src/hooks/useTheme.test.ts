import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import useTheme, { getDocumentTheme } from "@/hooks/useTheme";

describe("useTheme", () => {
  afterEach(() => document.documentElement.classList.remove("dark"));

  it("reads the theme from the document", () => {
    expect(getDocumentTheme()).toBe("light");
    document.documentElement.classList.add("dark");
    expect(getDocumentTheme()).toBe("dark");
  });

  it("updates when the application theme changes", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      document.documentElement.classList.add("dark");
      window.dispatchEvent(
        new CustomEvent("cashdial:theme-change", { detail: { theme: "dark" } }),
      );
    });

    expect(result.current).toEqual({ isDark: true, isLight: false });
  });
});
