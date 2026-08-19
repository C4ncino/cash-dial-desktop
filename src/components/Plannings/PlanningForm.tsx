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

export function validatePlanningForm(
  name: string,
  amount: number,
  accountId: number | undefined,
  categoryId: number | undefined,
  recurringTypeId: number,
  intervalStep: number,
  startDate: number,
  endDate: number | null | undefined,
  weekDays: number[],
  monthDays: number[],
  yearDays: PlanningYearDay[],
  typeId: number,
  isCreditAccount: boolean,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!name || name.trim() === "") {
    errors.push("El nombre de la planificación es requerido");
  }

  if (Number.isNaN(amount) || amount <= 0) {
    errors.push("El monto debe ser un número mayor a 0");
  }

  if (!accountId || accountId <= 0) {
    errors.push("La cuenta es requerida");
  }

  if (!categoryId || categoryId <= 0) {
    errors.push("La categoría es requerida");
  }

  if (typeId !== MOVEMENT_TYPES.INCOME && typeId !== MOVEMENT_TYPES.EXPENSE) {
    errors.push("El tipo debe ser Ingreso o Gasto");
  }

  if (isCreditAccount && typeId === MOVEMENT_TYPES.INCOME) {
    errors.push("Las cuentas de tarjeta de crédito solo permiten gastos");
  }

  if (intervalStep <= 0) {
    errors.push("La frecuencia debe ser mayor a 0");
  }

  if (!startDate) {
    errors.push("La fecha de inicio es requerida");
  }

  if (endDate && endDate < startDate) {
    errors.push("La fecha de finalización no puede ser anterior a la fecha de inicio");
  }

  if (recurringTypeId === PLANNINGS_RECURRING_TYPES.WEEKLY && weekDays.length === 0) {
    errors.push("Debes seleccionar al menos un día de la semana para la regla semanal");
  }

  if (recurringTypeId === PLANNINGS_RECURRING_TYPES.MONTHLY && monthDays.length === 0) {
    errors.push("Debes seleccionar al menos un día del mes para la regla mensual");
  }

  if (recurringTypeId === PLANNINGS_RECURRING_TYPES.YEARLY && yearDays.length === 0) {
    errors.push("Debes agregar al menos una fecha para la regla anual");
  }

  return { valid: errors.length === 0, errors };
}

const PlanningForm = ({ modalId, formId = modalId }: Props) => {
  const editState = useStore(editStore, (s) => s);
  const accounts = useStore(accountsStore, (s) => s?.accounts) ?? [];

  const [errors, setErrors] = useState<string[]>([]);
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

  const isCreditAccount =
    selectedAccount?.type.id === ACCOUNT_TYPES.CREDIT || selectedAccount?.creditInfo !== null;

  useEffect(() => {
    if (isCreditAccount && typeId === MOVEMENT_TYPES.INCOME) {
      setTypeId(MOVEMENT_TYPES.EXPENSE);
    }
  }, [isCreditAccount, typeId]);

  const onSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
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

    try {
      const payload: CreatePlanningRequest = {
        typeId,
        accountId: selectedAccountId!,
        categoryId: categoryId!,
        currencyId: formCurrencyId,
        name: name.trim(),
        amount: numAmount,
        recurringTypeId,
        intervalStep,
        startDate,
        endDate: endDate ?? null,
        weekDays: recurringTypeId === PLANNINGS_RECURRING_TYPES.WEEKLY ? weekDays : null,
        monthDays: recurringTypeId === PLANNINGS_RECURRING_TYPES.MONTHLY ? monthDays : null,
        yearDays: recurringTypeId === PLANNINGS_RECURRING_TYPES.YEARLY ? yearDays : null,
      };

      if (isEditing && planning) {
        await planningsStore.getState().update(planning.id, payload);
        toast("#planning-updated");
      } else {
        await planningsStore.getState().create(payload);
        toast("#planning-created");
      }

      (e.target as HTMLFormElement).reset();
      setErrors([]);
      editState.clear();
      closeModal(`#${modalId}`);
    } catch (err: any) {
      logger.error("Planning form submission error:", err);
      const errMsg = typeof err === "string" ? err : "Ocurrió un error al guardar la planificación";
      setErrors([errMsg]);
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
      className="box-border w-full max-w-lg h-full max-h-[calc(100vh-2rem)] mx-auto p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain bg-zinc-950"
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
        <label className="text-gray-webui-text text-sm block">Tipo de Movimiento</label>
        <div className="flex border border-zinc-800 rounded bg-zinc-950">
          <button
            type="button"
            onClick={() => setTypeId(MOVEMENT_TYPES.EXPENSE)}
            className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer rounded-l ${
              typeId === MOVEMENT_TYPES.EXPENSE
                ? "bg-red-600/80 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            Gasto
          </button>
          <button
            type="button"
            disabled={isCreditAccount}
            onClick={() => setTypeId(MOVEMENT_TYPES.INCOME)}
            className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer rounded-r border-l border-zinc-800 ${
              typeId === MOVEMENT_TYPES.INCOME
                ? "bg-emerald-600/80 text-white"
                : isCreditAccount
                  ? "text-zinc-600 cursor-not-allowed opacity-50"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
            title={isCreditAccount ? "No disponible para tarjeta de crédito" : undefined}
          >
            Ingreso
          </button>
        </div>
      </fieldset>

      {/* Amount & Currency */}
      <fieldset className="space-y-1">
        <label htmlFor="amount" className="text-gray-webui-text text-sm">
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
      <FormActions />
    </form>
  );
};

export default PlanningForm;
