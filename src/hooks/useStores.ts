import { useStore } from "zustand";

import { accountsStore } from "@/stores/accountsStore";
import { budgetStore } from "@/stores/budgetStore";
import { categoryStore } from "@/stores/categoryStore";
import { currencyStore } from "@/stores/currencyStore";
import { editStore } from "@/stores/editStore";
import { movementsStore } from "@/stores/movementsStore";
import { planningsStore } from "@/stores/planningsStore";
import { statisticsStore } from "@/stores/statisticsStore";

type StoreState<Store> = Store extends { getState: () => infer State } ? State : never;
type Selector<Store, Result> = (state: StoreState<Store>) => Result;

export const useAccounts = <Result>(selector: Selector<typeof accountsStore, Result>) =>
  useStore(accountsStore, selector) ?? selector(accountsStore.getState());
export const useBudgets = <Result>(selector: Selector<typeof budgetStore, Result>) =>
  useStore(budgetStore, selector) ?? selector(budgetStore.getState());
export const useCategories = <Result>(selector: Selector<typeof categoryStore, Result>) =>
  useStore(categoryStore, selector) ?? selector(categoryStore.getState());
export const useCurrencies = <Result>(selector: Selector<typeof currencyStore, Result>) =>
  useStore(currencyStore, selector) ?? selector(currencyStore.getState());
export const useEditState = <Result>(selector: Selector<typeof editStore, Result>) =>
  useStore(editStore, selector) ?? selector(editStore.getState());
export const useMovements = <Result>(selector: Selector<typeof movementsStore, Result>) =>
  useStore(movementsStore, selector) ?? selector(movementsStore.getState());
export const usePlannings = <Result>(selector: Selector<typeof planningsStore, Result>) =>
  useStore(planningsStore, selector) ?? selector(planningsStore.getState());
export const useStatistics = <Result>(selector: Selector<typeof statisticsStore, Result>) =>
  useStore(statisticsStore, selector) ?? selector(statisticsStore.getState());

export const selectAccountById = (id: number) =>
  (state: StoreState<typeof accountsStore>) => state.getById?.(id) ?? state.accounts?.find((item) => item.id === id);
export const selectCategoryById = (id: number) =>
  (state: StoreState<typeof categoryStore>) => state.getById?.(id) ?? state.categories?.find((item) => item.id === id);
export const selectCurrencyById = (id: number) =>
  (state: StoreState<typeof currencyStore>) => state.getById?.(id) ?? state.currencies?.find((item) => item.id === id);
