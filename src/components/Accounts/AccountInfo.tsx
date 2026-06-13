import colors from "tailwindcss/colors";
import { Progress } from "webcoreui/react";
import { useStore } from "zustand";

import MoneyText from "@/components/General/MoneyText";
import SquareIcon from "@/components/General/SquareIcon";
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

  return (
    <>
      <header>
        <div className="flex flex-row gap-3 items-center mb-4">
          <SquareIcon
            className="w-12 h-12"
            backgroundColor={account.type.color}
            icon={account.type.icon}
          />
          <hgroup className="flex flex-col">
            <h1>{account.name}</h1>
            <MoneyText amount={account.balance} currency={currency} className="text-2xl mt-px" />
          </hgroup>
        </div>
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
                <td>{formatNumber(account.balance, 999_999)}</td>
                <td className="text-right">
                  {formatNumber(account.creditInfo.creditLimit - account.balance, 999_999)}
                </td>
              </tr>
            </tbody>
          </table>
          <Progress
            value={(account.balance / account.creditInfo.creditLimit) * 100}
            color={colors.red[500]}
            background={colors.green[600]}
            className="mt-2"
          />
        </section>
      )}
    </>
  );
};

export default AccountInfo;
