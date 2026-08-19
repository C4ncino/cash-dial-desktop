import { useEffect, useMemo, useState } from "react";
import { closeModal, type ModalInstance, modal, toast } from "webcoreui";
import { Accordion, Input, Modal, Radio } from "webcoreui/react";
import { useStore } from "zustand";

import FormActions from "@/components/Forms/FormActions";
import FormErrors from "@/components/Forms/FormErrors";
import SegmentedControl from "@/components/Forms/SegmentedControl";
import SelectCategories from "@/components/Forms/SelectCategories";
import SelectCurrency from "@/components/Forms/SelectCurrency";
import { logger } from "@/lib/logger";
import { budgetStore } from "@/stores/budgetStore";
import { editStore } from "@/stores/editStore";
import { BUDGET_TYPES, BUDGET_UPDATE_TYPES, EDIT_TYPES, MODAL_ID } from "@/types/enums";

interface Props {
  modalId: string;
}

function getTimestampForBudgetType(type: BUDGET_TYPES): number {
  const date = new Date(Date.now());

  switch (type) {
    case BUDGET_TYPES.WEEKLY: {
      // Monday = 0, Tuesday = 1, ..., Sunday = 6
      const daysSinceMonday = (date.getDay() + 6) % 7;
      date.setDate(date.getDate() - daysSinceMonday);
      break;
    }

    case BUDGET_TYPES.MONTHLY:
      date.setDate(1);
      break;

    case BUDGET_TYPES.YEARLY:
      date.setMonth(0, 1);
      break;
  }

  date.setHours(0, 0, 0, 0);

  return date.getTime();
}

const BudgetForm = ({ modalId }: Props) => {
  const periodTypes = useStore(budgetStore, (s) => s.periodTypes);

  const [errors, setErrors] = useState<string[]>([]);
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
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    logger.debug("Budget form data:", data);

    // Basic validation
    const errs: string[] = [];
    if (!data.name || String(data.name).trim() === "") errs.push("El nombre es requerido");
    if (!budget && (!data.categoryId || String(data.categoryId).trim() === ""))
      errs.push("La categoría es requerida");
    if (!data.amountLimit || Number(data.amountLimit) <= 0)
      errs.push("El límite debe ser mayor que 0");

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    try {
      if (budget) {
        // Editing: update name and amount limit (amount update uses a secondary modal to pick update type)
        const name = String(data.name);
        const amountLimit = Number(data.amountLimit);

        if (name !== budget.budget.name) {
          await budgetStore.getState().updateName(budget.budget.id, name);
          toast("#budget-name-updated");
        }

        // If amount changed, open an internal modal to ask for update type
        if (amountLimit !== budget.periods[budget.periods.length - 1].amountLimit) {
          // Keep pending amount in state and show the update-type modal
          setPendingAmount(amountLimit);
          setShowUpdateType(true);
          // Don't close the main modal yet; the update-type modal will call updateAmount and then close everything.
          return;
        }
      } else {
        // Creating new budget
        const periodType = selectedPeriodType ?? periodTypes[0]?.id ?? 0;

        const payload = {
          budgetPeriodTypeId: periodType,
          categoryId: Number(data.categoryId),
          currencyId: Number(data.currency),
          name: String(data.name),
          amountLimit: Number(data.amountLimit),
          startDate: getTimestampForBudgetType(periodType),
        };

        await budgetStore.getState().add(payload);
        toast("#budget-created");
      }

      e.target.reset();

      editState.clear();
      closeModal(`#${modalId}`);
    } catch (err) {
      logger.error(err);
      setErrors(["Ocurrió un error al guardar el presupuesto"]);
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

    try {
      await budgetStore
        .getState()
        .updateAmount(budget.budget.id, pendingAmount, selectedUpdateType);
      toast("#budget-amount-updated");

      // close update modal and the main modal
      updateModalInstance?.close();
      setShowUpdateType(false);
      setPendingAmount(undefined);
      closeModal(`#${modalId}`);
      editState.clear();
    } catch (err) {
      logger.error(err);
      setErrors(["Ocurrió un error al actualizar el monto"]);
    }
  };

  return (
    <>
      <form
        className="w-5/6 h-full m-auto space-y-4"
        id="budget-form"
        onSubmit={onSubmit}
        onReset={() => {
          setSelectedPeriodType(budget ? budget.budget.budgetPeriodTypeId : null);
          setCategoryId(budget?.budget.categoryId);
        }}
      >
        <fieldset className="space-y-4">
          <Input name="name" label="Nombre" required value={budget ? budget.budget.name : ""} />
        </fieldset>

        {!budget && (
          <>
            <SelectCategories categoryId={categoryId} onChange={setCategoryId} />

            <fieldset>
              <label htmlFor="amountLimit" className="text-gray-webui-text">
                Límite
              </label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  name="amountLimit"
                  id="amountLimit"
                  required
                  value={"0.00"}
                  step={0.01}
                />
                <SelectCurrency />
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
            <label htmlFor="amountLimit" className="text-gray-webui-text">
              Límite actual
            </label>
            <div className="flex mt-1">
              <Input
                type="number"
                name="amountLimit"
                id="amountLimit"
                required
                value={String(budget.periods[budget.periods.length - 1].amountLimit)}
                step={0.01}
              />
              <SelectCurrency currencyId={budget.budget.currencyId} disabled />
            </div>
          </fieldset>
        )}

        <FormErrors errors={errors} />
        <FormActions />
      </form>

      {/* Update type modal (shown when amount changed in edit mode) */}
      {budget && (
        <Modal
          id={`update-budget-type-${budget.budget.id}`}
          title="Tipo de actualización"
          className="w-lg!"
        >
          <p className="text-zinc-400 mb-4">Selecciona cómo deseas aplicar el nuevo límite.</p>

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

          <menu className="flex justify-end gap-4 mt-4">
            <button
              type="button"
              onClick={() => {
                updateModalInstance?.close();
                setShowUpdateType(false);
                setPendingAmount(undefined);
              }}
              className="border-2 border-zinc-200 text-zinc-200 hover:text-black py-2 px-4 rounded hover:bg-zinc-200 hover:cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmUpdateAmount}
              className="border-2 border-blue-600 text-blue-600 hover:text-white hover:bg-blue-600 py-2 px-4 rounded hover:cursor-pointer"
            >
              Aplicar
            </button>
          </menu>
        </Modal>
      )}
    </>
  );
};

export default BudgetForm;
