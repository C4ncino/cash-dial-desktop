import { invoke } from "@tauri-apps/api/core";
import { createStore } from "zustand/vanilla";

export const currencyStore = createStore<
  CurrencyStore & Omit<Actions<Currency>, "add" | "remove" | "update">
>((set, get) => ({
  currencies: [] as Currency[],

  populate: async () => {
    const currencies = (await invoke("get_currencies")) as Currency[];
    console.log(currencies);
    return set({ currencies });
  },

  getById: (id: number) => get().currencies.find((currency) => currency.id === id),
}));
