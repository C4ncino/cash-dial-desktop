import { Icon } from "@iconify/react";

import AccountName from "@/components/General/AccountName";
import AmountText from "@/components/General/AmountText";
import EntityIcon from "@/components/General/EntityIcon";
import useDate from "@/hooks/useDate";
import {
  selectAccountById,
  selectCategoryById,
  useAccounts,
  useCategories,
} from "@/hooks/useStores";
import { MOVEMENT_TYPES } from "@/types/enums";

interface Props {
  movement: Movement;
  showTime?: boolean;
  variant?: "default" | "compact";
}

export default function MovementCard({ movement, showTime, variant = "default" }: Props) {
  const compact = variant === "compact";
  const { dateShort, time } = useDate(movement.timestamp || 0);
  const account = useAccounts(selectAccountById(movement.accountId));
  const toAccount = useAccounts(selectAccountById(movement.toAccountId ?? 0));
  const category = useCategories(selectCategoryById(movement.categoryId));

  if (!category || !account) return null;

  const tone =
    movement.typeId === MOVEMENT_TYPES.INCOME
      ? "income"
      : movement.typeId === MOVEMENT_TYPES.EXPENSE
        ? "expense"
        : "neutral";
  const amountIcon =
    movement.typeId === MOVEMENT_TYPES.INCOME
      ? "plus"
      : movement.typeId === MOVEMENT_TYPES.EXPENSE
        ? "minus"
        : "none";
  const textLength = category.name.length + movement.originalAmount.toString().length;

  return (
    <a
      href={`/movement?id=${movement.id}`}
      className={`focus-ring flex w-full min-w-0 cursor-pointer items-center justify-between gap-3 border-t border-zinc-200 transition-colors hover:bg-zinc-100/60 dark:border-zinc-800 dark:hover:bg-zinc-800/60 ${compact ? "p-3" : "px-4 py-3"}`}
    >
      <div className={`flex min-w-0 items-center ${compact ? "gap-2" : "gap-4"}`}>
        <EntityIcon icon={category.icon} color={category.color} size={compact ? "sm" : "lg"} />
        <div className="min-w-0 text-left">
          <p className={`${compact ? "text-sm" : "mb-0.5 text-xl"} truncate font-medium`}>
            {category.name}
          </p>
          <span
            className={`${compact ? "text-xs" : "gap-2"} flex min-w-0 items-center text-zinc-700 dark:text-zinc-300`}
          >
            <AccountName id={account.id} />
            {!compact && toAccount && (
              <>
                <Icon
                  icon="iconoir:dot-arrow-right"
                  className="size-5 shrink-0"
                  aria-hidden="true"
                />
                <AccountName id={toAccount.id} />
              </>
            )}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <AmountText
          amount={movement.originalAmount}
          tone={tone}
          icon={amountIcon}
          format={compact || textLength > 28 ? "short" : "number"}
          className={compact ? "text-lg" : undefined}
        />
        <time
          dateTime={new Date(movement.timestamp).toISOString()}
          className="text-right text-xs text-zinc-500 dark:text-zinc-400"
        >
          {compact || showTime ? time : dateShort}
        </time>
      </div>
    </a>
  );
}
