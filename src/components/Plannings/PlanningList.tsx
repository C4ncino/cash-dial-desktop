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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
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
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
              statusFilter === "all"
                ? "bg-zinc-200 text-black font-semibold"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            Todas ({plannings.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
              statusFilter === "active"
                ? "bg-zinc-200 text-black font-semibold"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            Activas
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-1 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
              statusFilter === "inactive"
                ? "bg-zinc-200 text-black font-semibold"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
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
                  ? "bg-red-600 text-white font-semibold"
                  : "bg-red-950/60 text-red-300 border border-red-900/60 hover:bg-red-900/40"
              }`}
            >
              <span>Vencidas</span>
              <span className="bg-red-800/80 px-1.5 py-0.2 rounded-full text-[10px]">
                {overdueCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* List / Empty State */}
      {filteredPlannings.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto text-zinc-500">
            <Icon icon="iconoir:calendar-xmark" className="w-6 h-6" />
          </div>
          <h4 className="text-zinc-300 font-medium">No se encontraron planificaciones</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {plannings.length === 0
              ? "No tienes ninguna planificación configurada. Crea una para prever tus ingresos y gastos periódicos."
              : "No hay planificaciones que coincidan con los filtros seleccionados."}
          </p>

          {plannings.length === 0 && showCreateButton && (
            <button
              type="button"
              id="create-planning-button"
              className="mt-2 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <Icon icon="iconoir:plus" className="w-4 h-4" />
              <span>Crear primera planificación</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredPlannings.map((planning) => (
            <PlanningCard key={planning.id} planning={planning} />
          ))}
        </div>
      )}
    </section>
  );
};

export default PlanningList;
