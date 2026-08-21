import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

export type ThemeState = {
  isDark: boolean;
  isLight: boolean;
};

export const getDocumentTheme = (): Theme =>
  typeof document !== "undefined" && document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";

const useTheme = (): ThemeState => {
  const [theme, setTheme] = useState<Theme>(getDocumentTheme);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme?: Theme }>;
      setTheme(customEvent.detail?.theme ?? getDocumentTheme());
    };

    setTheme(getDocumentTheme());
    window.addEventListener("cashdial:theme-change", handleThemeChange);
    return () => window.removeEventListener("cashdial:theme-change", handleThemeChange);
  }, []);

  return {
    isDark: theme === "dark",
    isLight: theme === "light",
  };
};

export default useTheme;
