import AmountText from "@/components/General/AmountText";

interface Props {
  originalAmount: number;
  accountAmount: number;
  movementCurrency: Currency;
  accountCurrency: Currency;
}

const CurrencyConversion = ({
  originalAmount,
  accountAmount,
  movementCurrency,
  accountCurrency,
}: Props) => {
  const exchangeRate = originalAmount > 0 ? accountAmount / originalAmount : 0;

  return (
    <section className="space-y-3 mt-3">
      <h2 className="text-lg font-semibold text-zinc-300">Información de divisa</h2>

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
        <div>
          <dt className="text-sm text-zinc-500 font-medium">Monto original</dt>
          <dd className="text-base text-zinc-200 mt-0.5">
            <AmountText amount={originalAmount} currency={movementCurrency} format="currency" inline />
          </dd>
        </div>

        <div>
          <dt className="text-sm text-zinc-500 font-medium">Divisa</dt>
          <dd className="text-base text-zinc-200 mt-0.5">
            {movementCurrency.name} ({movementCurrency.code})
          </dd>
        </div>

        <div>
          <dt className="text-sm text-zinc-500 font-medium">Tipo de cambio</dt>
          <dd className="text-base text-zinc-200 mt-0.5">
            1 {movementCurrency.code} = {exchangeRate.toFixed(4)} {accountCurrency?.code}
          </dd>
        </div>

        <div>
          <dt className="text-sm text-zinc-500 font-medium">Monto convertido</dt>
          <dd className="text-base text-zinc-200 mt-0.5">
            <AmountText amount={accountAmount} currency={accountCurrency} format="currency" inline />
          </dd>
        </div>
      </dl>
    </section>
  );
};

export default CurrencyConversion;
