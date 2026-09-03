import { createStore } from "zustand/vanilla";

import { logger } from "@/lib/logger";
import { currencyCommands } from "@/services/tauri/referenceData";

export const currencyStore = createStore<
  CurrencyStore & Omit<Actions<Currency>, "add" | "remove" | "update">
>((set, get) => ({
  currencies: [] as Currency[],

  populate: async () => {
    const currencies = await currencyCommands.getAll();
    logger.debug("Currencies:", currencies);
    return set({ currencies });
  },

  refreshRates: async () => {
    const currencies = await currencyCommands.refreshRates();
    logger.debug("Currency rates refreshed:", currencies);
    return set({ currencies });
  },

  getById: (id: number) => get().currencies.find((currency) => currency.id === id),
}));
