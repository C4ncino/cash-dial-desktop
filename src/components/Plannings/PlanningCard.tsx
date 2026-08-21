import { useStore } from "zustand";

import AccountName from "@/components/General/AccountName";
import AmountText from "@/components/General/AmountText";
import CategoryName from "@/components/General/CategoryName";
import { currencyStore } from "@/stores/currencyStore";
import { MOVEMENT_TYPES, PLANNINGS_RECURRING_TYPES } from "@/types/enums";

const WEEKDAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_SHORT_NAMES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export function formatRecurrenceRuleSummary(rule: PlanningRecurringRuleDetail): string {
  switch (rule.recurringTypeId) {
    case PLANNINGS_RECURRING_TYPES.DAILY:
      return rule.intervalStep === 1 ? "Cada día" : `Cada ${rule.intervalStep} días`;

    case PLANNINGS_RECURRING_TYPES.WEEKLY: {
      const stepText = rule.intervalStep === 1 ? "Cada semana" : `Cada ${rule.intervalStep} semanas`;
      const days = (rule.weekDays || []).map((d) => WEEKDAY_NAMES[d]).filter(Boolean).join(", ");
      return days ? `${stepText} · ${days}` : stepText;
    }

    case PLANNINGS_RECURRING_TYPES.MONTHLY: {
      const stepText = rule.intervalStep === 1 ? "Cada mes" : `Cada ${rule.intervalStep} meses`;
      const days = (rule.monthDays || []).map((d) => `Día ${d}`).join(", ");
      return days ? `${stepText} · ${days}` : stepText;
    }

    case PLANNINGS_RECURRING_TYPES.YEARLY: {
      const stepText = rule.intervalStep === 1 ? "Cada año" : `Cada ${rule.intervalStep} años`;
      const dates = (rule.yearDays || [])
        .map((yd) => `${yd.dayOfMonth} ${MONTH_SHORT_NAMES[yd.month - 1]}`)
        .join(", ");
      return dates ? `${stepText} · ${dates}` : stepText;
    }

    default:
      return "Personalizada";
  }
}

export function formatOccurrenceDate(timestamp: number): string {
  const d = new Date(timestamp);
  const day = d.getDate();
  const month = MONTH_SHORT_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

interface Props {
  planning: Planning;
}

const PlanningCard = ({ planning }: Props) => {
  const currency = useStore(currencyStore, (s) => s?.currencies?.find((c) => c.id === planning.currencyId));

  const isExpense = planning.typeId === MOVEMENT_TYPES.EXPENSE;
  const nextOccurrence = planning.currentOccurrence;

  return (
    <a
      href={`/planning-detail?id=${planning.id}`}
      data-testid="planning-card"
      className={`glass-surface block rounded-xl p-4 transition-all duration-200 hover:bg-zinc-200/60 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:hover:bg-zinc-800/60 dark:focus:ring-blue-400 ${
        planning.recurringRule.isActive ? "" : "opacity-70"
      }`}
    >
      <header className="flex items-start justify-between gap-3 mb-3">
        <h3 className="flex-1 text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">{planning.name}</h3>

        <AmountText
          amount={planning.amount}
          tone={isExpense || planning.amount < 0 ? "expense" : "income"}
          icon={isExpense || planning.amount < 0 ? "minus" : "plus"}
          format="currency"
          currency={currency}
          className="justify-end text-right text-xl"
          amountClassName="font-semibold"
        />
      </header>

      {/* Account and Category Pills */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        {planning.accountId !== undefined && (
          <span className="glass-control inline-flex items-center gap-1 rounded px-2 py-1">
            <AccountName id={planning.accountId} />
          </span>
        )}

        {planning.categoryId !== undefined && (
          <span className="glass-control inline-flex items-center gap-1 rounded px-2 py-1">
            <CategoryName id={planning.categoryId} />
          </span>
        )}
      </div>

      {/* Next occurrence */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-200/80 pt-3 dark:border-zinc-800/80">
        <div className="flex items-center gap-2">
          {nextOccurrence ? (
            <>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Próxima:</span>
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {formatOccurrenceDate(nextOccurrence.expectedDate)}
              </span>
            </>
          ) : <span className="text-xs text-zinc-500 dark:text-zinc-400">Sin próxima ocurrencia</span>}
        </div>
        <span className="rounded bg-zinc-200/60 px-2.5 py-1 text-xs text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">Ver detalles</span>
      </div>
    </a>
  );
};

export default PlanningCard;
