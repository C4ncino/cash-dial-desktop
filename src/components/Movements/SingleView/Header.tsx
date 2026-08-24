import { Icon } from "@iconify/react";

import AmountText from "@/components/General/AmountText";
import useDate from "@/hooks/useDate";
import { MOVEMENT_TYPES } from "@/types/enums";

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
    <header className="mb-4 flex flex-row items-center gap-4 border-b border-zinc-400 pb-4 dark:border-zinc-600">
      <div
        className="w-14 aspect-square flex justify-center items-center rounded-lg shadow-md"
        style={{ backgroundColor: category?.color || "#52525b" }}
      >
        <Icon
          icon={category ? `iconoir:${category.icon}` : "iconoir:data-transfer-up"}
          className="text-4xl text-zinc-50"
        />
      </div>
      <hgroup className="space-y-1">
        <h1 className="hidden">{category.name}</h1>

        <strong className="flex flex-row gap-1">
          <AmountText
            amount={amount}
            tone={
              movementType === MOVEMENT_TYPES.INCOME
                ? "income"
                : movementType === MOVEMENT_TYPES.EXPENSE
                  ? "expense"
                  : "neutral"
            }
            icon={
              movementType === MOVEMENT_TYPES.INCOME
                ? "plus"
                : movementType === MOVEMENT_TYPES.EXPENSE
                  ? "minus"
                  : "none"
            }
            className="text-4xl"
          />
          <span className="mt-3 text-xl font-light text-zinc-700 dark:text-zinc-300">
            {currency.code}
          </span>
        </strong>

        <time
          dateTime={dateObject.toISOString()}
          className="text-sm text-zinc-500 dark:text-zinc-400"
        >
          {dateLong} - {time}
        </time>
      </hgroup>
    </header>
  );
};

export default Header;
