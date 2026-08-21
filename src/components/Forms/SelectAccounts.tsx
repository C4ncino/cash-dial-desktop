import { useStore } from "zustand";

import { accountsStore } from "@/stores/accountsStore";

interface Props {
  name: string;
  label: string;
  accountId?: number;
  excludeId?: number;
  excludeCredit?: boolean;
  disabled?: boolean;
  onChange?: (id: number) => void;
}

const SelectAccounts = ({ name, label, accountId, excludeId, excludeCredit, disabled, onChange }: Props) => {
  const accounts = useStore(accountsStore, (state) => state.accounts);

  const activeAccounts = accounts.filter((account) => {
    if (!account.isActive) return false;
    if (account.id === excludeId) return false;
    if (excludeCredit && account.creditInfo !== null) return false;
    return true;
  });

  return (
    <fieldset className="space-y-1">
      <label htmlFor={name} className="text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <select
        key={accountId}
        name={name}
        id={name}
        required
        disabled={disabled}
        className="glass-control w-full rounded px-3 py-2 text-zinc-950 dark:text-zinc-100"
        defaultValue={accountId}
        onChange={(e) => onChange?.(Number(e.target.value))}
      >
        <option value="" className="bg-zinc-100 dark:bg-zinc-800">
          Seleccionar cuenta
        </option>
        {activeAccounts.map((account) => (
          <option key={account.id} value={account.id} className="bg-zinc-100 dark:bg-zinc-800">
            {account.name}
          </option>
        ))}
      </select>
    </fieldset>
  );
};

export default SelectAccounts;
