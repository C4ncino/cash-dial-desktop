import { useEffect, useMemo, useState } from "react";
import { closeModal, type ModalInstance, modal, toast } from "webcoreui";
import { Accordion, Input, Modal, Radio } from "webcoreui/react";
import { useStore } from "zustand";

import FormActions from "@/components/Forms/FormActions";
import FormErrors from "@/components/Forms/FormErrors";
import SegmentedControl from "@/components/Forms/SegmentedControl";
import SelectCategories from "@/components/Forms/SelectCategories";
import SelectCurrency from "@/components/Forms/SelectCurrency";
import ActionButton from "@/components/General/ActionButton";
import useSubmissionGuard from "@/hooks/useSubmissionGuard";
import { createBudgetFromData, validateBudgetForm } from "@/lib/forms/budget";
import { logger } from "@/lib/logger";
import { budgetStore } from "@/stores/budgetStore";
import { editStore } from "@/stores/editStore";
import { BUDGET_UPDATE_TYPES, EDIT_TYPES, MODAL_ID } from "@/types/enums";

interface Props {
  modalId: string;
}

const BudgetForm = ({ modalId }: Props) => {
  const periodTypes = useStore(budgetStore, (s) => s.periodTypes);

  const [errors, setErrors] = useState<string[]>([]);
  const { submitting, begin, finish, isMounted } = useSubmissionGuard();
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [selectedPeriodType, setSelectedPeriodType] = useState<number | null>(
    periodTypes.length > 0 ? periodTypes[0].id : null,
  );

  const editState = useStore(editStore, (state) => state);

  const budget = useMemo(() => {
    const isEditing =
      typeof editState.id === "number" &&
      editState.type === EDIT_TYPES.BUDGET &&
      modalId === MODAL_ID.BUDGET.EDIT;

    const budget = isEditing ? budgetStore.getState().getById(editState.id as number) : undefined;

    setSelectedPeriodType(budget ? budget.budget.budgetPeriodTypeId : null);
    setCategoryId(budget?.budget.categoryId);

    return budget;
  }, [editState.id, editState.type, modalId]);

  const [showUpdateType, setShowUpdateType] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | undefined>();
  const [selectedUpdateType, setSelectedUpdateType] = useState<BudgetAmountUpdateType>(
    BUDGET_UPDATE_TYPES.CORRECT,
  );

  const [updateModalInstance, setUpdateModalInstance] = useState<ModalInstance | undefined>();

  const onSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    logger.debug("Budget form data:", data);

    const validation = validateBudgetForm(data, Boolean(budget));
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    if (!begin()) return;

    try {
      if (budget) {
        // Editing: update name and amount limit (amount update uses a secondary modal to pick update type)
        const name = String(data.name);
        const amountLimit = Number(data.amountLimit);

        if (name !== budget.budget.name) {
          await budgetStore.getState().updateName(budget.budget.id, name);
          if (isMounted()) toast("#budget-name-updated");
        }

        // If amount changed, open an internal modal to ask for update type
        if (amountLimit !== budget.periods[budget.periods.length - 1].amountLimit) {
          // Keep pending amount in state and show the update-type modal
          if (isMounted()) {
            setPendingAmount(amountLimit);
            setShowUpdateType(true);
          }
          // Don't close the main modal yet; the update-type modal will call updateAmount and then close everything.
          return;
        }
      } else {
        // Creating new budget
        const periodType = selectedPeriodType ?? periodTypes[0]?.id ?? 0;

        await budgetStore.getState().add(createBudgetFromData(data, periodType));
      }

      if (!isMounted()) return;
      if (!budget) toast("#budget-created");
      form.reset();

      editState.clear();
      closeModal(`#${modalId}`);
    } catch (err) {
      logger.error(err);
      if (isMounted()) setErrors(["Ocurrió un error al guardar el presupuesto"]);
    } finally {
      finish();
    }
  };

  useEffect(() => {
    // when showing the update-type modal, get its instance so it can be programatically opened/closed
    if (showUpdateType && budget) {
      const id = `update-budget-type-${budget.budget.id}`;
      setUpdateModalInstance(modal(`#${id}`));
      // open the modal instance if available
      const inst = modal(`#${id}`);
      inst?.open();
    }
  }, [showUpdateType, budget]);

  const handleConfirmUpdateAmount = async () => {
    if (!budget || pendingAmount === undefined) return;
    if (!begin()) return;

    try {
      await budgetStore
        .getState()
        .updateAmount(budget.budget.id, pendingAmount, selectedUpdateType);
      if (!isMounted()) return;
      toast("#budget-amount-updated");

      // close update modal and the main modal
      updateModalInstance?.close();
      setShowUpdateType(false);
      setPendingAmount(undefined);
      closeModal(`#${modalId}`);
      editState.clear();
    } catch (err) {
      logger.error(err);
      if (isMounted()) setErrors(["Ocurrió un error al actualizar el monto"]);
    } finally {
      finish();
    }
  };

  return (
    <>
      <form
        className="mx-auto w-full max-w-lg space-y-4"
        id="budget-form"
        onSubmit={onSubmit}
        onReset={() => {
          setSelectedPeriodType(
            budget ? budget.budget.budgetPeriodTypeId : (periodTypes[0]?.id ?? null),
          );
          setCategoryId(budget?.budget.categoryId);
          setErrors([]);
        }}
      >
        <fieldset className="space-y-4">
          <Input name="name" label="Nombre" required value={budget ? budget.budget.name : ""} />
        </fieldset>

        {!budget && (
          <>
            <SelectCategories categoryId={categoryId} onChange={setCategoryId} />

            <fieldset>
              <label htmlFor="amountLimit" className="text-zinc-700 dark:text-zinc-300">
                Límite
              </label>
              <div
                data-testid="budget-amount-currency-control"
                className="mt-1 grid w-full grid-cols-[minmax(0,1fr)_6rem] overflow-hidden rounded border border-zinc-400 focus-within:ring-2 focus-within:ring-blue-500 dark:border-zinc-600"
              >
                <div className="min-w-0 overflow-hidden border-r border-zinc-400 dark:border-zinc-600">
                  <Input
                    type="number"
                    name="amountLimit"
                    id="amountLimit"
                    required
                    value={"0.00"}
                    step={0.01}
                    className="glass-control h-10 min-w-0 max-w-full rounded-none border-0 px-3 py-2 focus:outline-none focus:ring-0"
                  />
                </div>
                <SelectCurrency className="glass-control h-10 w-full rounded-none border-0 px-2 py-2 text-zinc-950 focus:outline-none focus:ring-0 dark:text-zinc-100" />
              </div>
            </fieldset>

            <SegmentedControl
              items={periodTypes}
              onChange={setSelectedPeriodType}
              value={selectedPeriodType}
            />
          </>
        )}

        {budget && (
          <fieldset>
            <label htmlFor="amountLimit" className="text-zinc-700 dark:text-zinc-300">
              Límite actual
            </label>
            <div
              data-testid="budget-amount-currency-control"
              className="mt-1 grid w-full grid-cols-[minmax(0,1fr)_6rem] overflow-hidden rounded border border-zinc-400 focus-within:ring-2 focus-within:ring-blue-500 dark:border-zinc-600"
            >
              <div className="min-w-0 overflow-hidden border-r border-zinc-400 dark:border-zinc-600">
                <Input
                  type="number"
                  name="amountLimit"
                  id="amountLimit"
                  required
                  value={String(budget.periods[budget.periods.length - 1].amountLimit)}
                  step={0.01}
                  className="glass-control h-10 min-w-0 max-w-full rounded-none border-0 px-3 py-2 focus:outline-none focus:ring-0"
                />
              </div>
              <SelectCurrency
                currencyId={budget.budget.currencyId}
                disabled
                className="glass-control h-10 w-full rounded-none border-0 px-2 py-2 text-zinc-600 opacity-100 focus:outline-none focus:ring-0 disabled:cursor-not-allowed dark:text-zinc-300"
              />
            </div>
          </fieldset>
        )}

        <FormErrors errors={errors} />
        <FormActions disabled={submitting} />
      </form>

      {/* Update type modal (shown when amount changed in edit mode) */}
      {budget && (
        <Modal
          id={`update-budget-type-${budget.budget.id}`}
          title="Tipo de actualización"
          className="glass-elevated w-[calc(100%-2rem)]! max-w-lg! max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain backdrop-blur-xl!"
        >
          <p className="mb-4 text-zinc-500 dark:text-zinc-400">
            Selecciona cómo deseas aplicar el nuevo límite.
          </p>

          <fieldset className="mb-4 flex flex-col gap-2">
            <Radio
              items={[
                {
                  label: "Corrige periodo actual y anteriores",
                  value: BUDGET_UPDATE_TYPES.CORRECT,
                },
                {
                  label: "Desde el periodo actual",
                  value: BUDGET_UPDATE_TYPES.TODAY,
                },
                { label: "A partir del próximo periodo", value: BUDGET_UPDATE_TYPES.NEXT_PERIOD },
              ]}
              name={`update-type-${budget.budget.id}`}
              onChange={(e) => setSelectedUpdateType(e.target.value as BUDGET_UPDATE_TYPES)}
            />
          </fieldset>

          <Accordion
            className="text-sm!"
            items={[
              {
                title: "Como funciona 'corregir'?",
                content:
                  "Actualiza el valor del presupuesto sin generar historial de cambios, las demás opciones generan historial para no afectar periodos anteriores",
              },
              {
                title: "Qué pasa si he hecho cambios anteriormente?",
                content:
                  "'Corregir' solo afectara a los periodos que han pasado después de un cambio anterior",
              },
            ]}
          />

          <menu className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <ActionButton
              disabled={submitting}
              onClick={() => {
                updateModalInstance?.close();
                setShowUpdateType(false);
                setPendingAmount(undefined);
              }}
            >
              Cancelar
            </ActionButton>
            <ActionButton disabled={submitting} onClick={handleConfirmUpdateAmount} tone="info">
              Aplicar
            </ActionButton>
          </menu>
        </Modal>
      )}
    </>
  );
};

export default BudgetForm;
