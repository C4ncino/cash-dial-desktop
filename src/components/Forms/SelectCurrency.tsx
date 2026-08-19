import type { SelectHTMLAttributes } from "react";
import { useStore } from "zustand";

import { currencyStore } from "@/stores/currencyStore";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  currencyId?: number;
}

const SelectCurrency = ({ currencyId, ...selectProps }: Props) => {
  const currencies = useStore(currencyStore, (state) => state?.currencies) ?? [];

  const defaultClassName = "border border-[#252525] border-l-0 w-24 px-2";

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
        <option key={currency.id} value={currency.id} className="bg-black">
          {currency.symbol} {currency.code}
        </option>
      ))}
    </select>
  );
};

export default SelectCurrency;
