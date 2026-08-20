import { Icon } from "@iconify/react";
import { useStore } from "zustand";

import SquareIcon from "@/components/General/SquareIcon";
import AmountText from "@/components/General/AmountText";
import AccountName from "@/components/General/AccountName";
import CategoryName from "@/components/General/CategoryName";
import { formatRecurrenceRuleSummary } from "@/components/Plannings/PlanningCard";
import { currencyStore } from "@/stores/currencyStore";
import { categoryStore } from "@/stores/categoryStore";
import { planningsStore } from "@/stores/planningsStore";
import { MOVEMENT_TYPES, PLANNINGS_RECURRING_TYPES } from "@/types/enums";

const WEEKDAY_NAMES_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MONTH_NAMES_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
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
  const currency = useStore(currencyStore, (s) => s?.currencies?.find((c) => c.id === planning?.currencyId));

  if (!planning) return null;

  const rule = planning.recurringRule;
  const isExpense = planning.typeId === MOVEMENT_TYPES.EXPENSE;
  const recurrenceSummary = formatRecurrenceRuleSummary(rule);
  return (
    <section className="p-4 mb-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {category && (
          <SquareIcon
            className="w-12 h-12"
            backgroundColor={category.color}
            icon={category.icon}
          />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold text-white">{planning.name}</h2>
          </div>
          <p className="text-sm text-zinc-400 mt-0.5">
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
          <p className="text-xs text-zinc-400">{currency?.code ?? ""}</p>
        </div>
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <p className="text-zinc-500 text-xs uppercase tracking-wider">Cuenta</p>
          <p className="text-zinc-200 flex items-center gap-1.5">
            <AccountName id={planning.accountId} />
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-zinc-500 text-xs uppercase tracking-wider">Categoría</p>
          <p className="text-zinc-200 flex items-center gap-1.5">
            <CategoryName id={planning.categoryId} />
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-zinc-500 text-xs uppercase tracking-wider">Estado</p>
          <p className={`font-medium ${rule.isActive ? "text-emerald-400" : "text-zinc-500"}`}>
            {rule.isActive ? "Activa" : "Inactiva"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-zinc-500 text-xs uppercase tracking-wider">Tipo de Movimiento</p>
          <p className={`font-medium ${isExpense ? "text-red-400" : "text-emerald-400"}`}>
            {isExpense ? "Gasto" : "Ingreso"}
          </p>
        </div>
      </div>

      {/* Recurrence Rule Summary */}
      <div className="mt-6 p-3 rounded-lg bg-zinc-900/80 border border-zinc-800">
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Regla de Recurrencia</p>
        <p className="text-zinc-200 flex items-center gap-2">
          <Icon icon="iconoir:repeat" className="w-4 h-4 text-zinc-400" />
          <span>{recurrenceSummary}</span>
        </p>

        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
          <div>
            <p className="text-zinc-500 text-xs">Fecha de inicio</p>
            <p className="text-zinc-300">{formatDateLong(rule.startDate)}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs">Fecha límite</p>
            <p className="text-zinc-300">
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
                <span key={d} className="text-xs bg-zinc-800 text-zinc-200 px-2 py-0.5 rounded">
                  {WEEKDAY_NAMES_FULL[d]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Month days detail */}
        {rule.recurringTypeId === PLANNINGS_RECURRING_TYPES.MONTHLY && rule.monthDays.length > 0 && (
          <div className="mt-3">
            <p className="text-zinc-500 text-xs mb-1">Días del mes</p>
            <div className="flex gap-1.5 flex-wrap">
              {rule.monthDays.map((d) => (
                <span key={d} className="text-xs bg-zinc-800 text-zinc-200 px-2 py-0.5 rounded">
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
                  className="text-xs bg-zinc-800 text-zinc-200 px-2 py-0.5 rounded"
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
