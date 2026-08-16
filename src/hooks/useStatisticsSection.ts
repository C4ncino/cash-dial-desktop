import { useEffect } from "react";
import { useStore } from "zustand";

import { currencyStore } from "@/stores/currencyStore";
import { statisticsStore } from "@/stores/statisticsStore";

export const useStatisticsSection = () => {
  const response = useStore(statisticsStore, (state) => state.response);

  const loading = useStore(statisticsStore, (state) => state.loading);

  const selectedCurrencyId = useStore(statisticsStore, (state) => state.selectedCurrencyId);

  const currencies = useStore(currencyStore, (state) => state.currencies);

  const symbol = currencies.find((currency) => currency.id === selectedCurrencyId)?.symbol;

  useEffect(() => {
    if (!response && !loading) statisticsStore.getState().fetchStatistics();
  }, [loading, response]);

  return { response, loading, symbol };
};
