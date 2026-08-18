import { useEffect, useMemo, useState } from "react";
import { closeModal, toast } from "webcoreui";
import { Input } from "webcoreui/react";
import { useStore } from "zustand";

import FormActions from "@/components/Forms/FormActions";
import FormErrors from "@/components/Forms/FormErrors";
import SelectAccounts from "@/components/Forms/SelectAccounts";
import SelectCategories from "@/components/Forms/SelectCategories";
import SelectCurrency from "@/components/Forms/SelectCurrencies";
import SelectPlanning from "@/components/Movements/SelectPlanning";
import { logger } from "@/lib/logger";
import { accountsStore } from "@/stores/accountsStore";
import { budgetStore } from "@/stores/budgetStore";
import { editStore } from "@/stores/editStore";
import { createMovementFromData, movementsStore, validateMovement } from "@/stores/movementsStore";
import { planningsStore } from "@/stores/planningsStore";
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
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [selectedPlanningId, setSelectedPlanningId] = useState<number | undefined>();
  const [selectedPlanningOccurrenceId, setSelectedPlanningOccurrenceId] = useState<number | undefined>();

  const selectedPlanning = useStore(
    planningsStore,
    (state) => state.plannings.find((planning) => planning.id === selectedPlanningId),
  );

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
      setCategoryId(movement.categoryId);
    }

    return movement;
  }, [editState.id, editState.type, modalId, config.editType, config.editModalId]);

  const selectedAccount = selectedAccountId
    ? accounts.find((a) => a.id === selectedAccountId)
    : undefined;

  const showInstallments =
    movementType === MOVEMENT_TYPES.EXPENSE && selectedAccount?.type.id === ACCOUNT_TYPES.CREDIT;

  const isTransfer = movementType === MOVEMENT_TYPES.TRANSFER;

  useEffect(() => {
    setSelectedPlanningId(movement?.planningId);
  }, [movement?.planningId]);

  useEffect(() => {
    const handlePlanningMovement = (event: Event) => {
      const detail = (event as CustomEvent<{ planningId?: number; occurrenceId?: number }>).detail;
      if (detail.planningId) setSelectedPlanningId(detail.planningId);
      setSelectedPlanningOccurrenceId(detail.occurrenceId);
    };

    window.addEventListener("planning:movement-create", handlePlanningMovement);
    return () => window.removeEventListener("planning:movement-create", handlePlanningMovement);
  }, []);

  const onSubmit = async (e: React.SubmitEvent) => {
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

    try {
      if (editState.id && editState.type === config.editType) {
        const updateResult = movementsStore.getState().update(editState.id, movementData) as unknown as Promise<void> | undefined;
        if (updateResult && typeof (updateResult as Promise<void>).then === "function") {
          await updateResult;
        }

        budgetStore.getState().refreshAffected(movementData.categoryId);

        toast(config.toastUpdated);
      } else {
        const addResult = movementsStore.getState().add(movementData) as unknown as Promise<Movement> | undefined;
        let createdMovement: Movement | undefined;
        if (addResult && typeof (addResult as Promise<void>).then === "function") {
          createdMovement = await addResult;
        }

        if (movementData.planningId && selectedPlanningOccurrenceId) {
          window.dispatchEvent(new CustomEvent("planning:occurrence-updated", {
            detail: { planningId: movementData.planningId, occurrenceId: selectedPlanningOccurrenceId, movementId: createdMovement?.id },
          }));
        }

        budgetStore.getState().refreshAffected(movementData.categoryId, movement?.categoryId);

        toast(config.toastCreated);
      }

      accountsStore.getState().updateBalance(movementData.accountId, movementData.toAccountId);

      (e.target as HTMLFormElement).reset();
      setErrors([]);
      setSelectedAccountId(undefined);
      setSelectedPlanningId(undefined);
      setSelectedPlanningOccurrenceId(undefined);
      editState.clear();
      closeModal(`#${modalId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrors([message]);
    }
  };

  return (
    <form
      className="w-5/6 h-full m-auto space-y-4 bg-zinc-950"
      id={config.formId}
      onSubmit={onSubmit}
      onReset={() => {
        setSelectedAccountId(movement?.accountId);
        setCategoryId(movement?.categoryId);
        setErrors([]);
      }}
    >
      <fieldset className="space-y-4">
        <label htmlFor="amount" className="text-gray-webui-text">
          Monto
        </label>
        <div className="flex">
          <Input
            key={`amount-${movement?.id ?? selectedPlanning?.id ?? "new"}`}
            type="number"
            name="amount"
            id="amount"
            required
            value={movement ? movement.originalAmount : selectedPlanning?.amount ?? "0.00"}
            min={0.01}
            step={0.01}
          />
          <SelectCurrency
            currencyId={selectedPlanning?.currencyId ?? movement?.currencyId}
          />
        </div>
      </fieldset>

      <SelectAccounts
        name="accountId"
        label={config.accountLabel}
        accountId={selectedPlanning?.accountId ?? movement?.accountId}
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

      {!isTransfer && (
        <SelectPlanning
          typeId={movementType}
          planningId={selectedPlanningId}
          onChange={(id, planning) => {
            setSelectedPlanningId(id);
            setSelectedAccountId(planning?.accountId);
            setCategoryId(planning?.categoryId);
          }}
        />
      )}

      {!isTransfer && (
        <SelectCategories
          categoryId={selectedPlanning?.categoryId ?? categoryId}
          rootCategoryId={selectedPlanning?.categoryId}
          onChange={(id) => setCategoryId(id)}
        />
      )}

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
