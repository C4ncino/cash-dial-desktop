import { Icon } from "@iconify/react";
import { useState } from "react";

import AccountName from "@/components/General/AccountName";
import CategoryName from "@/components/General/CategoryName";
import { StatisticsSectionSkeleton } from "@/components/Statistics/StatisticsSkeleton";
import useDate from "@/hooks/useDate";
import { useStatisticsSection } from "@/hooks/useStatisticsSection";

type ObligationsListProps = {
  obligations?: StatisticsObligations;
  symbol?: string;
};

type MetricCardProps = {
  label: string;
  value: number;
  reference: number;
  symbol: string;
  period: string;
};

type ObligationRangeBarProps = {
  next7Days: number;
  next30Days: number;
  next90Days: number;
  symbol: string;
};

const formatMoney = (value: number, symbol: string) =>
  `${symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const ObligationMetricCard = ({ label, value, symbol, period }: MetricCardProps) => {
  const formattedValue = formatMoney(value, symbol);

  return (
    <article
      data-testid={`obligation-metric-${period}`}
      className="glass-control rounded-md p-3"
    >
      <h3 className="text-sm font-normal opacity-70">{label}</h3>
      <p className="mt-1 text-lg font-semibold">{formattedValue}</p>
    </article>
  );
};

const ObligationRangeBar = ({
  next7Days,
  next30Days,
  next90Days,
  symbol,
}: ObligationRangeBarProps) => {
  const total = Math.max(0, next90Days);
  const firstRange = Math.min(total, Math.max(0, next7Days));
  const secondRange = Math.min(
    Math.max(0, total - firstRange),
    Math.max(0, next30Days - firstRange),
  );
  const thirdRange = Math.max(0, total - firstRange - secondRange);
  const ranges = [
    { key: "7", label: "Próximos 7 días", amount: firstRange, color: "bg-amber-600 dark:bg-amber-400" },
    { key: "30", label: "Próximo Mes", amount: secondRange, color: "bg-yellow-600 dark:bg-yellow-400" },
    { key: "90", label: "Próximos 3 Meses", amount: thirdRange, color: "bg-green-600 dark:bg-green-400" },
  ];

  return (
    <div className="mb-5" data-testid="obligations-range-bar">
      <p className="mb-2 text-sm font-medium">Distribución del compromiso a 90 días</p>
      <div
        role="img"
        aria-label="Distribución de obligaciones entre los próximos 90 días"
        className="flex h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        {ranges.map((range) => {
          const percentage = total > 0 ? (range.amount / total) * 100 : 0;
          return (
            <div
              key={range.key}
              data-testid={`obligation-range-segment-${range.key}`}
              aria-hidden="true"
              className={`h-full ${range.color}`}
              style={{ width: `${percentage}%` }}
            />
          );
        })}
      </div>
      <ul className="mt-2 grid gap-1 text-xs opacity-70 sm:grid-cols-3">
        {ranges.map((range) => {
          const percentage = total > 0 ? (range.amount / total) * 100 : 0;
          return (
            <li key={range.key} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${range.color}`} />
              <span>
                {range.label}: {formatMoney(range.amount, symbol)} ({percentage.toFixed(1)}%)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const daysUntil = (date: Date) =>
  Math.round((startOfDay(date) - startOfDay(new Date())) / (24 * 60 * 60 * 1000));

const relativeDate = (date: Date) => {
  const days = daysUntil(date);
  if (days < 0) return "Vencida";
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days <= 7) return `En ${days} días`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const urgencyFor = (days: number) => {
  if (days <= 0) return "today";
  if (days <= 7) return "high";
  if (days <= 30) return "medium";
  return "neutral";
};

const urgencyText = (urgency: string) => {
  if (urgency === "today") return "Urgencia alta: vence hoy o está vencida";
  if (urgency === "high") return "Urgencia alta: vence en los próximos 7 días";
  if (urgency === "medium") return "Urgencia media: vence en los próximos 30 días";
  return "Urgencia normal";
};

const ObligationDate = ({
  timestamp,
  compact = false,
}: {
  timestamp: number;
  compact?: boolean;
}) => {
  const { dateObject, dateLong } = useDate(timestamp);
  const days = daysUntil(dateObject);
  const relative = relativeDate(dateObject);
  const conciseDate = dateObject.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
  const visibleDate = compact
    ? relative
    : days >= 0 && days <= 7
      ? `${conciseDate} · ${relative}`
      : conciseDate;

  return (
    <time dateTime={dateObject.toISOString()} title={dateLong}>
      {visibleDate}
    </time>
  );
};

const UrgencyIndicator = ({ timestamp }: { timestamp: number }) => {
  const { dateObject } = useDate(timestamp);
  const urgency = urgencyFor(daysUntil(dateObject));
  const color = {
    today: "bg-red-600 dark:bg-red-400",
    high: "bg-orange-600 dark:bg-orange-400",
    medium: "bg-yellow-600 dark:bg-yellow-400",
    neutral: "bg-green-600 dark:bg-green-400",
  }[urgency];

  return (
    <span
      aria-label={urgencyText(urgency)}
      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${color}`}
      data-urgency={urgency}
      role="img"
    />
  );
};

const ObligationRow = ({ item, symbol }: { item: StatisticsObligation; symbol: string }) => (
  <li className="flex min-w-0 items-start gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
    <UrgencyIndicator timestamp={item.dueTimestamp} />
    <div className="min-w-0 flex-1">
      <p className="truncate font-medium" title={item.description || undefined}>
        {item.description || <CategoryName id={item.categoryId} fallbackName="Categoría" />}
      </p>
      <p className="flex items-center gap-2 text-sm opacity-70">
        <ObligationDate timestamp={item.dueTimestamp} />
        <span aria-hidden="true">·</span>
        <AccountName id={item.accountId} />
      </p>
    </div>
    <strong className="shrink-0 text-right text-base">
      <data value={item.amount}>{formatMoney(item.amount, symbol)}</data>
    </strong>
  </li>
);

const ObligationGroup = ({
  id,
  label,
  items,
  symbol,
}: {
  id: string;
  label: string;
  items: StatisticsObligation[];
  symbol: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!items.length) return null;

  return (
    <div className="mt-5 space-y-3">
      <h3>
        <button
          type="button"
          aria-label={`${isOpen ? "Ocultar" : "Mostrar"} ${label}`}
          aria-controls={id}
          aria-expanded={isOpen}
          className="flex w-full items-center justify-between gap-3 rounded border border-zinc-200 px-3 py-2 text-left text-sm font-semibold uppercase tracking-wide opacity-80 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
          onClick={() => setIsOpen((open) => !open)}
        >
          {label} ({items.length})
          <Icon
            icon="iconoir:nav-arrow-down"
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </h3>
      {isOpen && (
        <ul id={id} aria-label={label} className="space-y-2">
          {items.map((item) => (
            <ObligationRow key={item.installmentId} item={item} symbol={symbol} />
          ))}
        </ul>
      )}
    </div>
  );
};

const ObligationsList = ({
  obligations: obligationsProp,
  symbol: symbolProp,
}: ObligationsListProps = {}) => {
  const { response, loading, symbol: storeSymbol } = useStatisticsSection();

  const obligations = obligationsProp ?? response?.obligations;
  if (loading || !obligations)
    return <StatisticsSectionSkeleton ariaLabel="Próximas obligaciones" className="h-40" />;

  const symbol = symbolProp ?? storeSymbol ?? "";
  const sortedItems = [...obligations.items].sort(
    (left, right) => left.dueTimestamp - right.dueTimestamp,
  );
  const next7Days = sortedItems.filter((item) => daysUntil(new Date(item.dueTimestamp)) <= 7);
  const next30Days = sortedItems.filter((item) => {
    const days = daysUntil(new Date(item.dueTimestamp));
    return days > 7 && days <= 30;
  });
  const next90Days = sortedItems.filter((item) => daysUntil(new Date(item.dueTimestamp)) > 30);

  return (
    <section
      aria-label="Próximas obligaciones"
      className="glass-surface rounded-md p-4"
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Próximas obligaciones</h2>
          <p className="text-sm opacity-70">Lo que tienes comprometido próximamente</p>
        </div>
        {sortedItems.length > 0 && (
          <span className="shrink-0 text-sm opacity-70">
            <data value={sortedItems.length}>{sortedItems.length}</data> pendientes
          </span>
        )}
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <ObligationMetricCard
          label="Próximos 7 días"
          value={obligations.totals.next7Days}
          reference={obligations.totals.next90Days}
          symbol={symbol}
          period="7"
        />
        <ObligationMetricCard
          label="Próximos 30 días"
          value={obligations.totals.next30Days}
          reference={obligations.totals.next90Days}
          symbol={symbol}
          period="30"
        />
        <ObligationMetricCard
          label="Próximos 90 días"
          value={obligations.totals.next90Days}
          reference={obligations.totals.next90Days}
          symbol={symbol}
          period="90"
        />
      </div>
      <ObligationRangeBar
        next7Days={obligations.totals.next7Days}
        next30Days={obligations.totals.next30Days}
        next90Days={obligations.totals.next90Days}
        symbol={symbol}
      />

      {sortedItems.length ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide opacity-70">Próxima</h3>
          <ul aria-label="Obligaciones en los próximos 7 días" className="space-y-2">
            {next7Days.map((item) => (
              <ObligationRow key={item.installmentId} item={item} symbol={symbol} />
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-zinc-300 p-4 text-center dark:border-zinc-700">
          <p className="font-medium">No hay próximas obligaciones.</p>
          <p className="mt-1 text-sm opacity-70">No tienes pagos pendientes en este periodo.</p>
        </div>
      )}

      <ObligationGroup
        id="obligations-8-30"
        label="Obligaciones de 8–30 días"
        items={next30Days}
        symbol={symbol}
      />
      <ObligationGroup
        id="obligations-31-90"
        label="Obligaciones de 31–90 días"
        items={next90Days}
        symbol={symbol}
      />
    </section>
  );
};

export default ObligationsList;
