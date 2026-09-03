import { Icon } from "@iconify/react";

import AmountText from "@/components/General/AmountText";

interface Props {
  installmentsData: MovementInstallment[];
  movementCurrency: Currency;
}

const Installments = ({ installmentsData, movementCurrency }: Props) => {
  console.log("installmentsData", installmentsData);

  return (
    <section className="space-y-3 mt-3">
      <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Mensualidades</h2>

      <dl className="glass-surface grid grid-cols-1 gap-4 rounded-lg p-4 md:grid-cols-2">
        {installmentsData.map((installment) => (
          <div key={installment.id}>
            <dt className="text-sm text-zinc-500 font-medium">
              Mensualidad {installment.installmentNumber} de {installment.totalInstallments}
            </dt>

            <dd className="mt-0.5 text-base text-zinc-700 dark:text-zinc-300">
              <AmountText
                amount={installment.amount}
                currency={movementCurrency}
                format="currency"
                inline
              />

              {installment.paid && installment.paidTimestamp && (
                <p className="flex flex-row items-center gap-1 text-green-600 dark:text-green-400">
                  <Icon icon="iconoir:check-circle" />
                  Pagado el{" "}
                  <time dateTime={new Date(installment.paidTimestamp).toISOString()}>
                    {new Date(installment.paidTimestamp).toLocaleDateString()}
                  </time>
                </p>
              )}

              {!installment.paid && (
                <p className="flex flex-row items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Icon icon="iconoir:clock" />
                  Vence el{" "}
                  <time dateTime={new Date(installment.dueTimestamp).toISOString()}>
                    {new Date(installment.dueTimestamp).toLocaleDateString()}
                  </time>
                </p>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default Installments;
