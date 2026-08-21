import PlanningStatusBadge from "@/components/Plannings/PlanningStatusBadge";
import AmountText from "@/components/General/AmountText";
import { MOVEMENT_TYPES } from "@/types/enums";

interface Props {
  planning: Planning;
  occurrence: PlanningOccurrence;
}

export function formatOccurrenceDueDifference(timestamp: number, now = Date.now()): string {
  const dueDate = new Date(timestamp);
  const today = new Date(now);
  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const days = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days === -1) return "Ayer";
  return days > 0 ? `En ${days} días` : `Hace ${Math.abs(days)} días`;
}

const UrgentOccurrenceCard = ({ planning, occurrence }: Props) => {
  const isExpense = planning.typeId === MOVEMENT_TYPES.EXPENSE;

  return (
    <a
      href={`/planning-detail?id=${planning.id}`}
      data-testid="urgent-occurrence-card"
      className="glass-surface block rounded-xl p-4 transition-colors hover:border-zinc-400 hover:bg-zinc-200/60 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/60"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="mt-1 font-semibold text-zinc-950 dark:text-zinc-100">{planning.name}</h3>
        <PlanningStatusBadge occurrence={occurrence} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <dd>
          <AmountText
            amount={planning.amount}
            tone={isExpense || planning.amount < 0 ? "expense" : "income"}
            icon={isExpense || planning.amount < 0 ? "minus" : "plus"}
            format="number"
            className="text-lg"
            amountClassName="font-semibold"
          />
        </dd>
        <dd className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
          <time dateTime={new Date(occurrence.expectedDate).toISOString()}>
            {formatOccurrenceDueDifference(occurrence.expectedDate)}
          </time>
        </dd>
      </dl>
    </a>
  );
};

export default UrgentOccurrenceCard;
