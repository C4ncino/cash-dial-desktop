import { MOVEMENT_TYPES } from "@/types/enums";

interface Props {
  categoryName: string;
  typeName: string;
  typeId: MOVEMENT_TYPES;
  installments?: number;
  description?: string;
  accountName: string;
  toAccountName?: string;
}

const Details = ({
  categoryName,
  typeName,
  typeId,
  installments,
  description,
  accountName,
  toAccountName,
}: Props) => {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-zinc-300">Detalles del movimiento</h2>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
        <div>
          <dt className="text-sm text-zinc-500 font-medium">Categoría</dt>
          <dd className="text-base text-zinc-200 mt-0.5">{categoryName}</dd>
        </div>

        <div>
          <dt className="text-sm text-zinc-500 font-medium">Tipo de movimiento</dt>
          <dd className="text-base text-zinc-200 mt-0.5">{typeName}</dd>
        </div>

        <div>
          <dt className="text-sm text-zinc-500 font-medium">
            {typeId === MOVEMENT_TYPES.TRANSFER ? "Cuenta origen" : "Cuenta"}
          </dt>
          <dd className="text-base text-zinc-200 mt-0.5">{accountName}</dd>
        </div>

        {typeId === MOVEMENT_TYPES.TRANSFER && toAccountName && (
          <div>
            <dt className="text-sm text-zinc-500 font-medium">Cuenta destino</dt>
            <dd className="text-base text-zinc-200 mt-0.5">{toAccountName}</dd>
          </div>
        )}

        {installments && (
          <div>
            <dt className="text-zinc-500 font-medium">Mensualidades</dt>
            <dd className="text-zinc-300 mt-0.5">{installments}</dd>
          </div>
        )}

        {description && (
          <div className="md:col-span-2">
            <dt className="text-sm text-zinc-500 font-medium">Descripción</dt>
            <dd className="text-base text-zinc-200 mt-0.5 whitespace-pre-wrap">{description}</dd>
          </div>
        )}
      </dl>
    </section>
  );
};

export default Details;
