import { useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/General/EmptyState";
import { useAccounts } from "@/hooks/useStores";
import { ACCOUNT_TYPES } from "@/types/enums";

import AccountCard from "./AccountCard";

export default function AccountsList() {
  const accounts = useAccounts((state) => state.accounts);
  const [search, setSearch] = useState("");
  const [typeId, setTypeId] = useState(0);
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return accounts.filter((account) => {
      const matchesName = !query || account.name.toLocaleLowerCase().includes(query);
      const matchesType = typeId === 0 || account.type.id === typeId;
      const matchesStatus =
        status === "all" || (status === "active" ? account.isActive : !account.isActive);
      return matchesName && matchesType && matchesStatus;
    });
  }, [accounts, search, status, typeId]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / 8));
  const pageAccounts = filteredAccounts.slice((page - 1) * 8, page * 8);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Pagination resets whenever the result inputs change.
  useEffect(() => {
    setPage(1);
  }, [accounts, search, status, typeId]);

  if (!accounts.length)
    return (
      <EmptyState
        title="Aún no tienes cuentas."
        description="Añade una cuenta para comenzar a registrar tus movimientos."
      />
    );
  return (
    <div className="space-y-4">
      <search className="grid gap-3 sm:grid-cols-3">
        <legend className="sr-only">Filtros de cuentas</legend>
        <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          <label htmlFor="account-search">Buscar por nombre</label>
          <input
            id="account-search"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setTypeId(0);
            }}
            className="glass-control w-full rounded px-3 py-2 text-zinc-950 dark:text-zinc-100"
          />
        </div>
        <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          <label htmlFor="account-type-filter">Tipo</label>
          <select
            id="account-type-filter"
            value={typeId}
            onChange={(event) => setTypeId(Number(event.target.value))}
            className="glass-control w-full rounded px-3 py-2 text-zinc-950 dark:text-zinc-100"
          >
            <option value={0}>Todas</option>
            <option value={ACCOUNT_TYPES.CASH}>Efectivo</option>
            <option value={ACCOUNT_TYPES.DEBIT}>Débito</option>
            <option value={ACCOUNT_TYPES.CREDIT}>Crédito</option>
          </select>
        </div>
        <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          <label htmlFor="account-status-filter">Estado</label>
          <select
            id="account-status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="glass-control w-full rounded px-3 py-2 text-zinc-950 dark:text-zinc-100"
          >
            <option value="all">Todas</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </select>
        </div>
      </search>

      {pageAccounts.length ? (
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4">
          {pageAccounts.map((account) => (
            <li key={account.id} className="min-w-0">
              <AccountCard {...account} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No hay cuentas que coincidan con estos filtros."
          description="Cambia la búsqueda o los filtros para ver más cuentas."
        />
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-4" aria-label="Paginación de cuentas">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="focus-ring rounded border border-zinc-400 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600"
            aria-label="Página anterior"
          >
            Anterior
          </button>
          <span className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="focus-ring rounded border border-zinc-400 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600"
            aria-label="Página siguiente"
          >
            Siguiente
          </button>
        </nav>
      )}
    </div>
  );
}
