import { useStore } from "zustand/react";

import MovementList from "@/components/Movements/MovementList";
import { movementsStore } from "@/stores/movementsStore";

const GlobalMovements = () => {
  const allIds = useStore(movementsStore, (state) => state.allIds);

  return (
    <section>
      <MovementList movementIds={allIds} />
    </section>
  );
};

export default GlobalMovements;
