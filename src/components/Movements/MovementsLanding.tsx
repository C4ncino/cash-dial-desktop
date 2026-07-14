import { useStore } from "zustand/react";

import { movementsStore } from "@/stores/movementsStore";

import MovementCard from "./MovementCard";

const MovementsLanding = () => {
  const allIds = useStore(movementsStore, (state) => state.allIds);
  const byId = useStore(movementsStore, (state) => state.byId);
  const movements = allIds.map((id) => byId[id]).filter(Boolean);

  return (
    <section className="px-6 py-6 rounded-xl max-w-md md:max-w-2xl mx-auto bg-white/5 backdrop-blur-md border border-white/10 shadow-lg">
      <h2 className="text-2xl font-semibold dark:text-white pb-2">Últimos movimientos</h2>
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
