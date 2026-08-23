import { OverviewSkeleton } from "@/components/Statistics/StatisticsSkeleton";
import { useStatisticsSection } from "@/hooks/useStatisticsSection";

type OverviewCardProps = {
  overview?: StatisticsOverview;
  symbol?: string;
};

const money = (value: number, symbol = "") => `${symbol}${value.toFixed(2)}`;

const OverviewCard = ({ overview: overviewProp, symbol: symbolProp }: OverviewCardProps = {}) => {
  const { response, loading, symbol: storeSymbol } = useStatisticsSection();
  const overview = overviewProp ?? response?.overview;
  if (loading) return <OverviewSkeleton />;
  if (!overview) return null;
  const symbol = symbolProp ?? storeSymbol;

  return (
    <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <dl className="contents">
        <div className="glass-surface rounded-xl p-4 sm:p-5">
          <dt className="text-sm opacity-70">Ingresos</dt>
          <dd className="mt-1 break-words text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 lg:text-2xl">
            <data value={overview.income}>{money(overview.income, symbol)}</data>
          </dd>
        </div>
        <div className="glass-surface rounded-xl p-4 sm:p-5">
          <dt className="text-sm opacity-70">Gastos</dt>
          <dd className="mt-1 break-words text-xl font-semibold tabular-nums text-red-600 dark:text-red-400 lg:text-2xl">
            <data value={overview.expenses}>{money(overview.expenses, symbol)}</data>
          </dd>
        </div>
        <div className="glass-surface rounded-xl p-4 sm:p-5">
          <dt className="text-sm opacity-70">Flujo de efectivo neto</dt>
          <dd className="mt-1 break-words text-xl font-semibold tabular-nums lg:text-2xl">
            <data value={overview.netCashFlow}>{money(overview.netCashFlow, symbol)}</data>
          </dd>
        </div>
        <div className="glass-surface rounded-xl p-4 sm:p-5">
          <dt className="text-sm opacity-70">Tasa de ahorro</dt>
          <dd className="mt-1 break-words text-xl font-semibold tabular-nums lg:text-2xl">
            {overview.savingsRate === null ? "—" : `${overview.savingsRate.toFixed(2)}%`}
          </dd>
        </div>
      </dl>
    </section>
  );
};

export default OverviewCard;
