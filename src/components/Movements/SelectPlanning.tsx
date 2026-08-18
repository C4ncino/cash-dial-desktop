import { useStore } from "zustand";

import { formatOccurrenceDate } from "@/components/Plannings/PlanningCard";
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

  const availablePlannings = plannings.filter((planning) =>
    planning.typeId === typeId &&
    planning.recurringRule.isActive &&
    planning.currentOccurrence?.statusId === PLANNING_STATUS.PENDING,
  );

  const selectedPlanning = plannings.find((planning) => planning.id === planningId);

  return (
    <fieldset className="space-y-1">
      <label htmlFor="planningId" className="text-gray-webui-text">
        Planificación (opcional)
      </label>
      <select
        id="planningId"
        name="planningId"
        value={planningId ?? ""}
        className="w-full border border-[#252525] bg-transparent rounded px-3 py-2"
        onChange={(event) => {
          const id = event.target.value ? Number(event.target.value) : undefined;
          onChange?.(id, plannings.find((planning) => planning.id === id));
        }}
      >
        <option value="" className="bg-black">Sin planificación</option>
        {availablePlannings.map((planning) => {
          const account = accounts.find((item) => item.id === planning.accountId);
          const currency = currencies.find((item) => item.id === planning.currencyId);
          const occurrence = planning.currentOccurrence;

          return (
            <option key={planning.id} value={planning.id} className="bg-black">
              {planning.name} · {currency?.symbol ?? "$"}{planning.amount.toFixed(2)} · {account?.name ?? "Cuenta"} · {occurrence ? formatOccurrenceDate(occurrence.expectedDate) : ""}
            </option>
          );
        })}
      </select>
      {selectedPlanning && !availablePlannings.some((planning) => planning.id === selectedPlanning.id) && (
        <p className="text-xs text-amber-400">La planificación seleccionada ya no tiene una ocurrencia pendiente.</p>
      )}
    </fieldset>
  );
};

export default SelectPlanning;
