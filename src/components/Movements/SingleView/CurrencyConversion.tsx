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
      <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
        Información de divisa
      </h2>

      <dl className="glass-surface grid grid-cols-1 gap-4 rounded-lg p-4 md:grid-cols-2">
        <div>
          <dt className="text-sm text-zinc-500 font-medium">Monto original</dt>
          <dd className="mt-0.5 text-base text-zinc-700 dark:text-zinc-300">
            <AmountText
              amount={originalAmount}
              currency={movementCurrency}
              format="currency"
              inline
            />
          </dd>
        </div>

        <div>
          <dt className="text-sm text-zinc-500 font-medium">Divisa</dt>
          <dd className="mt-0.5 text-base text-zinc-700 dark:text-zinc-300">
            {movementCurrency.name} ({movementCurrency.code})
          </dd>
        </div>

        <div>
          <dt className="text-sm text-zinc-500 font-medium">Tipo de cambio</dt>
          <dd className="mt-0.5 text-base text-zinc-700 dark:text-zinc-300">
            1 {movementCurrency.code} = {exchangeRate.toFixed(4)} {accountCurrency?.code}
          </dd>
        </div>

        <div>
          <dt className="text-sm text-zinc-500 font-medium">Monto convertido</dt>
          <dd className="mt-0.5 text-base text-zinc-700 dark:text-zinc-300">
            <AmountText
              amount={accountAmount}
              currency={accountCurrency}
              format="currency"
              inline
            />
          </dd>
        </div>
      </dl>
    </section>
  );
};

export default CurrencyConversion;
