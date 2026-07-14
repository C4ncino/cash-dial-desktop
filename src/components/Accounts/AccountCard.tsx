import SquareIcon from "@/components/General/SquareIcon";
import { formatNumber, hyphenateText } from "@/lib/formatters";
import { currencyStore } from "@/stores/currencyStore";

export default function AccountCard(account: Account) {
  const currency = currencyStore.getState().getById(account.currencyId) as Currency;

  return (
    <a
      className="h-28 w-48 bg-zinc-100 dark:bg-zinc-950 rounded-md p-2 px-3 shadow-lg account-card cursor-pointer"
      href={`/account?id=${account.id}`}
    >
      <hgroup className="flex flex-row gap-2 mb-1">
        <SquareIcon
          className="w-8 h-8"
          backgroundColor={account.type.color}
          icon={account.type.icon}
        />

        <h2 className="uppercase text-xs text-left font-medium text-zinc-600 dark:text-zinc-400 flex-1 -mt-0.5 line-clamp-2">
          {hyphenateText(account.name, 13).padEnd(25, " ")}
        </h2>
      </hgroup>

      <strong
        className={`text-xl text-right font-medium ${
          account.balance < 0 ? "text-red-500" : "dark:text-white"
        } line-clamp-1`}
      >
        {formatNumber(account.balance, 99999999)}
      </strong>

      <abbr
        className="text-right text-lg font-light dark:text-white -mt-1 block no-underline"
        title={currency.name}
      >
        {currency.code}
      </abbr>
    </a>
  );
}
