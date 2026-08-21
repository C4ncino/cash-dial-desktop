import { useMemo } from "react";
import { PLANNING_STATUS } from "@/types/enums";

interface Props {
  occurrence?: PlanningOccurrence | null;
  isActive?: boolean;
  className?: string;
}

export function formatOccurrenceStatus(
  occurrence?: PlanningOccurrence | null,
  isActive = true,
): { label: string; style: string } {
  if (!isActive) {
    return {
      label: "Inactiva",
      style: "border border-zinc-200 bg-zinc-100/60 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400",
    };
  }

  if (!occurrence) {
    return {
      label: "Sin pendientes",
      style: "border border-zinc-200 bg-zinc-100/60 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400",
    };
  }

  if (occurrence.statusId === PLANNING_STATUS.COMPLETED) {
    return {
      label: "Completada",
      style: "border border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/80 dark:text-emerald-300",
    };
  }

  if (occurrence.statusId === PLANNING_STATUS.CANCELED) {
    return {
      label: "Cancelada",
      style: "border border-zinc-200 bg-zinc-100/60 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400",
    };
  }

  // Status is PENDING
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStartMs = today.getTime();

  const occDate = new Date(occurrence.expectedDate);
  occDate.setHours(0, 0, 0, 0);
  const occStartMs = occDate.getTime();

  if (occurrence.isOverdue || occStartMs < todayStartMs) {
    return {
      label: "Vencida",
      style: "border border-red-200/80 bg-red-50/80 text-red-700 dark:border-red-800/80 dark:bg-red-950/80 dark:text-red-300",
    };
  }

  if (occStartMs === todayStartMs) {
    return {
      label: "Hoy",
      style: "border border-amber-200/80 bg-amber-50/80 text-amber-700 dark:border-amber-800/80 dark:bg-amber-950/80 dark:text-amber-300",
    };
  }

  return {
    label: "Próxima",
    style: "border border-blue-200/80 bg-blue-50/80 text-blue-700 dark:border-blue-800/80 dark:bg-blue-950/80 dark:text-blue-300",
  };
}

const PlanningStatusBadge = ({ occurrence, isActive = true, className = "" }: Props) => {
  const { label, style } = useMemo(
    () => formatOccurrenceStatus(occurrence, isActive),
    [occurrence, isActive],
  );

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${style} ${className}`}
    >
      {label}
    </span>
  );
};

export default PlanningStatusBadge;
