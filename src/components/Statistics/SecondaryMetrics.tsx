import { StatisticsSectionSkeleton } from "@/components/Statistics/StatisticsSkeleton";
import useDate from "@/hooks/useDate";
import { useStatisticsSection } from "@/hooks/useStatisticsSection";
import { formatStatMoney } from "@/lib/formatters";

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
    <section aria-label="Métricas secundarias" className="glass-surface rounded-xl p-4 sm:p-5">
      <h2 className="mb-3 text-lg font-semibold">Métricas secundarias</h2>
      <dl className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-sm opacity-70">Gasto promedio</dt>
          <dd>{metrics.avgExpense === null ? "—" : formatStatMoney(metrics.avgExpense, symbol)}</dd>
        </div>
        <div>
          <dt className="text-sm opacity-70">Gasto diario</dt>
          <dd>{formatStatMoney(metrics.avgDailySpending, symbol)}</dd>
        </div>
        <div>
          <dt className="text-sm opacity-70">Gasto más grande</dt>
          <dd>
            {metrics.largestExpense ? formatStatMoney(metrics.largestExpense.amount, symbol) : "—"}
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
