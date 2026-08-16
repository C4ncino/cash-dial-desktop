import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { useStore } from "zustand";

import { StatisticsSectionSkeleton } from "@/components/Statistics/StatisticsSkeleton";
import { useStatisticsSection } from "@/hooks/useStatisticsSection";
import { PERIOD_GRANULARITIES, type StatisticsPeriod } from "@/lib/statisticsQuery";
import { statisticsStore } from "@/stores/statisticsStore";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type TrendsChartProps = {
  points?: StatisticsTimeSeriesPoint[];
  symbol?: string;
};

const label = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("es-MX", {
    month: "short",
    day: "numeric",
  });

const granularityLabels: Record<StatisticsGranularity, string> = {
  day: "Día",
  week: "Semana",
  month: "Mes",
  year: "Año",
};

const TrendsChart = ({ points: pointsProp, symbol: symbolProp }: TrendsChartProps = {}) => {
  const { response, loading, symbol: storeSymbol } = useStatisticsSection();
  const period = useStore(statisticsStore, (state) => state.period ?? "month") as StatisticsPeriod;
  const granularity = useStore(statisticsStore, (state) => state.granularity ?? "day");
  const points = pointsProp ?? response?.timeseries ?? [];
  const symbol = symbolProp ?? storeSymbol ?? "";
  const data = useMemo(
    () => ({
      labels: points.map((point) => label(point.bucketStartMs)),
      datasets: [
        {
          label: "Ingresos",
          data: points.map((point) => point.income),
          backgroundColor: "#10b981",
        },
        {
          label: "Gastos",
          data: points.map((point) => point.expense),
          backgroundColor: "#ef4444",
        },
      ],
    }),
    [points],
  );

  if (loading) {
    return <StatisticsSectionSkeleton ariaLabel="Tendencias" className="h-64" />;
  }
  if (!pointsProp && !response) return null;

  return (
    <section
      aria-label="Tendencias"
      className="rounded-md border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Tendencias</h2>
        <label className="flex items-center gap-2 text-sm" htmlFor="statisticsGranularity">
          Agrupar por
          <select
            id="statisticsGranularity"
            value={granularity}
            onChange={(event) =>
              statisticsStore.getState().setGranularity(event.target.value as StatisticsGranularity)
            }
          >
            {PERIOD_GRANULARITIES[period].map((option) => (
              <option className="dark:bg-zinc-950" key={option} value={option}>
                {granularityLabels[option]}
              </option>
            ))}
          </select>
        </label>
      </header>
      {points.length ? (
        <Bar
          data={data}
          options={{
            responsive: true,
            scales: {
              y: {
                grid: {
                  color: (context) =>
                    context.tick.value === 0 ? "#71717a" : "rgba(113, 113, 122, 0.2)",
                  lineWidth: (context) => (context.tick.value === 0 ? 3 : 2),
                },
                ticks: { callback: (value) => `${symbol}${Number(value).toFixed(2)}` },
              },
            },
            plugins: {
              tooltip: {
                callbacks: {
                  label: (item) => `${symbol}${Number(item.raw).toFixed(2)}`,
                },
              },
            },
          }}
        />
      ) : (
        <p className="opacity-70">No hay actividad en este periodo.</p>
      )}
    </section>
  );
};

export default TrendsChart;
