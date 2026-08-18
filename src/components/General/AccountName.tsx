import { Icon } from "@iconify/react";
import { useStore } from "zustand";

import { accountsStore } from "@/stores/accountsStore";

interface Props {
  id: number;
}

const AccountName = ({ id }: Props) => {
  const account = useStore(accountsStore, (state) =>
    state.accounts.find((item) => item.id === id),
  );

  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon
        icon={`iconoir:${account?.type?.icon ?? "wallet"}`}
        className="h-4 w-4 text-zinc-400"
      />
      {account?.name ?? "—"}
    </span>
  );
};

export default AccountName;
