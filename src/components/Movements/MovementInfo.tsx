import { useStore } from "zustand";

import { accountsStore } from "@/stores/accountsStore";
import { categoryStore } from "@/stores/categoryStore";
import { currencyStore } from "@/stores/currencyStore";
import { movementsStore } from "@/stores/movementsStore";

import CurrencyConversion from "./SingleView/CurrencyConversion";
import Details from "./SingleView/Details";
import Header from "./SingleView/Header";
import Installments from "./SingleView/Installments";

const MovementInfo = () => {
  const id =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("id"))
      : null;

  const movement = useStore(movementsStore, (state) => (id ? state.byId[id] : undefined));

  const account = useStore(accountsStore, (state) =>
    state.accounts.find((a) => a.id === movement?.accountId),
  );

  const toAccount = useStore(accountsStore, (state) =>
    movement?.toAccountId ? state.accounts.find((a) => a.id === movement?.toAccountId) : undefined,
  );

  const category = useStore(categoryStore, (state) =>
    state.categories.find((c) => c.id === movement?.categoryId),
  );

  const movementTypeObj = useStore(movementsStore, (state) =>
    state.types.find((t) => t.id === movement?.typeId),
  );

  const movementCurrency = useStore(currencyStore, (state) =>
    state.currencies.find((c) => c.id === movement?.currencyId),
  );

  const accountCurrency = useStore(currencyStore, (state) =>
    account ? state.currencies.find((c) => c.id === account.currencyId) : undefined,
  );

  if (
    !id ||
    !movement ||
    movementCurrency === undefined ||
    accountCurrency === undefined ||
    !category ||
    !account
  ) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-zinc-900 rounded-lg border border-zinc-800 text-center">
        <h2 className="text-xl font-bold text-red-500 mb-2">Movimiento no encontrado</h2>
        <p className="text-zinc-400">El movimiento solicitado no existe o ha sido eliminado.</p>
      </div>
    );
  }

  return (
    <>
      <Header
        category={category}
        currency={movementCurrency}
        movementType={movement.typeId}
        amount={movement.originalAmount}
        timestamp={movement.timestamp}
      />

      <Details
        {...movement}
        categoryId={category.id}
        typeName={movementTypeObj?.name || ""}
        accountId={account.id}
        toAccountId={toAccount?.id}
      />

      {movementCurrency.id !== accountCurrency.id && (
        <CurrencyConversion
          movementCurrency={movementCurrency}
          accountCurrency={accountCurrency}
          {...movement}
        />
      )}

      {movement.installmentsData && movement.installmentsData.length > 0 && (
        <Installments
          movementCurrency={movementCurrency}
          installmentsData={movement.installmentsData}
        />
      )}
    </>
  );
};

export default MovementInfo;
