import type { SelectHTMLAttributes } from "react";
import { useStore } from "zustand";

import { currencyStore } from "@/stores/currencyStore";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  currencyId?: number;
}

const SelectCurrency = ({ currencyId, ...selectProps }: Props) => {
  const currencies = useStore(currencyStore, (state) => state?.currencies) ?? [];

  const defaultClassName = "glass-control w-24 border-l-0 px-2 text-zinc-950 dark:text-zinc-100";

  return (
    <select
      key={currencyId}
      name="currency"
      required
      className={`${selectProps.className ?? defaultClassName}`}
      defaultValue={currencyId}
      {...selectProps}
    >
      {currencies.map((currency) => (
        <option key={currency.id} value={currency.id} className="bg-zinc-100 dark:bg-zinc-800">
          {currency.symbol} {currency.code}
        </option>
      ))}
    </select>
  );
};

export default SelectCurrency;
