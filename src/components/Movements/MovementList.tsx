import { useStore } from "zustand/react";

import { groupMovementsByDate, movementsStore } from "@/stores/movementsStore";

import MovementCard from "./MovementCard";

interface Props {
  movementIds: number[];
  needCompact?: boolean;
}

const formatDateHeader = (timestamp: number) => {
  const date = new Date(timestamp);
  const formatted = date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // Capitalize the first letter
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const MovementList = ({ movementIds, needCompact }: Props) => {
  const byId = useStore(movementsStore, (state) => state.byId);

  if (movementIds === undefined)
    return <div className="py-8 text-center text-zinc-500">No hay movimientos registrados.</div>;

  if (movementIds.length === 0) {
    return <div className="py-8 text-center text-zinc-500">No hay movimientos registrados.</div>;
  }

  const groups = groupMovementsByDate(movementIds, byId);

  return (
    <section className={needCompact ? "space-y-1" : "space-y-6"}>
      {groups.map((group) => (
        <div key={group.dayTimestamp} className="space-y-2">
          <h3 className="sticky top-16 z-10 rounded-lg py-1 text-sm font-semibold text-zinc-500 backdrop-blur-md dark:text-zinc-300 md:top-0">
            {formatDateHeader(group.dayTimestamp)}
          </h3>
          <ul className="flex flex-col gap-2 rounded-md overflow-hidden p-1">
            {group.ids.map((id) => (
              <li key={id}>
                {byId[id] ? (
                  <MovementCard movement={byId[id]} showTime={!needCompact} variant={needCompact ? "compact" : "default"} />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
};

export default MovementList;
