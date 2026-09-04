import colors from "tailwindcss/colors";
import { Progress } from "webcoreui/react";
import { useStore } from "zustand";

import AccountNextPayment from "@/components/Accounts/AccountNextPayment";
import AmountText from "@/components/General/AmountText";
import EntityIcon from "@/components/General/EntityIcon";
import StatusBadge from "@/components/General/StatusBadge";
import { getAccountDisplayBalance } from "@/lib/accountBalance";
import { formatNumber } from "@/lib/formatters";
import { accountsStore } from "@/stores/accountsStore";
import { currencyStore } from "@/stores/currencyStore";

const AccountInfo = () => {
  const id =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("id"))
      : null;

  const account = useStore(accountsStore, (state) =>
    state.accounts.find((account) => account.id === id),
  );

  if (!account) return;

  const currency = currencyStore.getState().getById(account.currencyId) as Currency;
  const displayBalance = getAccountDisplayBalance(account);

  return (
    <>
      <header className="mb-4 flex flex-row items-center gap-3">
        <EntityIcon size="lg" color={account.type.color} icon={account.type.icon} />
        <hgroup className="flex flex-col">
          <div className="flex flex-row items-center gap-2">
            <h1>{account.name}</h1>
            <StatusBadge tone={account.isActive ? "success" : "warning"} className="w-fit">
              {account.isActive ? "Activa" : "Inactiva"}
            </StatusBadge>
          </div>
          <AmountText
            amount={displayBalance}
            currency={currency}
            format="currency"
            inline
            className="text-2xl mt-px"
          />
        </hgroup>
      </header>
      {account.creditInfo && (
        <section>
          <table className="w-full">
            <thead>
              <tr>
                <th scope="col" className="text-left pb-1">
                  Crédito usado
                </th>
                <th scope="col" className="text-right pb-1">
                  Crédito disponible
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{formatNumber(displayBalance, 999_999)}</td>
                <td className="text-right">{formatNumber(account.balance, 999_999)}</td>
              </tr>
            </tbody>
          </table>
          <Progress
            value={(displayBalance / account.creditInfo.creditLimit) * 100}
            color={colors.red[500]}
            background={colors.green[600]}
            className="mt-2"
          />
        </section>
      )}
      {account.creditInfo && <AccountNextPayment accountId={account.id} />}
    </>
  );
};

export default AccountInfo;
