import { Icon } from "@iconify/react";

import AccountName from "@/components/General/AccountName";
import AmountText from "@/components/General/AmountText";
import useDate from "@/hooks/useDate";
import { accountsStore } from "@/stores/accountsStore";
import { categoryStore } from "@/stores/categoryStore";
import { MOVEMENT_TYPES } from "@/types/enums";

interface Props {
  movement: Movement;
  showTime?: boolean;
}

const MovementCard = ({ movement, showTime }: Props) => {
  const { dateShort, time } = useDate(movement.timestamp || 0);

  const account = accountsStore.getState().getById(movement.accountId);
  const toAccount = accountsStore.getState().getById(movement.toAccountId ?? 0);

  const category = categoryStore.getState().getById(movement.categoryId);

  if (!category || !account) return null;

  const textLength = category.name.length + movement.originalAmount.toString().length;

  return (
    <a
      href={`/movement?id=${movement.id}`}
      className="w-full flex flex-row justify-between items-center py-2 px-4 border-t border-zinc-500 dark:border-zinc-700 cursor-pointer"
    >
      <div className="space-x-4 flex flex-row items-center">
        <div
          className="w-12 aspect-square flex justify-center items-center rounded-md"
          style={{ backgroundColor: category.color }}
        >
          <Icon icon={`iconoir:${category.icon}`} className="text-3xl" />
        </div>

        <div className="text-left">
          <p className="text-xl font-medium mb-0.5">{category.name}</p>
          <span className="flex space-x-2 text-zinc-300">
            <p><AccountName id={account.id} /></p>
            {toAccount && (
              <>
                <Icon icon="iconoir:dot-arrow-right" className="text-2xl" />
                <p><AccountName id={toAccount.id} /></p>
              </>
            )}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end">
        <AmountText
          amount={movement.originalAmount}
          tone={movement.typeId === MOVEMENT_TYPES.INCOME ? "income" : movement.typeId === MOVEMENT_TYPES.EXPENSE ? "expense" : "neutral"}
          icon={movement.typeId === MOVEMENT_TYPES.INCOME ? "plus" : movement.typeId === MOVEMENT_TYPES.EXPENSE ? "minus" : "none"}
          format={textLength > 28 ? "short" : "number"}
        />
        <time className="dark:text-zinc-400 text-xs text-right">{showTime ? time : dateShort}</time>
      </div>
    </a>
  );
};

export default MovementCard;
