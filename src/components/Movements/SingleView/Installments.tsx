import { Icon } from "@iconify/react";

import MoneyText from "@/components/General/MoneyText";

interface Props {
  installmentsData: MovementInstallment[];
  movementCurrency: Currency;
}

const Installments = ({ installmentsData, movementCurrency }: Props) => {
  console.log("installmentsData", installmentsData);

  return (
    <section className="space-y-3 mt-3">
      <h2 className="text-lg font-semibold text-zinc-300">Mensualidades</h2>

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
        {installmentsData.map((installment) => (
          <div key={installment.id}>
            <dt className="text-sm text-zinc-500 font-medium">
              Mensualidad {installment.installmentNumber} de {installment.totalInstallments}
            </dt>

            <dd className="text-base text-zinc-200 mt-0.5">
              <MoneyText amount={installment.amount} currency={movementCurrency} />

              {installment.paid && installment.paidTimestamp && (
                <p className="text-green-400 flex flex-row items-center gap-1">
                  <Icon icon="iconoir:check-circle" />
                  Pagado el{" "}
                  <time dateTime={new Date(installment.paidTimestamp).toISOString()}>
                    {new Date(installment.paidTimestamp).toLocaleDateString()}
                  </time>
                </p>
              )}

              {!installment.paid && (
                <p className="text-amber-400 flex flex-row items-center gap-1">
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
