import { invoke } from "@tauri-apps/api/core";
import { createStore } from "zustand/vanilla";

import { logger } from "@/lib/logger";

export const currencyStore = createStore<
  CurrencyStore & Omit<Actions<Currency>, "add" | "remove" | "update">
>((set, get) => ({
  currencies: [] as Currency[],

  populate: async () => {
    const currencies = (await invoke("get_currencies")) as Currency[];
    logger.debug("Currencies:", currencies);
    return set({ currencies });
  },

  getById: (id: number) => get().currencies.find((currency) => currency.id === id),
}));
