import { CATEGORY_FUNCTIONS, CURRENCY_FUNCTIONS } from "@/types/enums";
import { invokeCommand } from "./invoke";

export const categoryCommands = {
  getAll: () => invokeCommand<Category[]>(CATEGORY_FUNCTIONS.get),
};

export const currencyCommands = {
  getAll: () => invokeCommand<Currency[]>(CURRENCY_FUNCTIONS.get),
  refreshRates: () => invokeCommand<Currency[]>(CURRENCY_FUNCTIONS.refreshRates),
};
