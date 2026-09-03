import { useStore } from "zustand/react";

import { movementsStore } from "@/stores/movementsStore";

import MovementCard from "./MovementCard";

const MovementsLanding = () => {
  const allIds = useStore(movementsStore, (state) => state.allIds);
  const byId = useStore(movementsStore, (state) => state.byId);
  const movements = allIds
    .map((id) => byId[id])
    .filter(Boolean)
    .slice(0, 5);

  return (
    <article className="space-y-4 my-12" aria-labelledby="recent-movements-title">
      <header className="flex items-center justify-between gap-4">
        <h2
          id="recent-movements-title"
          className="text-2xl font-semibold text-zinc-950 dark:text-zinc-100"
        >
          Últimos movimientos
        </h2>
        <a
          className="focus-ring shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-blue-600 dark:text-blue-400"
          href="/movements"
        >
          Ver todos
        </a>
      </header>
      {movements.length ? (
        <ul className="glass-surface flex flex-col gap-1 overflow-hidden rounded-xl p-2">
          {movements.map((movement) => (
            <li key={movement.id}>
              <MovementCard movement={movement} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="glass-surface rounded-xl border-dashed p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No hay movimientos registrados.
        </p>
      )}
    </article>
  );
};

export default MovementsLanding;
