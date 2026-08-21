import AccountName from "@/components/General/AccountName";
import CategoryName from "@/components/General/CategoryName";
import { MOVEMENT_TYPES } from "@/types/enums";

interface Props {
  categoryId: number;
  typeName: string;
  typeId: MOVEMENT_TYPES;
  installments?: number;
  description?: string;
  accountId: number;
  toAccountId?: number;
}

const Details = ({
  categoryId,
  typeName,
  typeId,
  installments,
  description,
  accountId,
  toAccountId,
}: Props) => {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Detalles del movimiento</h2>
      <dl className="glass-surface grid grid-cols-1 gap-4 rounded-lg p-4 md:grid-cols-2">
        <div>
          <dt className="text-sm text-zinc-500 font-medium">Categoría</dt>
          <dd className="mt-0.5 text-base text-zinc-700 dark:text-zinc-300"><CategoryName id={categoryId} /></dd>
        </div>

        <div>
          <dt className="text-sm text-zinc-500 font-medium">Tipo de movimiento</dt>
          <dd className="mt-0.5 text-base text-zinc-700 dark:text-zinc-300">{typeName}</dd>
        </div>

        <div>
          <dt className="text-sm text-zinc-500 font-medium">
            {typeId === MOVEMENT_TYPES.TRANSFER ? "Cuenta origen" : "Cuenta"}
          </dt>
          <dd className="mt-0.5 text-base text-zinc-700 dark:text-zinc-300"><AccountName id={accountId} /></dd>
        </div>

        {typeId === MOVEMENT_TYPES.TRANSFER && toAccountId !== undefined && (
          <div>
            <dt className="text-sm text-zinc-500 font-medium">Cuenta destino</dt>
            <dd className="mt-0.5 text-base text-zinc-700 dark:text-zinc-300"><AccountName id={toAccountId} /></dd>
          </div>
        )}

        {installments && (
          <div>
            <dt className="text-zinc-500 font-medium">Mensualidades</dt>
            <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">{installments}</dd>
          </div>
        )}

        {description && (
          <div className="md:col-span-2">
            <dt className="text-sm text-zinc-500 font-medium">Descripción</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-base text-zinc-700 dark:text-zinc-300">{description}</dd>
          </div>
        )}
      </dl>
    </section>
  );
};

export default Details;
