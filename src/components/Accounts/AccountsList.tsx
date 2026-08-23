import { useStore } from "zustand";

import { accountsStore } from "@/stores/accountsStore";

import AccountCard from "./AccountCard";

const AccountList = () => {
  const accounts = useStore(accountsStore, (state) => state.accounts);

  if (!accounts.length) {
    return (
      <div className="glass-surface rounded-xl border-dashed p-8 text-center">
        <p className="font-medium text-zinc-700 dark:text-zinc-300">Aún no tienes cuentas.</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Añade una cuenta para comenzar a registrar tus movimientos.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4">
      {accounts.map((account) => (
        <li key={account.id} className="min-w-0">
          <AccountCard {...account} />
        </li>
      ))}
    </ul>
  );
};

export default AccountList;
