import { useStore } from "zustand";

import { currencyStore } from "@/stores/currencyStore";

interface Props {
  currencyId?: number;
}

const SelectCurrency = ({ currencyId }: Props) => {
  const currencies = useStore(currencyStore, (state) => state.currencies);

  return (
    <select
      key={currencyId}
      name="currency"
      required
      className="border border-[#252525] border-l-0 w-24 px-2"
      defaultValue={currencyId}
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
