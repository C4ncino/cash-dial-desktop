import { useStore } from "zustand";

import MovementList from "@/components/Movements/MovementList";
import { movementsStore } from "@/stores/movementsStore";

const AccountMovements = () => {
  const accountId =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("id"))
      : null;

  const movementIds = useStore(movementsStore, (s) => s.byAccount[accountId as number]);

  return (
    <section className="mt-6">
      <h2 className="text-xl font-semibold dark:text-white mb-4">Historial de movimientos</h2>
      <MovementList movementIds={movementIds} />
    </section>
  );
};

export default AccountMovements;
