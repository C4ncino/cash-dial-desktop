import { useEffect, useMemo, useState } from "react";
import { closeModal, toast } from "webcoreui";
import { Input } from "webcoreui/react";
import { useStore } from "zustand";

import FormActions from "@/components/Forms/FormActions";
import FormErrors from "@/components/Forms/FormErrors";
import SelectAccounts from "@/components/Forms/SelectAccounts";
import SelectCategories from "@/components/Forms/SelectCategories";
import SelectCurrency from "@/components/Forms/SelectCurrency";
import SelectPlanning from "@/components/Movements/SelectPlanning";
import useMovementCurrencyConversion from "@/hooks/useMovementCurrencyConversion";
import useSubmissionGuard from "@/hooks/useSubmissionGuard";
import { logger } from "@/lib/logger";
import { accountsStore } from "@/stores/accountsStore";
import { budgetStore } from "@/stores/budgetStore";
import { currencyStore } from "@/stores/currencyStore";
import { editStore } from "@/stores/editStore";
import { createMovementFromData, validateMovement } from "@/lib/forms/movement";
import { movementsStore } from "@/stores/movementsStore";
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
  const currencies = useStore(currencyStore, (state) => state.currencies) ?? [];

  const [errors, setErrors] = useState<string[]>([]);
  const { submitting, begin, finish, isMounted } = useSubmissionGuard();
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [selectedToAccountId, setSelectedToAccountId] = useState<number | undefined>();
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [selectedPlanningId, setSelectedPlanningId] = useState<number | undefined>();
  const [selectedPlanningOccurrenceId, setSelectedPlanningOccurrenceId] = useState<
    number | undefined
  >();

  const selectedPlanning = useStore(planningsStore, (state) =>
    state.plannings.find((planning) => planning.id === selectedPlanningId),
  );

  const config = MOVEMENT_CONFIG[movementType as keyof typeof MOVEMENT_CONFIG];

  const movement = useMemo(() => {
    const movement =
      typeof editState.id === "number" &&
      editState.type === config.editType &&
      modalId === config.editModalId
        ? movementsStore.getState().getById(editState.id)
        : null;

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
    setSelectedToAccountId(movement?.toAccountId);
  }, [movement?.id]);

  const selectedToAccount = selectedToAccountId
    ? accounts.find((a) => a.id === selectedToAccountId)
    : undefined;

  const {
    setSelectedCurrencyId,
    originalAmount,
    setOriginalAmount,
    accountAmount,
    onAccountAmountChange,
    movementCurrencyId,
    accountCurrency,
    hasCurrencyConversion,
    applyEcbRate,
    resetCurrencyConversion,
    restoreCurrencyConversion,
  } = useMovementCurrencyConversion({
    currencies,
    movement,
    selectedPlanning,
    selectedAccount,
    selectedToAccount,
    isTransfer,
  });

  useEffect(() => {
    if (!movement) return;

    setSelectedAccountId(movement.accountId);
    setCategoryId(movement.categoryId);
    setSelectedToAccountId(movement.toAccountId);
  }, [movement?.id, movement?.accountId, movement?.categoryId, movement?.toAccountId]);

  useEffect(() => {
    const handlePlanningMovement = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          planningId?: number;
          occurrenceId?: number;
          amount?: number;
        }>
      ).detail;
      if (isTransfer) return;
      if (detail.planningId) setSelectedPlanningId(detail.planningId);
      setSelectedPlanningOccurrenceId(detail.occurrenceId);

      if (typeof detail.amount === "number" && Number.isFinite(detail.amount)) {
        setOriginalAmount(String(detail.amount));
      }
    };

    window.addEventListener("planning:movement-create", handlePlanningMovement);
    return () => window.removeEventListener("planning:movement-create", handlePlanningMovement);
  }, [isTransfer]);

  const onSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
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

    if (!begin()) return;

    try {
      const isEditing = Boolean(editState.id && editState.type === config.editType);
      if (editState.id && editState.type === config.editType) {
        await movementsStore.getState().update(editState.id, movementData);
        await budgetStore.getState().refreshAffected(movementData.categoryId);
      } else {
        const createdMovement = await movementsStore.getState().add(movementData);

        if (movementData.planningId && selectedPlanningOccurrenceId) {
          window.dispatchEvent(
            new CustomEvent("planning:occurrence-updated", {
              detail: {
                planningId: movementData.planningId,
                occurrenceId: selectedPlanningOccurrenceId,
                movementId: createdMovement?.id,
              },
            }),
          );
        }

        await budgetStore.getState().refreshAffected(movementData.categoryId, movement?.categoryId);
      }

      await accountsStore
        .getState()
        .updateBalance(movementData.accountId, movementData.toAccountId);

      if (!isMounted()) return;
      toast(isEditing ? config.toastUpdated : config.toastCreated);
      form.reset();
      setErrors([]);
      setSelectedAccountId(undefined);
      setSelectedToAccountId(undefined);
      setSelectedPlanningId(undefined);
      setSelectedPlanningOccurrenceId(undefined);
      resetCurrencyConversion();
      editState.clear();
      closeModal(`#${modalId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isMounted()) setErrors([message]);
    } finally {
      finish();
    }
  };

  return (
    <form
      className="mx-auto box-border w-full max-w-lg space-y-4 p-4 sm:p-6"
      id={config.formId}
      onSubmit={onSubmit}
      onReset={() => {
        setSelectedAccountId(movement?.accountId);
        setSelectedToAccountId(movement?.toAccountId);
        setCategoryId(movement?.categoryId);
        setSelectedPlanningId(movement?.planningId);
        setSelectedPlanningOccurrenceId(undefined);
        restoreCurrencyConversion();
        setErrors([]);
      }}
    >
      <fieldset className="space-y-4">
        <label htmlFor="amount" className="text-zinc-700 dark:text-zinc-300">
          Monto
        </label>
        <div className="flex">
          <Input
            type="number"
            name="amount"
            id="amount"
            required
            value={originalAmount}
            onChange={(event) => {
              setOriginalAmount(event.currentTarget.value);
            }}
            min={0.01}
            step={0.01}
          />
          <SelectCurrency
            currencyId={movementCurrencyId}
            value={movementCurrencyId}
            disabled={Boolean(selectedPlanning) || isTransfer}
            onChange={(event) => {
              setSelectedCurrencyId(Number(event.currentTarget.value));
            }}
          />
          {(Boolean(selectedPlanning) || isTransfer) && (
            <input type="hidden" name="currency" value={movementCurrencyId} readOnly />
          )}
        </div>
        {hasCurrencyConversion && (
          <>
            <label htmlFor="accountAmount" className="text-zinc-700 dark:text-zinc-300">
              {`Monto en ${accountCurrency?.code ?? "cuenta"}`}
            </label>
            <div className="flex">
              <Input
                type="number"
                name="accountAmount"
                id="accountAmount"
                required
                value={accountAmount}
                min={0.01}
                step={0.01}
                onChange={(event) => {
                  onAccountAmountChange(event.currentTarget.value);
                }}
              />
              <button
                type="button"
                className="border border-l-0 border-zinc-300 px-2 text-xs text-blue-600 dark:border-zinc-700 dark:text-blue-400"
                onClick={applyEcbRate}
              >
                Auto Completar
              </button>
            </div>
          </>
        )}
      </fieldset>

      <SelectAccounts
        name="accountId"
        label={config.accountLabel}
        accountId={selectedPlanning?.accountId ?? movement?.accountId}
        onChange={(id) => setSelectedAccountId(id)}
        excludeCredit={isTransfer}
      />

      {isTransfer && (
        <SelectAccounts
          name="toAccountId"
          label="Cuenta Destino"
          accountId={movement?.toAccountId}
          excludeId={selectedAccountId}
          onChange={(id) => setSelectedToAccountId(id)}
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

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      <FormActions disabled={submitting} />
    </form>
  );
};

export default MovementForm;
