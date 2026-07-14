import { Icon } from "@iconify/react";

import AmountText from "@/components/General/AmountText";
import useDate from "@/hooks/useDate";
import type { MOVEMENT_TYPES } from "@/types/enums";

interface Props {
  category: Category;
  currency: Currency;
  movementType: MOVEMENT_TYPES;
  amount: number;
  timestamp: number;
}

const Header = ({ category, currency, movementType, amount, timestamp }: Props) => {
  const { dateLong, time, dateObject } = useDate(timestamp || 0);

  return (
    <header className="flex flex-row gap-4 items-center pb-4 mb-4 border-b border-zinc-400">
      <div
        className="w-14 aspect-square flex justify-center items-center rounded-lg shadow-md"
        style={{ backgroundColor: category?.color || "#52525b" }}
      >
        <Icon
          icon={category ? `iconoir:${category.icon}` : "iconoir:data-transfer-up"}
          className="text-4xl text-white"
        />
      </div>
      <hgroup className="space-y-1">
        <h1 className="hidden">{category.name}</h1>

        <strong className="flex flex-row gap-1">
          <AmountText type={movementType} amount={amount} className="text-4xl" />
          <span className="text-zinc-200 text-xl font-light mt-3">{currency.code}</span>
        </strong>

        <time dateTime={dateObject.toISOString()} className="text-zinc-400 text-sm">
          {dateLong} - {time}
        </time>
      </hgroup>
    </header>
  );
};

export default Header;
