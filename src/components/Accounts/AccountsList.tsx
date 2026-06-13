import { useStore } from "zustand";

import { accountsStore } from "@/stores/accountsStore";

import AccountCard from "./AccountCard";

const AccountList = () => {
  const accounts = useStore(accountsStore, (state) => state.accounts);

  return (
    <>
      {accounts.map((account) => (
        <AccountCard key={account.id} {...account} />
      ))}
    </>
  );
};

export default AccountList;
