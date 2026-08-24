import { Icon } from "@iconify/react";
import { useStore } from "zustand";

import EntityIcon from "@/components/General/EntityIcon";
import AmountText from "@/components/General/AmountText";
import AccountName from "@/components/General/AccountName";
import CategoryName from "@/components/General/CategoryName";
import { formatRecurrenceRuleSummary } from "@/components/Plannings/PlanningCard";
import { currencyStore } from "@/stores/currencyStore";
import { categoryStore } from "@/stores/categoryStore";
import { planningsStore } from "@/stores/planningsStore";
import { MOVEMENT_TYPES, PLANNINGS_RECURRING_TYPES } from "@/types/enums";

const WEEKDAY_NAMES_FULL = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const MONTH_NAMES_FULL = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function formatDateLong(timestamp: number): string {
  const d = new Date(timestamp);
  const day = d.getDate();
  const month = MONTH_NAMES_FULL[d.getMonth()];
  const year = d.getFullYear();
  return `${day} de ${month}, ${year}`;
}

const PlanningInfo = () => {
  const id =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("id"))
      : null;

  const planning = useStore(planningsStore, (s) => s?.plannings?.find((p) => p.id === id));
  const category = useStore(categoryStore, (s) =>
    planning ? s.getById(planning.categoryId) : undefined,
  );
  const currency = useStore(currencyStore, (s) =>
    s?.currencies?.find((c) => c.id === planning?.currencyId),
  );

  if (!planning) return null;

  const rule = planning.recurringRule;
  const isExpense = planning.typeId === MOVEMENT_TYPES.EXPENSE;
  const recurrenceSummary = formatRecurrenceRuleSummary(rule);
  return (
    <section className="p-4 mb-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {category && <EntityIcon size="lg" color={category.color} icon={category.icon} />}
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-100">
            {planning.name}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {isExpense ? "Gasto" : "Ingreso"} planificado
          </p>
        </div>
        <div className="text-right">
          <AmountText
            amount={planning.amount}
            tone={isExpense || planning.amount < 0 ? "expense" : "income"}
            icon={isExpense || planning.amount < 0 ? "minus" : "plus"}
            format="currency"
            currency={currency}
            className="text-3xl justify-end"
            amountClassName="font-bold"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{currency?.code ?? ""}</p>
        </div>
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <p className="text-zinc-500 text-xs uppercase tracking-wider">Cuenta</p>
          <p className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <AccountName id={planning.accountId} />
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-zinc-500 text-xs uppercase tracking-wider">Categoría</p>
          <p className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <CategoryName id={planning.categoryId} />
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-zinc-500 text-xs uppercase tracking-wider">Estado</p>
          <p
            className={`font-medium ${rule.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400"}`}
          >
            {rule.isActive ? "Activa" : "Inactiva"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-zinc-500 text-xs uppercase tracking-wider">Tipo de Movimiento</p>
          <p
            className={`font-medium ${isExpense ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
          >
            {isExpense ? "Gasto" : "Ingreso"}
          </p>
        </div>
      </div>

      {/* Recurrence Rule Summary */}
      <div className="glass-surface mt-6 rounded-lg p-3">
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Regla de Recurrencia</p>
        <p className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
          <Icon icon="iconoir:repeat" className="w-4 h-4 text-zinc-400" />
          {recurrenceSummary}
        </p>

        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
          <div>
            <p className="text-zinc-500 text-xs">Fecha de inicio</p>
            <p className="text-zinc-700 dark:text-zinc-300">{formatDateLong(rule.startDate)}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs">Fecha límite</p>
            <p className="text-zinc-700 dark:text-zinc-300">
              {rule.endDate ? formatDateLong(rule.endDate) : "Sin fecha límite"}
            </p>
          </div>
        </div>

        {/* Week days detail */}
        {rule.recurringTypeId === PLANNINGS_RECURRING_TYPES.WEEKLY && rule.weekDays.length > 0 && (
          <div className="mt-3">
            <p className="text-zinc-500 text-xs mb-1">Días de la semana</p>
            <div className="flex gap-1.5 flex-wrap">
              {rule.weekDays.map((d) => (
                <span
                  key={d}
                  className="rounded bg-zinc-200/60 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300"
                >
                  {WEEKDAY_NAMES_FULL[d]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Month days detail */}
        {rule.recurringTypeId === PLANNINGS_RECURRING_TYPES.MONTHLY &&
          rule.monthDays.length > 0 && (
            <div className="mt-3">
              <p className="text-zinc-500 text-xs mb-1">Días del mes</p>
              <div className="flex gap-1.5 flex-wrap">
                {rule.monthDays.map((d) => (
                  <span
                    key={d}
                    className="rounded bg-zinc-200/60 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300"
                  >
                    Día {d}
                  </span>
                ))}
              </div>
            </div>
          )}

        {/* Year days detail */}
        {rule.recurringTypeId === PLANNINGS_RECURRING_TYPES.YEARLY && rule.yearDays.length > 0 && (
          <div className="mt-3">
            <p className="text-zinc-500 text-xs mb-1">Fechas anuales</p>
            <div className="flex gap-1.5 flex-wrap">
              {rule.yearDays.map((yd) => (
                <span
                  key={`${yd.month}-${yd.dayOfMonth}`}
                  className="rounded bg-zinc-200/60 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300"
                >
                  {yd.dayOfMonth} de {MONTH_NAMES_FULL[yd.month - 1]}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PlanningInfo;
