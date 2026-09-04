import { useStore } from "zustand";

import { formatOccurrenceDate } from "@/components/Plannings/PlanningCard";
import { formatNumber } from "@/lib/formatters";
import { accountsStore } from "@/stores/accountsStore";
import { currencyStore } from "@/stores/currencyStore";
import { planningsStore } from "@/stores/planningsStore";
import { PLANNING_STATUS } from "@/types/enums";

interface Props {
  typeId: number;
  planningId?: number;
  onChange?: (planningId: number | undefined, planning?: Planning) => void;
}

const SelectPlanning = ({ typeId, planningId, onChange }: Props) => {
  const plannings = useStore(planningsStore, (state) => state?.plannings ?? []) ?? [];
  const accounts = useStore(accountsStore, (state) => state?.accounts ?? []) ?? [];
  const currencies = useStore(currencyStore, (state) => state?.currencies ?? []) ?? [];

  const availablePlannings = plannings.filter(
    (planning) =>
      planning.typeId === typeId &&
      planning.recurringRule.isActive &&
      planning.currentOccurrence?.statusId === PLANNING_STATUS.PENDING,
  );

  const selectedPlanning = plannings.find((planning) => planning.id === planningId);

  return (
    <fieldset className="space-y-1">
      <label htmlFor="planningId" className="text-zinc-700 dark:text-zinc-300">
        Planificación (opcional)
      </label>
      <select
        id="planningId"
        name="planningId"
        value={planningId ?? ""}
        className="glass-control w-full rounded px-3 py-2 text-zinc-950 dark:text-zinc-100"
        onChange={(event) => {
          const id = event.target.value ? Number(event.target.value) : undefined;
          onChange?.(
            id,
            plannings.find((planning) => planning.id === id),
          );
        }}
      >
        <option value="" className="bg-zinc-100 dark:bg-zinc-800">
          Sin planificación
        </option>
        {availablePlannings.map((planning) => {
          const account = accounts.find((item) => item.id === planning.accountId);
          const currency = currencies.find((item) => item.id === planning.currencyId);
          const occurrence = planning.currentOccurrence;

          return (
            <option key={planning.id} value={planning.id} className="bg-zinc-100 dark:bg-zinc-800">
              {planning.name} · {currency?.symbol ?? "$"}
              {formatNumber(planning.amount)} · {account?.name ?? "Cuenta"} ·{" "}
              {occurrence ? formatOccurrenceDate(occurrence.expectedDate) : ""}
            </option>
          );
        })}
      </select>
      {selectedPlanning &&
        !availablePlannings.some((planning) => planning.id === selectedPlanning.id) && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            La planificación seleccionada ya no tiene una ocurrencia pendiente.
          </p>
        )}
    </fieldset>
  );
};

export default SelectPlanning;
