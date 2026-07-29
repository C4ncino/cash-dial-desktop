import { Icon } from "@iconify/react";

import AmountText from "@/components/General/AmountText";
import useDate from "@/hooks/useDate";
import { accountsStore } from "@/stores/accountsStore";
import { categoryStore } from "@/stores/categoryStore";

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
      className="w-full flex flex-row justify-between items-center p-2 border-t border-zinc-700 cursor-pointer"
    >
      <div className="space-x-2 flex flex-row items-center">
        <div
          className="w-8 aspect-square flex justify-center items-center rounded-md"
          style={{ backgroundColor: category.color }}
        >
          <Icon icon={`iconoir:${category.icon}`} className="text-lg" />
        </div>

        <div className="text-left">
          <p className="text-sm font-medium">{category.name}</p>
          <p className="text-xs text-zinc-400">{account.name}</p>
        </div>
      </div>

      <div className="flex flex-col items-end">
        <AmountText
          type={movement.typeId}
          amount={movement.originalAmount}
          needShort
          className="text-lg!"
        />
        <time className="dark:text-zinc-400 text-xs text-right">{time}</time>
      </div>
    </a>
  );
};

export default MovementCardCompact;
