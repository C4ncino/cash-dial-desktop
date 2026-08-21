import { useStore } from "zustand/react";

import { movementsStore } from "@/stores/movementsStore";

import MovementCard from "./MovementCard";

const MovementsLanding = () => {
  const allIds = useStore(movementsStore, (state) => state.allIds);
  const byId = useStore(movementsStore, (state) => state.byId);
  const movements = allIds.map((id) => byId[id]).filter(Boolean);

  return (
    <section className="glass-surface mx-auto max-w-md rounded-xl px-6 py-6 md:max-w-2xl">
      <h2 className="pb-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-100">Últimos movimientos</h2>
      <ul className="flex flex-col gap-2">
        {movements.map((movement) => (
          <li key={movement.id}>
            <MovementCard movement={movement} />
          </li>
        ))}
      </ul>
      <a className="block w-full text-right px-2 underline" href="/movements">
        Mostrar más
      </a>
    </section>
  );
};

export default MovementsLanding;
