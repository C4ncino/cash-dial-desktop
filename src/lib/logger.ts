import { systemCommands } from "@/services/tauri/system";

type Level = "trace" | "debug" | "info" | "warn" | "error";
let globalHandlersBound = false;

function shouldLog(level: Level) {
  const env = import.meta.env.MODE;
  const configured =
    (import.meta.env.LOG_LEVEL as string) || (env === "development" ? "debug" : "info");
  const order: Record<Level, number> = { trace: 0, debug: 1, info: 2, warn: 3, error: 4 };
  return order[level] >= order[configured as Level];
}

export const logger = {
  trace: (...args: any[]) => {
    if (shouldLog("trace")) console.trace(...args);
  },
  debug: (...args: any[]) => {
    if (shouldLog("debug")) console.info(...args);
  },
  info: (...args: any[]) => {
    if (shouldLog("info")) console.info(...args);
  },
  warn: async (...args: any[]) => {
    if (shouldLog("warn")) console.warn(...args);
    try {
      await systemCommands.logFrontendError("warn", String(args[0] || ""));
    } catch (e) {
      /* ignore */
    }
  },
  error: async (...args: any[]) => {
    if (shouldLog("error")) console.error(...args);
    try {
      const message = String(args[0] || "");
      const stack = args[1] && args[1].stack ? String(args[1].stack) : undefined;
      await systemCommands.logFrontendError("error", message, stack);
    } catch (e) {
      /* ignore */
    }
  },
};

export function setupGlobalErrorHandlers() {
  if (globalHandlersBound) return;
  globalHandlersBound = true;

  window.addEventListener("error", (ev) => {
    const message = ev?.message || String(ev?.error || "Unknown error");
    const stack = (ev?.error && ev.error.stack) || undefined;
    logger.error(message, { stack });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    const reason = (ev && (ev as any).reason) || "Unhandled rejection";
    const message = reason?.message || String(reason);
    const stack = reason?.stack || undefined;
    logger.error(message, { stack });
  });
}
