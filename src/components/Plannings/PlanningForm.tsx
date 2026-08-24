import { useEffect, useMemo, useState } from "react";
import { closeModal, toast } from "webcoreui";
import { Input } from "webcoreui/react";
import { useStore } from "zustand";

import FormActions from "@/components/Forms/FormActions";
import FormErrors from "@/components/Forms/FormErrors";
import SelectAccounts from "@/components/Forms/SelectAccounts";
import SelectCategories from "@/components/Forms/SelectCategories";
import SelectCurrency from "@/components/Forms/SelectCurrency";
import PlanningRecurrenceForm from "@/components/Plannings/PlanningRecurrenceForm";
import useSubmissionGuard from "@/hooks/useSubmissionGuard";
import { createPlanningRequest, validatePlanningForm } from "@/lib/forms/planning";
import { logger } from "@/lib/logger";
import { accountsStore } from "@/stores/accountsStore";
import { editStore } from "@/stores/editStore";
import { planningsStore } from "@/stores/planningsStore";
import {
  ACCOUNT_TYPES,
  EDIT_TYPES,
  MODAL_ID,
  MOVEMENT_TYPES,
  PLANNINGS_RECURRING_TYPES,
} from "@/types/enums";

interface Props {
  modalId: string;
  formId?: string;
}

const PlanningForm = ({ modalId, formId = modalId }: Props) => {
  const editState = useStore(editStore, (s) => s);
  const accounts = useStore(accountsStore, (s) => s?.accounts) ?? [];

  const [errors, setErrors] = useState<string[]>([]);
  const { submitting, begin, finish, isMounted } = useSubmissionGuard();
  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState<number>(MOVEMENT_TYPES.EXPENSE);
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [amount, setAmount] = useState<string>("0.00");
  const [currencyId, setCurrencyId] = useState<number | undefined>();

  // Recurrence rule fields
  const [recurringTypeId, setRecurringTypeId] = useState<number>(PLANNINGS_RECURRING_TYPES.MONTHLY);
  const [intervalStep, setIntervalStep] = useState<number>(1);
  const [startDate, setStartDate] = useState<number>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });
  const [endDate, setEndDate] = useState<number | null>(null);
  const [weekDays, setWeekDays] = useState<number[]>([]);
  const [monthDays, setMonthDays] = useState<number[]>([15]);
  const [yearDays, setYearDays] = useState<PlanningYearDay[]>([]);

  const isEditing =
    typeof editState?.id === "number" &&
    editState?.type === EDIT_TYPES.PLANNING &&
    modalId === MODAL_ID.PLANNING.EDIT;

  const planning = useMemo(() => {
    if (isEditing && editState?.id) {
      return planningsStore.getState().getById(editState.id);
    }
    return undefined;
  }, [isEditing, editState?.id]);

  useEffect(() => {
    if (planning) {
      setName(planning.name);
      setTypeId(planning.typeId);
      setSelectedAccountId(planning.accountId);
      setCategoryId(planning.categoryId);
      setCurrencyId(planning.currencyId);
      setAmount(String(planning.amount));

      setRecurringTypeId(planning.recurringRule.recurringTypeId);
      setIntervalStep(planning.recurringRule.intervalStep);
      setStartDate(planning.recurringRule.startDate);
      setEndDate(planning.recurringRule.endDate ?? null);
      setWeekDays(planning.recurringRule.weekDays || []);
      setMonthDays(planning.recurringRule.monthDays || []);
      setYearDays(planning.recurringRule.yearDays || []);
    }
  }, [planning]);

  const selectedAccount = selectedAccountId
    ? accounts.find((a) => a.id === selectedAccountId)
    : undefined;

  const isCreditAccount = Boolean(
    selectedAccount &&
      (selectedAccount.type.id === ACCOUNT_TYPES.CREDIT || selectedAccount.creditInfo !== null),
  );

  useEffect(() => {
    if (isCreditAccount && typeId === MOVEMENT_TYPES.INCOME) {
      setTypeId(MOVEMENT_TYPES.EXPENSE);
    }
  }, [isCreditAccount, typeId]);

  const onSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const formCurrencyId = Number(formData.get("currency")) || currencyId || 1;

    const numAmount = Number(amount);
    const { valid, errors: validationErrors } = validatePlanningForm(
      name,
      numAmount,
      selectedAccountId,
      categoryId,
      recurringTypeId,
      intervalStep,
      startDate,
      endDate,
      weekDays,
      monthDays,
      yearDays,
      typeId,
      isCreditAccount,
    );

    if (!valid) {
      setErrors(validationErrors);
      return;
    }

    if (!begin()) return;

    try {
      const payload = createPlanningRequest({
        typeId,
        accountId: selectedAccountId!,
        categoryId: categoryId!,
        currencyId: formCurrencyId,
        name,
        amount: numAmount,
        recurringTypeId,
        intervalStep,
        startDate,
        endDate,
        weekDays,
        monthDays,
        yearDays,
      });

      if (isEditing && planning) {
        await planningsStore.getState().update(planning.id, payload);
      } else {
        await planningsStore.getState().create(payload);
      }

      if (!isMounted()) return;
      toast(isEditing ? "#planning-updated" : "#planning-created");
      form.reset();
      setErrors([]);
      editState.clear();
      closeModal(`#${modalId}`);
    } catch (err: unknown) {
      logger.error("Planning form submission error:", err);
      if (isMounted()) {
        const errMsg =
          typeof err === "string" ? err : "Ocurrió un error al guardar la planificación";
        setErrors([errMsg]);
      }
    } finally {
      finish();
    }
  };

  const handleReset = () => {
    setErrors([]);
    if (planning) {
      setName(planning.name);
      setTypeId(planning.typeId);
      setSelectedAccountId(planning.accountId);
      setCategoryId(planning.categoryId);
      setAmount(String(planning.amount));
      setRecurringTypeId(planning.recurringRule.recurringTypeId);
      setIntervalStep(planning.recurringRule.intervalStep);
      setStartDate(planning.recurringRule.startDate);
      setEndDate(planning.recurringRule.endDate ?? null);
      setWeekDays(planning.recurringRule.weekDays || []);
      setMonthDays(planning.recurringRule.monthDays || []);
      setYearDays(planning.recurringRule.yearDays || []);
    } else {
      setName("");
      setTypeId(MOVEMENT_TYPES.EXPENSE);
      setSelectedAccountId(undefined);
      setCategoryId(undefined);
      setAmount("0.00");
      setRecurringTypeId(PLANNINGS_RECURRING_TYPES.MONTHLY);
      setIntervalStep(1);
      setEndDate(null);
      setWeekDays([]);
      setMonthDays([15]);
      setYearDays([]);
    }
  };

  return (
    <form
      className="mx-auto box-border w-full max-w-lg space-y-4 p-4 sm:p-6"
      id={formId}
      onSubmit={onSubmit}
      onReset={handleReset}
    >
      <fieldset className="space-y-4">
        <Input
          name="name"
          id="name"
          label="Nombre de la planificación"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Renta, Salario, Netflix"
        />
      </fieldset>

      {/* Movement Type Segmented Toggle (Income vs Expense) */}
      <fieldset className="space-y-1">
        <legend className="block text-sm text-zinc-700 dark:text-zinc-300">
          Tipo de Movimiento
        </legend>
        <div className="glass-control flex rounded">
          <button
            type="button"
            aria-pressed={typeId === MOVEMENT_TYPES.EXPENSE}
            onClick={() => setTypeId(MOVEMENT_TYPES.EXPENSE)}
            className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer rounded-l ${
              typeId === MOVEMENT_TYPES.EXPENSE
                ? "bg-red-600 text-zinc-50 dark:bg-red-400 dark:text-zinc-950"
                : "text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
            }`}
          >
            Gasto
          </button>
          <button
            type="button"
            disabled={isCreditAccount}
            aria-pressed={typeId === MOVEMENT_TYPES.INCOME}
            onClick={() => setTypeId(MOVEMENT_TYPES.INCOME)}
            className={`flex-1 cursor-pointer rounded-r border-l border-zinc-300 py-2 text-sm font-medium transition-colors dark:border-zinc-700 ${
              typeId === MOVEMENT_TYPES.INCOME
                ? "bg-emerald-600 text-zinc-50 dark:bg-emerald-400 dark:text-zinc-950"
                : isCreditAccount
                  ? "cursor-not-allowed text-zinc-500 opacity-50 dark:text-zinc-400"
                  : "text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
            }`}
            title={isCreditAccount ? "No disponible para tarjeta de crédito" : undefined}
          >
            Ingreso
          </button>
        </div>
      </fieldset>

      {/* Amount & Currency */}
      <fieldset className="space-y-1">
        <label htmlFor="amount" className="text-sm text-zinc-700 dark:text-zinc-300">
          Monto Estimado
        </label>
        <div className="flex">
          <Input
            type="number"
            name="amount"
            id="amount"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0.01}
            step={0.01}
          />
          <SelectCurrency currencyId={currencyId ?? planning?.currencyId} />
        </div>
      </fieldset>

      {/* Account Selection */}
      <SelectAccounts
        name="accountId"
        label="Cuenta"
        accountId={selectedAccountId}
        onChange={(id) => setSelectedAccountId(id)}
      />

      {/* Category Selection */}
      <SelectCategories categoryId={categoryId} onChange={(id) => setCategoryId(id)} />

      {/* Recurrence Rule Form */}
      <PlanningRecurrenceForm
        recurringTypeId={recurringTypeId}
        intervalStep={intervalStep}
        startDate={startDate}
        endDate={endDate}
        weekDays={weekDays}
        monthDays={monthDays}
        yearDays={yearDays}
        onRecurringTypeChange={setRecurringTypeId}
        onIntervalStepChange={setIntervalStep}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onWeekDaysChange={setWeekDays}
        onMonthDaysChange={setMonthDays}
        onYearDaysChange={setYearDays}
      />

      <FormErrors errors={errors} />
      <FormActions disabled={submitting} />
    </form>
  );
};

export default PlanningForm;
