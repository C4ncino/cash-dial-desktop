import { useMemo, useState } from "react";
import { closeModal, toast } from "webcoreui";
import { Input } from "webcoreui/react";
import { useStore } from "zustand";

import FormActions from "@/components/Forms/FormActions";
import FormErrors from "@/components/Forms/FormErrors";
import SegmentedControl from "@/components/Forms/SegmentedControl";
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

  const onSubmit = async (e: React.SubmitEvent) => {
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

    const type = types.find((t) => t.id === typeId);

    if (!type) {
      setErrors(["Ocurrió un error al crear la cuenta"]);
      logger.error(`Account type ${typeId} not found`);

      return;
    }

    const account = createAccountFromData(data, type);

    console.debug("Is Editing mode:", editState.type === EDIT_TYPES.ACCOUNT);

    if (editState.id && editState.type === EDIT_TYPES.ACCOUNT) {
      await accountsStore.getState().update(editState.id, account);
      toast("#account-updated");
    } else {
      await accountsStore.getState().add(account);
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
          value={account ? account.name : ""}
          maxLength={25}
          autoComplete="on"
          required
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
            value={account ? account.balance : "0.00"}
            step={0.01}
          />
          <SelectCurrency currencyId={account ? account.currencyId : undefined} />
        </div>
      </fieldset>

      <SegmentedControl items={types} modalId={modalId} value={typeId} onChange={setTypeId} />

      {typeId === ACCOUNT_TYPES.CREDIT && (
        <fieldset id="credit-fields" className="space-y-4">
          <Input
            type="number"
            name="creditLimit"
            label="Límite de Crédito"
            required
            value={account?.creditInfo?.creditLimit ?? "0.00"}
            min={0}
            step={0.01}
          />

          <div className="flex gap-4">
            <Input
              type="number"
              name="cutoffDay"
              label="Día de Corte"
              required
              value={account?.creditInfo?.cutoffDay ?? "1"}
              min={1}
              max={31}
              step={1}
            />
            <Input
              type="number"
              name="daysToPay"
              label="Días para pagar"
              required
              value={account?.creditInfo?.daysToPay ?? "1"}
              min={1}
              max={35}
              step={1}
            />
          </div>
        </fieldset>
      )}

      <FormErrors errors={errors} />
      <FormActions />
    </form>
  );
};

export default AccountForm;
