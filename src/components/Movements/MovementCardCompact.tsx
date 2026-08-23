import { Icon } from "@iconify/react";

import AccountName from "@/components/General/AccountName";
import AmountText from "@/components/General/AmountText";
import useDate from "@/hooks/useDate";
import { accountsStore } from "@/stores/accountsStore";
import { categoryStore } from "@/stores/categoryStore";
import { MOVEMENT_TYPES } from "@/types/enums";

interface Props {
  movement: Movement;
}

const MovementCardCompact = ({ movement }: Props) => {
  const account = accountsStore.getState().getById(movement.accountId);
  const category = categoryStore.getState().getById(movement.categoryId);

  const { time } = useDate(movement.timestamp || 0);

  if (!category || !account) return null;

  return (
    <a
      href={`/movement?id=${movement.id}`}
      className="focus-ring flex w-full min-w-0 cursor-pointer flex-row items-center justify-between gap-3 rounded-lg border-t border-zinc-200 p-3 transition-colors hover:bg-zinc-100/60 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
    >
      <div className="space-x-2 flex flex-row items-center">
        <div
          className="w-8 aspect-square flex justify-center items-center rounded-md"
          style={{ backgroundColor: category.color }}
        >
          <Icon icon={`iconoir:${category.icon}`} className="text-lg text-white" />
        </div>

        <div className="text-left">
          <p className="text-sm font-medium">{category.name}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400"><AccountName id={account.id} /></p>
        </div>
      </div>

      <div className="flex flex-col items-end">
        <AmountText
          amount={movement.originalAmount}
          tone={movement.typeId === MOVEMENT_TYPES.INCOME ? "income" : movement.typeId === MOVEMENT_TYPES.EXPENSE ? "expense" : "neutral"}
          icon={movement.typeId === MOVEMENT_TYPES.INCOME ? "plus" : movement.typeId === MOVEMENT_TYPES.EXPENSE ? "minus" : "none"}
          format="short"
          className="text-lg!"
        />
        <time className="text-right text-xs text-zinc-500 dark:text-zinc-400">{time}</time>
      </div>
    </a>
  );
};

export default MovementCardCompact;
