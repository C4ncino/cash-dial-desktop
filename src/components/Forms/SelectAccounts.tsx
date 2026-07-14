import { useStore } from "zustand";

import { accountsStore } from "@/stores/accountsStore";

interface Props {
  name: string;
  label: string;
  accountId?: number;
  excludeId?: number;
  onChange?: (id: number) => void;
}

const SelectAccounts = ({ name, label, accountId, excludeId, onChange }: Props) => {
  const accounts = useStore(accountsStore, (state) => state.accounts);

  const activeAccounts = accounts.filter(
    (account) => account.isActive && account.id !== excludeId,
  );

  return (
    <fieldset className="space-y-1">
      <label htmlFor={name} className="text-gray-webui-text">
        {label}
      </label>
      <select
        key={accountId}
        name={name}
        id={name}
        required
        className="w-full border border-[#252525] bg-transparent rounded px-3 py-2"
        defaultValue={accountId}
        onChange={(e) => onChange?.(Number(e.target.value))}
      >
        <option value="" className="bg-black">
          Seleccionar cuenta
        </option>
        {activeAccounts.map((account) => (
          <option key={account.id} value={account.id} className="bg-black">
            {account.name}
          </option>
        ))}
      </select>
    </fieldset>
  );
};

export default SelectAccounts;
