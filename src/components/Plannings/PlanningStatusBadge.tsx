import { useMemo } from "react";

import StatusBadge, { type StatusTone } from "@/components/General/StatusBadge";
import { PLANNING_STATUS } from "@/types/enums";

interface Props {
  occurrence?: PlanningOccurrence | null;
  isActive?: boolean;
  className?: string;
}

export function formatOccurrenceStatus(
  occurrence?: PlanningOccurrence | null,
  isActive = true,
): { label: string; tone: StatusTone } {
  if (!isActive) {
    return {
      label: "Inactiva",
      tone: "neutral",
    };
  }

  if (!occurrence) {
    return {
      label: "Sin pendientes",
      tone: "neutral",
    };
  }

  if (occurrence.statusId === PLANNING_STATUS.COMPLETED) {
    return {
      label: "Completada",
      tone: "success",
    };
  }

  if (occurrence.statusId === PLANNING_STATUS.CANCELED) {
    return {
      label: "Cancelada",
      tone: "neutral",
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
      tone: "danger",
    };
  }

  if (occStartMs === todayStartMs) {
    return {
      label: "Hoy",
      tone: "warning",
    };
  }

  return {
    label: "Próxima",
    tone: "info",
  };
}

const PlanningStatusBadge = ({ occurrence, isActive = true, className = "" }: Props) => {
  const { label, tone } = useMemo(
    () => formatOccurrenceStatus(occurrence, isActive),
    [occurrence, isActive],
  );

  return (
    <StatusBadge tone={tone} className={className}>
      {label}
    </StatusBadge>
  );
};

export default PlanningStatusBadge;
