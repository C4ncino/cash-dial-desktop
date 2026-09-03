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
import colors from "tailwindcss/colors";
import { useStore } from "zustand";

import { StatisticsSectionSkeleton } from "@/components/Statistics/StatisticsSkeleton";
import { useStatisticsSection } from "@/hooks/useStatisticsSection";
import useTheme from "@/hooks/useTheme";
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
  const { isDark } = useTheme();
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
          backgroundColor: isDark ? colors.green[400] : colors.green[600],
        },
        {
          label: "Gastos",
          data: points.map((point) => point.expense),
          backgroundColor: isDark ? colors.red[400] : colors.red[600],
        },
      ],
    }),
    [points, isDark],
  );

  if (loading) {
    return <StatisticsSectionSkeleton ariaLabel="Tendencias" className="h-64" />;
  }
  if (!pointsProp && !response) return null;

  return (
    <section aria-label="Tendencias" className="glass-surface rounded-xl p-4 sm:p-5">
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
              <option className="bg-zinc-100 dark:bg-zinc-800" key={option} value={option}>
                {granularityLabels[option]}
              </option>
            ))}
          </select>
        </label>
      </header>
      {points.length ? (
        <div className="relative h-64 min-w-0 sm:h-80">
          <Bar
            data={data}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  grid: {
                    color: (context) =>
                      context.tick.value === 0
                        ? isDark
                          ? colors.zinc[400]
                          : colors.zinc[600]
                        : `${isDark ? colors.zinc[400] : colors.zinc[600]}33`,
                    lineWidth: (context) => (context.tick.value === 0 ? 3 : 2),
                  },
                  ticks: {
                    color: isDark ? colors.zinc[400] : colors.zinc[500],
                    callback: (value) => `${symbol}${Number(value).toFixed(2)}`,
                  },
                },
              },
              plugins: {
                legend: {
                  labels: { color: isDark ? colors.zinc[300] : colors.zinc[700] },
                },
                tooltip: {
                  callbacks: {
                    label: (item) => `${symbol}${Number(item.raw).toFixed(2)}`,
                  },
                },
              },
            }}
          />
        </div>
      ) : (
        <p className="opacity-70">No hay actividad en este periodo.</p>
      )}
    </section>
  );
};

export default TrendsChart;
