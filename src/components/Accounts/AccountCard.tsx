import SquareIcon from "@/components/General/SquareIcon";
import { formatNumber, hyphenateText } from "@/lib/formatters";
import { currencyStore } from "@/stores/currencyStore";

export default function AccountCard(account: Account) {
  const currency = currencyStore.getState().getById(account.currencyId) as Currency;

  return (
    <a
      className="glass-surface h-28 w-48 cursor-pointer rounded-md p-2 px-3 transition-colors hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
      href={`/account?id=${account.id}`}
    >
      <hgroup className="flex flex-row gap-2 mb-1">
        <SquareIcon
          className="w-8 h-8"
          backgroundColor={account.type.color}
          icon={account.type.icon}
        />

        <h2 className="-mt-0.5 line-clamp-2 flex-1 text-left text-xs font-medium uppercase text-zinc-700 dark:text-zinc-300">
          {hyphenateText(account.name, 13).padEnd(25, " ")}
        </h2>
      </hgroup>

      <strong
        className={`text-xl text-right font-medium ${
          account.balance < 0 ? "text-red-600 dark:text-red-400" : "text-zinc-950 dark:text-zinc-100"
        } line-clamp-1`}
      >
        {formatNumber(account.balance, 99999999)}
      </strong>

      <abbr
        className="-mt-1 block text-right text-lg font-light text-zinc-950 no-underline dark:text-zinc-100"
        title={currency.name}
      >
        {currency.code}
      </abbr>
    </a>
  );
}
