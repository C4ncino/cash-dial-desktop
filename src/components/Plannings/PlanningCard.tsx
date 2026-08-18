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
      className={`block rounded-xl border p-4 transition-all duration-200 bg-zinc-950/80 hover:bg-zinc-900/60 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        planning.recurringRule.isActive ? "border-zinc-800" : "border-zinc-800/50 opacity-70"
      }`}
    >
      <header className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base text-white tracking-tight">{planning.name}</h3>
          </div>
        </div>

        <div className="text-right">
          <AmountText
            amount={planning.amount}
            tone={isExpense || planning.amount < 0 ? "expense" : "income"}
            icon={isExpense || planning.amount < 0 ? "minus" : "plus"}
            format="currency"
            currency={currency}
            className="text-xl justify-end"
            amountClassName="font-semibold"
          />
        </div>
      </header>

      {/* Account and Category Pills */}
      <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400 mb-3">
        {planning.accountId !== undefined && (
          <span className="inline-flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
            <AccountName id={planning.accountId} />
          </span>
        )}

        {planning.categoryId !== undefined && (
          <span className="inline-flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
            <CategoryName id={planning.categoryId} />
          </span>
        )}
      </div>

      {/* Next occurrence */}
      <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {nextOccurrence ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Próxima:</span>
              <span className="text-xs font-medium text-zinc-200">
                {formatOccurrenceDate(nextOccurrence.expectedDate)}
              </span>
            </div>
          ) : <span className="text-xs text-zinc-500">Sin próxima ocurrencia</span>}
        </div>
        <span className="text-xs text-zinc-300 px-2.5 py-1 rounded bg-zinc-800">Ver detalles</span>
      </div>
    </a>
  );
};

export default PlanningCard;
