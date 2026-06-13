import { Icon } from "@iconify/react";
import { useMemo, useState } from "react";
import { closeModal, toast } from "webcoreui";
import { Input } from "webcoreui/react";
import { useStore } from "zustand";

import SelectCurrency from "@/components/Forms/SelectCurrencies";
import { logger } from "@/lib/logger";
import { accountsStore, createAccountFromData, validate } from "@/stores/accountsStore";
import { editStore } from "@/stores/editStore";
import { ACCOUNT_TYPES, EDIT_TYPES, MODAL_ID } from "@/types/enums";

interface Props {
  modalId: string;
}

const AccountForm = ({ modalId }: Props) => {
  const types = useStore(accountsStore, (state) => state.types);
  const editState = useStore(editStore, (state) => state);

  const [typeId, setTypeId] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const account = useMemo(() => {
    const account =
      typeof editState.id === "number" &&
      editState.type === EDIT_TYPES.ACCOUNT &&
      modalId === MODAL_ID.ACCOUNT.EDIT
        ? accountsStore.getState().getById(editState.id)
        : null;

    setTypeId(account ? account.type.id : null);

    return account;
  }, [editState.id, editState.type, modalId]);

  const onSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    const { valid, errors } = validate(data);

    logger.debug("Account form data:", data);
    logger.warn("Account form validation errors:", errors);

    if (!valid) {
      setErrors(errors);
      return;
    }

    const account = createAccountFromData(data, types.find((t) => t.id === typeId)!);

    console.debug("Is Editing mode:", editState.type === EDIT_TYPES.ACCOUNT);

    if (editState.id && editState.type === EDIT_TYPES.ACCOUNT) {
      accountsStore.getState().update(editState.id, account);
      toast("#account-updated");
    } else {
      accountsStore.getState().add(account);
      toast("#account-created");
    }

    e.target.reset();

    editState.clear();
    closeModal(`#${modalId}`);
  };

  return (
    <form
      className="w-5/6 h-full m-auto space-y-4"
      id="account-form"
      onSubmit={onSubmit}
      onReset={() => setTypeId(account ? account.type.id : null)}
    >
      <fieldset className="space-y-4">
        <Input
          name="name"
          label="Nombre"
          required
          defaultValue={account ? account.name : ""}
          maxLength={25}
          autoComplete="on"
        />

        <label htmlFor="balance" className="text-gray-webui-text">
          Saldo {typeId === ACCOUNT_TYPES.CREDIT ? "Gastado" : ""}
        </label>
        <div className="flex">
          <Input
            type="number"
            name="balance"
            id="balance"
            required
            defaultValue={account ? account.balance : "0.00"}
            step={0.01}
          />
          <SelectCurrency currencyId={account ? account.currencyId : undefined} />
        </div>
      </fieldset>

      <fieldset
        className="flex border border-gray-webui rounded"
        key={typeId === null ? "true" : "false"}
      >
        {types.map((t) => (
          <label
            className="first:rounded-l last:rounded-r border-r last:border-0 border-gray-webui select-none cursor-pointer flex items-center justify-center gap-2 py-2 w-full has-checked:bg-blue-600"
            htmlFor={`${t.name}-${modalId}`}
            key={t.id}
          >
            <Icon icon={`iconoir:${t.icon}`} className="text-white" />
            {t.name}
            <input
              className="hidden"
              type="radio"
              name="type"
              id={`${t.name}-${modalId}`}
              value={t.id}
              defaultChecked={t.id === typeId}
              onChange={(e) => setTypeId(Number(e.target.value))}
            />
          </label>
        ))}
      </fieldset>

      {typeId === ACCOUNT_TYPES.CREDIT && (
        <fieldset id="credit-fields" className="space-y-4">
          <Input
            type="number"
            name="creditLimit"
            label="Límite de Crédito"
            required
            defaultValue={account?.creditInfo?.creditLimit ?? "0.00"}
            min={0}
            step={0.01}
          />

          <div className="flex gap-4">
            <Input
              type="number"
              name="cutoffDay"
              label="Día de Corte"
              required
              defaultValue={account?.creditInfo?.cutoffDay ?? "1"}
              min={1}
              max={31}
              step={1}
            />
            <Input
              type="number"
              name="daysToPay"
              label="Días para pagar"
              required
              defaultValue={account?.creditInfo?.daysToPay ?? "1"}
              min={1}
              max={35}
              step={1}
            />
          </div>
        </fieldset>
      )}

      <p className="text-red-500 text-sm">
        {errors.map((error) => (
          <span key={error}>{error}</span>
        ))}
      </p>

      <menu className="flex justify-end gap-3">
        <li>
          <button
            type="reset"
            className="border-2 border-zinc-200 text-zinc-200 hover:text-black py-2 px-4 rounded hover:bg-zinc-200 hover:cursor-pointer"
          >
            Restaurar
          </button>
        </li>
        <li>
          <button
            type="submit"
            className="border-2 border-green-600 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 hover:border-green-700 hover:cursor-pointer"
          >
            Guardar
          </button>
        </li>
      </menu>
    </form>
  );
};

export default AccountForm;
