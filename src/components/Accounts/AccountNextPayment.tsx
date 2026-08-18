import { Icon } from "@iconify/react";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "zustand";

import CreditCardPaymentForm from "@/components/Accounts/CreditCardPaymentForm";
import AmountText from "@/components/General/AmountText";
import useDate from "@/hooks/useDate";
import { accountsStore } from "@/stores/accountsStore";
import { currencyStore } from "@/stores/currencyStore";
import { movementsStore } from "@/stores/movementsStore";

interface Props {
  accountId: number;
}

const AccountNextPayment = ({ accountId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [nextPayment, setNextPayment] = useState<CreditCardNextPayment | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const fetchNextPayment = useCallback(async () => {
    setLoading(true);
    setError(false);
    accountsStore
      .getState()
      .getNextPayment(accountId)
      .then((data) => {
        setNextPayment(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [accountId]);

  useEffect(() => {
    fetchNextPayment();
  }, [fetchNextPayment]);

  const { dateShort } = useDate(nextPayment?.paymentDate || 0);

  const account = useStore(accountsStore, (state) =>
    state.accounts.find((acc) => acc.id === accountId),
  );

  if (!account) return null;
  const currency = currencyStore.getState().getById(account.currencyId) as Currency;

  if (loading) {
    return (
      <section className="mt-4">
        <p className="text-zinc-400">Cargando próximo pago...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-4">
        <p className="text-red-400">Error al cargar el próximo pago.</p>
      </section>
    );
  }

  if (!nextPayment || nextPayment.movements.length === 0) {
    return (
      <section className="mt-4">
        <p className="text-green-400">No hay pagos pendientes para este periodo.</p>
      </section>
    );
  }

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setExpanded(false);
    fetchNextPayment();
  };

  return (
    <section className="mt-6 border border-zinc-700 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between p-4 bg-zinc-800 hover:bg-zinc-750 transition-colors"
      >
        <div className="flex flex-col items-start text-left">
          <h2 className="text-lg font-semibold text-zinc-100">Próximo pago</h2>
          <p className="text-sm text-zinc-400">Fecha límite: {dateShort}</p>
        </div>

        <div className="flex items-center space-x-4">
          <AmountText
            amount={nextPayment.totalAmount}
            currency={currency}
            format="currency"
            inline
            className="text-xl font-medium"
          />
          <Icon
            icon="iconoir:nav-arrow-down"
            className={`transition-transform text-2xl ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {expanded && !showPaymentForm && (
        <>
          <ul className="bg-zinc-900 border-t border-zinc-700 divide-y divide-zinc-800">
            {nextPayment.movements.map((movementInfo) => {
              const movement = movementsStore.getState().byId[movementInfo.movementId];
              const description = movement?.description || "Movimiento";

              const installmentTexts = movementInfo.installmentIds
                .map((id) => {
                  const installment = movement?.installmentsData?.find((i) => i.id === id);
                  if (installment) {
                    return `Cuota ${installment.installmentNumber} de ${installment.totalInstallments}`;
                  }
                  return null;
                })
                .filter(Boolean);

              const installmentText =
                installmentTexts.length > 0 ? installmentTexts.join(", ") : "Pago";

              return (
                <li key={movementInfo.movementId} className="p-3 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-zinc-200">{description}</span>
                    <span className="text-xs text-zinc-500">{installmentText}</span>
                  </div>
                  <AmountText
                    amount={movementInfo.amount}
                    currency={currency}
                    format="currency"
                    inline
                    className="text-zinc-300"
                  />
                </li>
              );
            })}
          </ul>
          <menu className="bg-zinc-900 border-t border-zinc-700 p-3 flex justify-end">
            <button
              type="button"
              onClick={() => setShowPaymentForm(true)}
              className="flex items-center gap-2 border-2 border-green-600 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 hover:border-green-700 hover:cursor-pointer text-sm"
            >
              <Icon icon="iconoir:mastercard-card" className="text-lg" />
              Pagar Tarjeta
            </button>
          </menu>
        </>
      )}

      {expanded && showPaymentForm && (
        <CreditCardPaymentForm
          creditAccountId={accountId}
          totalAmount={nextPayment.totalAmount}
          installmentIds={nextPayment.movements.flatMap((m) => m.installmentIds)}
          currency={currency}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPaymentForm(false)}
        />
      )}
    </section>
  );
};

export default AccountNextPayment;
