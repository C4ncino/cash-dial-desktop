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

const localDate = (year: number, month = 0, day = 1) => {
  const date = new Date(0);
  date.setFullYear(year, month, day);
  date.setHours(0, 0, 0, 0);
  return date;
};

const isoWeek = (date: Date) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const year = target.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((target.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return { year, week };
};

export const formatPeriodInput = (startMs: number, period: StatisticsPeriod) => {
  const date = new Date(startMs);
  if (!Number.isFinite(date.getTime())) return "";

  if (period === "year") return String(date.getFullYear()).padStart(4, "0");
  if (period === "month") {
    return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  const { year, week } = isoWeek(date);
  return `${String(year).padStart(4, "0")}-W${String(week).padStart(2, "0")}`;
};

export const parsePeriodInput = (value: string, period: StatisticsPeriod) => {
  let date: Date;

  if (period === "year") {
    const match = /^(\d{4})$/.exec(value);
    if (!match) return null;
    date = localDate(Number(match[1]));
  } else if (period === "month") {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) return null;
    const month = Number(match[2]);
    if (month < 1 || month > 12) return null;
    date = localDate(Number(match[1]), month - 1);
  } else {
    const match = /^(\d{4})-W(\d{2})$/.exec(value);
    if (!match) return null;
    const year = Number(match[1]);
    const week = Number(match[2]);
    if (week < 1 || week > 53) return null;
    const januaryFourth = localDate(year, 0, 4);
    const daysSinceMonday = (januaryFourth.getDay() + 6) % 7;
    date = localDate(year, 0, 4 - daysSinceMonday + (week - 1) * 7);
  }

  const startMs = startOfPeriod(date, period);
  return formatPeriodInput(startMs, period) === value ? startMs : null;
};
