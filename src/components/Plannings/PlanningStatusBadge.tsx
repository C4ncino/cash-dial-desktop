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
      style: "bg-zinc-800 text-zinc-400 border border-zinc-700",
    };
  }

  if (!occurrence) {
    return {
      label: "Sin pendientes",
      style: "bg-zinc-900 text-zinc-500 border border-zinc-800",
    };
  }

  if (occurrence.statusId === PLANNING_STATUS.COMPLETED) {
    return {
      label: "Completada",
      style: "bg-emerald-950/80 text-emerald-300 border border-emerald-800/80",
    };
  }

  if (occurrence.statusId === PLANNING_STATUS.CANCELED) {
    return {
      label: "Cancelada",
      style: "bg-zinc-800 text-zinc-400 border border-zinc-700",
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
      style: "bg-red-950/80 text-red-300 border border-red-800/80",
    };
  }

  if (occStartMs === todayStartMs) {
    return {
      label: "Hoy",
      style: "bg-amber-950/80 text-amber-300 border border-amber-800/80",
    };
  }

  return {
    label: "Próxima",
    style: "bg-blue-950/80 text-blue-300 border border-blue-800/80",
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
