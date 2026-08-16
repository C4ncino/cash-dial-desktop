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
    <section aria-label="Resumen" className="grid gap-3 sm:grid-cols-4">
      <dl className="contents">
        <div className="rounded-md border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <dt className="text-sm opacity-70">Ingresos</dt>
          <dd className="mt-1 text-2xl font-semibold text-emerald-600">
            <data value={overview.income}>{money(overview.income, symbol)}</data>
          </dd>
        </div>
        <div className="rounded-md border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <dt className="text-sm opacity-70">Gastos</dt>
          <dd className="mt-1 text-2xl font-semibold text-red-600">
            <data value={overview.expenses}>{money(overview.expenses, symbol)}</data>
          </dd>
        </div>
        <div className="rounded-md border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <dt className="text-sm opacity-70">Flujo de efectivo neto</dt>
          <dd className="mt-1 text-2xl font-semibold">
            <data value={overview.netCashFlow}>{money(overview.netCashFlow, symbol)}</data>
          </dd>
        </div>
        <div className="rounded-md border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <dt className="text-sm opacity-70">Tasa de ahorro</dt>
          <dd className="mt-1 text-2xl font-semibold">
            {overview.savingsRate === null ? "—" : `${overview.savingsRate.toFixed(2)}%`}
          </dd>
        </div>
      </dl>
    </section>
  );
};

export default OverviewCard;
