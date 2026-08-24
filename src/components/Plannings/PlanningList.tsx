import { Icon } from "@iconify/react";
import { useMemo, useState } from "react";
import { useStore } from "zustand";

import PlanningCard from "@/components/Plannings/PlanningCard";
import { planningsStore } from "@/stores/planningsStore";

type FilterStatus = "all" | "active" | "inactive" | "overdue";

interface Props {
  showCreateButton?: boolean;
}

const PlanningList = ({ showCreateButton = true }: Props) => {
  const plannings = useStore(planningsStore, (s) => s?.plannings) ?? [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const filteredPlannings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    return plannings.filter((p) => {
      // Search filter
      if (search.trim() !== "") {
        const matchesName = p.name.toLowerCase().includes(search.toLowerCase());
        if (!matchesName) return false;
      }

      // Status filter
      if (statusFilter === "active") {
        return p.recurringRule.isActive;
      }
      if (statusFilter === "inactive") {
        return !p.recurringRule.isActive;
      }
      if (statusFilter === "overdue") {
        return (
          p.recurringRule.isActive &&
          p.currentOccurrence &&
          (p.currentOccurrence.isOverdue || p.currentOccurrence.expectedDate < todayMs)
        );
      }

      return true;
    });
  }, [plannings, search, statusFilter]);

  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    return plannings.filter(
      (p) =>
        p.recurringRule.isActive &&
        p.currentOccurrence &&
        (p.currentOccurrence.isOverdue || p.currentOccurrence.expectedDate < todayMs),
    ).length;
  }, [plannings]);

  return (
    <section className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="glass-surface flex flex-col items-stretch gap-3 rounded-xl p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Icon
            icon="iconoir:search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
          />
          <input
            type="text"
            placeholder="Buscar planificación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-control w-full rounded-lg py-1.5 pr-3 pl-9 text-sm text-zinc-950 placeholder-zinc-500 focus:border-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder-zinc-400 dark:focus:border-zinc-600"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
              statusFilter === "all"
                ? "bg-zinc-800 text-zinc-100 font-semibold dark:bg-zinc-200 dark:text-zinc-950"
                : "glass-control text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            Todas ({plannings.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
              statusFilter === "active"
                ? "bg-zinc-800 text-zinc-100 font-semibold dark:bg-zinc-200 dark:text-zinc-950"
                : "glass-control text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            Activas
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-1 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
              statusFilter === "inactive"
                ? "bg-zinc-800 text-zinc-100 font-semibold dark:bg-zinc-200 dark:text-zinc-950"
                : "glass-control text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            Inactivas
          </button>

          {overdueCount > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter("overdue")}
              className={`px-3 py-1 text-xs font-medium rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 ${
                statusFilter === "overdue"
                  ? "bg-red-600 text-zinc-50 font-semibold dark:bg-red-400 dark:text-zinc-950"
                  : "border border-red-200 bg-red-50/60 text-red-600 hover:bg-red-100/60 dark:border-red-800 dark:bg-red-950/60 dark:text-red-400 dark:hover:bg-red-900/60"
              }`}
            >
              Vencidas
              <span className="rounded-full bg-red-200/80 px-1.5 py-0.2 text-[10px] dark:bg-red-800/80">
                {overdueCount}
              </span>
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-zinc-500 dark:text-zinc-400" aria-live="polite">
        {filteredPlannings.length} {filteredPlannings.length === 1 ? "resultado" : "resultados"}
      </p>

      {/* List / Empty State */}
      {filteredPlannings.length === 0 ? (
        <div className="glass-surface space-y-3 rounded-xl border-dashed px-4 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200/60 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
            <Icon icon="iconoir:calendar-xmark" className="w-6 h-6" />
          </div>
          <h4 className="font-medium text-zinc-700 dark:text-zinc-300">
            No se encontraron planificaciones
          </h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {plannings.length === 0
              ? "No tienes ninguna planificación configurada. Crea una para prever tus ingresos y gastos periódicos."
              : "No hay planificaciones que coincidan con los filtros seleccionados."}
          </p>

          {plannings.length === 0 && showCreateButton && (
            <button
              type="button"
              id="create-planning-button"
              className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-zinc-50 transition-colors hover:bg-blue-500 dark:bg-blue-400 dark:text-zinc-950 dark:hover:bg-blue-500"
            >
              <Icon icon="iconoir:plus" className="w-4 h-4" />
              Crear primera planificación
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredPlannings.map((planning) => (
            <PlanningCard key={planning.id} planning={planning} />
          ))}
        </div>
      )}
    </section>
  );
};

export default PlanningList;
