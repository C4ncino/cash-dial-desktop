import { StatisticsSectionSkeleton } from "@/components/Statistics/StatisticsSkeleton";
import useDate from "@/hooks/useDate";
import { useStatisticsSection } from "@/hooks/useStatisticsSection";

type SecondaryMetricsProps = {
  metrics?: StatisticsSecondaryMetrics;
  symbol?: string;
};

const SecondaryMetrics = ({
  metrics: metricsProp,
  symbol: symbolProp,
}: SecondaryMetricsProps = {}) => {
  const { response, loading, symbol: storeSymbol } = useStatisticsSection();
  const metrics = metricsProp ?? response?.secondary;

  const { dateShort: highestSpendingDayDate } = useDate(
    metrics?.highestSpendingDay?.bucketStartMs ?? 0,
  );

  if (loading)
    return <StatisticsSectionSkeleton ariaLabel="Métricas secundarias" className="h-56" />;

  if (!metrics) return null;

  const symbol = symbolProp ?? storeSymbol ?? "";

  return (
    <section
      aria-label="Métricas secundarias"
      className="rounded-md border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="mb-3 text-lg font-semibold">Métricas secundarias</h2>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-sm opacity-70">Gasto promedio</dt>
          <dd>{metrics.avgExpense === null ? "—" : `${symbol}${metrics.avgExpense.toFixed(2)}`}</dd>
        </div>
        <div>
          <dt className="text-sm opacity-70">Gasto diario</dt>
          <dd>
            {symbol}
            {metrics.avgDailySpending.toFixed(2)}
          </dd>
        </div>
        <div>
          <dt className="text-sm opacity-70">Gasto más grande</dt>
          <dd>
            {metrics.largestExpense ? `${symbol}${metrics.largestExpense.amount.toFixed(2)}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm opacity-70">Día de mayor gasto</dt>
          <dd>{metrics.highestSpendingDay ? highestSpendingDayDate : "—"}</dd>
        </div>
        <div>
          <dt className="text-sm opacity-70">Movimientos</dt>
          <dd>{metrics.movementCount}</dd>
        </div>
        <div>
          <dt className="text-sm opacity-70">Transacciones</dt>
          <dd>{metrics.transactionCount}</dd>
        </div>
      </dl>
    </section>
  );
};

export default SecondaryMetrics;
