export type StatisticsPeriod = "week" | "month" | "year";

export const PERIOD_GRANULARITIES: Record<StatisticsPeriod, StatisticsGranularity[]> = {
  week: ["day"],
  month: ["day", "week"],
  year: ["week", "month"],
};

export const DEFAULT_GRANULARITY: Record<StatisticsPeriod, StatisticsGranularity> = {
  week: "day",
  month: "day",
  year: "month",
};

export const startOfPeriod = (date: Date, period: StatisticsPeriod) => {
  if (period === "year") return new Date(date.getFullYear(), 0, 1).getTime();
  if (period === "month") {
    return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  }

  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start.getTime();
};

export const shiftPeriod = (startMs: number, period: StatisticsPeriod, amount: number) => {
  const date = new Date(startMs);
  if (period === "year") date.setFullYear(date.getFullYear() + amount);
  else if (period === "month") date.setMonth(date.getMonth() + amount);
  else date.setDate(date.getDate() + amount * 7);
  return date.getTime();
};

export const periodRange = (startMs: number, period: StatisticsPeriod) => ({
  startMs,
  endMs: shiftPeriod(startMs, period, 1),
});

export const currentPeriodStart = (period: StatisticsPeriod) => startOfPeriod(new Date(), period);

export const isCurrentPeriod = (startMs: number, period: StatisticsPeriod) =>
  startMs >= currentPeriodStart(period);
