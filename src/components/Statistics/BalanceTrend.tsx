import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { useMemo } from "react";
import { Line } from "react-chartjs-2";

import { StatisticsSectionSkeleton } from "@/components/Statistics/StatisticsSkeleton";
import { useStatisticsSection } from "@/hooks/useStatisticsSection";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

type BalanceTrendProps = {
  points?: StatisticsBalanceTrendPoint[];
  symbol?: string;
};

const label = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("es-MX", { month: "short", day: "numeric" });

const BalanceTrend = ({ points: pointsProp, symbol: symbolProp }: BalanceTrendProps = {}) => {
  const { response, loading, symbol: storeSymbol } = useStatisticsSection();
  const points = pointsProp ?? response?.balanceTrend ?? [];
  const symbol = symbolProp ?? storeSymbol ?? "";
  const data = useMemo(
    () => ({
      labels: points.map((point) => label(point.bucketStartMs)),
      datasets: [
        {
          label: "Saldo",
          data: points.map((point) => point.balance),
          borderColor: "#6366f1",
          backgroundColor: "rgba(99, 102, 241, 0.12)",
          fill: true,
          tension: 0.25,
        },
      ],
    }),
    [points],
  );

  if (loading)
    return <StatisticsSectionSkeleton ariaLabel="Saldo a lo largo del tiempo" className="h-64" />;
  if (!pointsProp && !response) return null;

  return (
    <section
      aria-label="Saldo a lo largo del tiempo"
      className="rounded-md border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="mb-1 text-lg font-semibold">Saldo a lo largo del tiempo</h2>
      {points.length ? (
        <Line
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
                callbacks: { label: (item) => `${symbol}${Number(item.raw).toFixed(2)}` },
              },
              legend: {
                display: false,
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

export default BalanceTrend;
