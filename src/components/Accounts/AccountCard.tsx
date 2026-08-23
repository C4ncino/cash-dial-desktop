import SquareIcon from "@/components/General/SquareIcon";
import { formatNumber } from "@/lib/formatters";
import { currencyStore } from "@/stores/currencyStore";

export default function AccountCard(account: Account) {
  const currency = currencyStore.getState().getById(account.currencyId) as Currency;

  return (
    <a
      className="focus-ring glass-surface block min-h-32 w-full min-w-0 cursor-pointer rounded-xl p-4 transition-colors hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
      href={`/account?id=${account.id}`}
    >
      <hgroup className="mb-3 flex min-w-0 flex-row gap-3">
        <SquareIcon
          className="w-8 h-8"
          backgroundColor={account.type.color}
          icon={account.type.icon}
        />

        <h3 className="min-w-0 flex-1 text-left text-sm font-medium uppercase text-zinc-700 line-clamp-2 dark:text-zinc-300">
          {account.name}
        </h3>
      </hgroup>

      <strong
        className={`block truncate text-right text-xl font-medium tabular-nums ${
          account.balance < 0 ? "text-red-600 dark:text-red-400" : "text-zinc-950 dark:text-zinc-100"
        } line-clamp-1`}
      >
        {formatNumber(account.balance, 99999999)}
      </strong>

      <abbr
        className="block text-right text-sm font-light text-zinc-700 no-underline dark:text-zinc-300"
        title={currency.name}
      >
        {currency.code}
      </abbr>
    </a>
  );
}
