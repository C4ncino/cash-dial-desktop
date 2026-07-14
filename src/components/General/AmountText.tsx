import { Icon } from "@iconify/react";

import { formatNumber, formatShortAmount } from "@/lib/formatters";
import { MOVEMENT_TYPES } from "@/types/enums";

interface Props {
  type: MOVEMENT_TYPES;
  amount: number;
  needShort?: boolean;
  className?: string;
}

const AmountText = ({ type, amount, needShort, className }: Props) => {
  return (
    <div
      className={`text-2xl flex flex-row ${type === MOVEMENT_TYPES.INCOME ? "text-green-500" : type === MOVEMENT_TYPES.EXPENSE ? "text-red-500" : "text-white"} ${className}`}
    >
      {type !== MOVEMENT_TYPES.TRANSFER && (
        <Icon
          icon={`iconoir:${type === MOVEMENT_TYPES.INCOME ? "plus" : "minus"}`}
          className="mt-1"
        />
      )}
      <p className="font-semibold">
        {needShort ? formatShortAmount(amount) : formatNumber(amount, 1000)}
      </p>
    </div>
  );
};

export default AmountText;
