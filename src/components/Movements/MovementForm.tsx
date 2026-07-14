import { useMemo, useState } from "react";
import { closeModal, toast } from "webcoreui";
import { Input } from "webcoreui/react";
import { useStore } from "zustand";

import FormActions from "@/components/Forms/FormActions";
import FormErrors from "@/components/Forms/FormErrors";
import SelectAccounts from "@/components/Forms/SelectAccounts";
import SelectCategories from "@/components/Forms/SelectCategories";
import SelectCurrency from "@/components/Forms/SelectCurrencies";
import { logger } from "@/lib/logger";
import { accountsStore } from "@/stores/accountsStore";
import { editStore } from "@/stores/editStore";
import { createMovementFromData, movementsStore, validateMovement } from "@/stores/movementsStore";
import { ACCOUNT_TYPES, EDIT_TYPES, MODAL_ID, MOVEMENT_TYPES } from "@/types/enums";

interface Props {
  modalId: string;
  movementType: number;
}

const MOVEMENT_CONFIG = {
  [MOVEMENT_TYPES.INCOME]: {
    editType: EDIT_TYPES.INCOME,
    createModalId: MODAL_ID.MOVEMENT.INCOME.CREATE,
    editModalId: MODAL_ID.MOVEMENT.INCOME.EDIT,
    accountLabel: "Cuenta Destino",
    toastCreated: "#income-created",
    toastUpdated: "#income-updated",
    formId: "income-form",
  },
  [MOVEMENT_TYPES.EXPENSE]: {
    editType: EDIT_TYPES.EXPENSE,
    createModalId: MODAL_ID.MOVEMENT.EXPENSE.CREATE,
    editModalId: MODAL_ID.MOVEMENT.EXPENSE.EDIT,
    accountLabel: "Cuenta Origen",
    toastCreated: "#expense-created",
    toastUpdated: "#expense-updated",
    formId: "expense-form",
  },
  [MOVEMENT_TYPES.TRANSFER]: {
    editType: EDIT_TYPES.TRANSFER,
    createModalId: MODAL_ID.MOVEMENT.TRANSFER.CREATE,
    editModalId: MODAL_ID.MOVEMENT.TRANSFER.EDIT,
    accountLabel: "Cuenta Origen",
    toastCreated: "#transfer-created",
    toastUpdated: "#transfer-updated",
    formId: "transfer-form",
  },
} as const;

const formatDate = (timestamp: number) => {
  const d = new Date(timestamp);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatTime = (timestamp: number) => {
  const d = new Date(timestamp);
  return d.toTimeString().slice(0, 5);
};

const MovementForm = ({ modalId, movementType }: Props) => {
  const editState = useStore(editStore, (state) => state);
  const accounts = useStore(accountsStore, (state) => state.accounts);

  const [errors, setErrors] = useState<string[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();

  const config = MOVEMENT_CONFIG[movementType as keyof typeof MOVEMENT_CONFIG];

  const movement = useMemo(() => {
    const movement =
      typeof editState.id === "number" &&
      editState.type === config.editType &&
      modalId === config.editModalId
        ? movementsStore.getState().getById(editState.id)
        : null;

    if (movement) {
      setSelectedAccountId(movement.accountId);
    }

    return movement;
  }, [editState.id, editState.type, modalId, config.editType, config.editModalId]);

  const selectedAccount = selectedAccountId
    ? accounts.find((a) => a.id === selectedAccountId)
    : undefined;

  const showInstallments =
    movementType === MOVEMENT_TYPES.EXPENSE && selectedAccount?.type.id === ACCOUNT_TYPES.CREDIT;

  const isTransfer = movementType === MOVEMENT_TYPES.TRANSFER;

  const onSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    if (isTransfer) data.categoryId = "0";

    const { valid, errors } = validateMovement(data, movementType);

    logger.debug("Movement form data:", data);
    logger.warn("Movement form validation errors:", errors);

    if (!valid) {
      setErrors(errors);
      return;
    }

    const account = accountsStore.getState().getById(Number(data.accountId));

    const movementData = createMovementFromData(
      data,
      movementType,
      account?.type.id === ACCOUNT_TYPES.CREDIT,
    );

    if (editState.id && editState.type === config.editType) {
      movementsStore.getState().update(editState.id, movementData);
      toast(config.toastUpdated);
    } else {
      movementsStore.getState().add(movementData);
      toast(config.toastCreated);
    }

    accountsStore.getState().updateBalance(movementData.accountId, movementData.toAccountId);

    (e.target as HTMLFormElement).reset();
    setErrors([]);
    setSelectedAccountId(undefined);
    editState.clear();
    closeModal(`#${modalId}`);
  };

  return (
    <form
      className="w-5/6 h-full m-auto space-y-4 bg-zinc-950"
      id={config.formId}
      onSubmit={onSubmit}
      onReset={() => {
        setSelectedAccountId(movement?.accountId);
        setErrors([]);
      }}
    >
      <fieldset className="space-y-4">
        <label htmlFor="amount" className="text-gray-webui-text">
          Monto
        </label>
        <div className="flex">
          <Input
            type="number"
            name="amount"
            id="amount"
            required
            value={movement ? movement.originalAmount : "0.00"}
            min={0.01}
            step={0.01}
          />
          <SelectCurrency currencyId={movement?.currencyId} />
        </div>
      </fieldset>

      <SelectAccounts
        name="accountId"
        label={config.accountLabel}
        accountId={movement?.accountId}
        onChange={(id) => setSelectedAccountId(id)}
      />

      {isTransfer && (
        <SelectAccounts
          name="toAccountId"
          label="Cuenta Destino"
          accountId={movement?.toAccountId}
          excludeId={selectedAccountId}
        />
      )}

      {!isTransfer && <SelectCategories categoryId={movement?.categoryId} />}

      <fieldset className="flex gap-4">
        <Input
          type="date"
          name="date"
          label="Fecha"
          required
          value={movement ? formatDate(movement.timestamp) : formatDate(Date.now())}
        />
        <Input
          type="time"
          name="time"
          label="Hora"
          required
          value={movement ? formatTime(movement.timestamp) : formatTime(Date.now())}
        />
      </fieldset>

      {showInstallments && (
        <Input
          type="number"
          name="installments"
          label="Mensualidades (opcional)"
          value={movement?.installments ?? ""}
          min={1}
          max={48}
          step={1}
        />
      )}

      <Input
        name="description"
        label="Descripción (opcional)"
        value={movement?.description ?? ""}
        maxLength={100}
      />

      <FormErrors errors={errors} />
      <FormActions />
    </form>
  );
};

export default MovementForm;
