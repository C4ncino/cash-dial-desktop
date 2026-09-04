import AmountText from "@/components/General/AmountText";
import EntityIcon from "@/components/General/EntityIcon";
import InteractiveCard from "@/components/General/InteractiveCard";
import StatusBadge from "@/components/General/StatusBadge";
import { selectCurrencyById, useCurrencies } from "@/hooks/useStores";
import { getAccountDisplayBalance } from "@/lib/accountBalance";

export default function AccountCard(account: Account) {
  const currency = useCurrencies(selectCurrencyById(account.currencyId));
  const displayBalance = getAccountDisplayBalance(account);

  return (
    <InteractiveCard
      className={`min-h-32 cursor-pointer ${account.isActive ? "" : "opacity-70 grayscale-35"}`}
      href={`/account?id=${account.id}`}
    >
      <hgroup className="mb-3 flex min-w-0 flex-row gap-3">
        <EntityIcon size="sm" color={account.type.color} icon={account.type.icon} />

        <h3 className="min-w-0 flex-1 text-left text-sm font-medium uppercase text-zinc-700 line-clamp-2 dark:text-zinc-300">
          {account.name}
        </h3>
        {!account.isActive && <StatusBadge tone="warning">Inactiva</StatusBadge>}
      </hgroup>

      <AmountText
        amount={displayBalance}
        maximum={99999999}
        tone={!account.creditInfo && displayBalance < 0 ? "expense" : "neutral"}
        className="flex w-full justify-end text-xl"
        amountClassName="truncate font-medium"
      />

      <abbr
        className="block text-right text-sm font-light text-zinc-700 no-underline dark:text-zinc-300"
        title={currency?.name}
      >
        {currency?.code ?? "—"}
      </abbr>
    </InteractiveCard>
  );
}
