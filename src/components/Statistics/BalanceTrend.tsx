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
import colors from "tailwindcss/colors";

import { StatisticsSectionSkeleton } from "@/components/Statistics/StatisticsSkeleton";
import { useStatisticsSection } from "@/hooks/useStatisticsSection";
import useTheme from "@/hooks/useTheme";
import { formatStatMoney } from "@/lib/formatters";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

type BalanceTrendProps = {
  points?: StatisticsBalanceTrendPoint[];
  symbol?: string;
};

const label = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("es-MX", { month: "short", day: "numeric" });

const BalanceTrend = ({ points: pointsProp, symbol: symbolProp }: BalanceTrendProps = {}) => {
  const { response, loading, symbol: storeSymbol } = useStatisticsSection();
  const { isDark } = useTheme();
  const points = pointsProp ?? response?.balanceTrend ?? [];
  const symbol = symbolProp ?? storeSymbol ?? "";
  const data = useMemo(
    () => ({
      labels: points.map((point) => label(point.bucketStartMs)),
      datasets: [
        {
          label: "Saldo",
          data: points.map((point) => point.balance),
          borderColor: isDark ? colors.indigo[400] : colors.indigo[600],
          backgroundColor: `${isDark ? colors.indigo[400] : colors.indigo[600]}1f`,
          fill: true,
          tension: 0.25,
        },
      ],
    }),
    [points, isDark],
  );

  if (loading)
    return <StatisticsSectionSkeleton ariaLabel="Saldo a lo largo del tiempo" className="h-64" />;
  if (!pointsProp && !response) return null;

  return (
    <section
      aria-label="Saldo a lo largo del tiempo"
      className="glass-surface rounded-xl p-4 sm:p-5"
    >
      <h2 className="mb-1 text-lg font-semibold">Saldo a lo largo del tiempo</h2>
      {points.length ? (
        <div className="relative h-64 min-w-0 sm:h-80">
          <Line
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
                    callback: (value) => formatStatMoney(Number(value), symbol),
                  },
                },
              },
              plugins: {
                tooltip: {
                  callbacks: { label: (item) => formatStatMoney(Number(item.raw), symbol) },
                },
                legend: {
                  display: false,
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

export default BalanceTrend;
