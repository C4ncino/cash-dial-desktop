import { invokeCommand } from "./invoke";

export const systemCommands = {
  getInitializeState: () => invokeCommand<boolean>("get_initialize_state"),
  initialize: () => invokeCommand<void>("initialize"),
  logFrontendError: (level: "warn" | "error", message: string, stack?: string) =>
    invokeCommand<void>("log_frontend_error", { level, message, stack }),
};
