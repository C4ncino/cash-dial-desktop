type StatisticsGranularity = "day" | "week" | "month" | "year";

type StatisticsOptions = {
  categoryId?: number;
  includeDescendants?: boolean;
  includeObligations?: boolean;
  originTimezoneOverride?: string;
};

type StatisticsOverview = {
  income: number;
  expenses: number;
  netCashFlow: number;
  savingsRate: number | null;
};

type StatisticsTimeSeriesPoint = {
  bucketStartMs: number;
  income: number;
  expense: number;
  net: number;
};

type StatisticsBalanceTrendPoint = {
  bucketStartMs: number;
  balance: number;
};

type StatisticsCategoryEntry = {
  categoryId: number;
  name: string;
  parentId: number | null;
  amount: number;
  percentOfTotal: number;
  isVirtual: boolean;
};

type StatisticsCategoryNode = StatisticsCategoryEntry & {
  children: StatisticsCategoryNode[];
};

type StatisticsObligation = {
  installmentId: number;
  movementId: number;
  accountId: number;
  dueTimestamp: number;
  amount: number;
  paid: boolean;
  description: string | null;
  categoryId: number;
};

type StatisticsObligations = {
  totals: { next7Days: number; next30Days: number; next90Days: number };
  items: StatisticsObligation[];
};

type StatisticsSecondaryMetrics = {
  movementCount: number;
  transactionCount: number;
  avgExpense: number | null;
  avgDailySpending: number;
  highestSpendingDay: { bucketStartMs: number; amount: number } | null;
  largestExpense: {
    movementId: number;
    amount: number;
    timestamp: number;
  } | null;
};

type StatisticsResponse = {
  currencyId: number;
  startMs: number;
  endMs: number;
  overview: StatisticsOverview;
  timeseries: StatisticsTimeSeriesPoint[];
  balanceTrend: StatisticsBalanceTrendPoint[];
  categories: {
    totalExpenses: number;
    byCategoryHierarchy: StatisticsCategoryNode[];
    byCategoryFlat: StatisticsCategoryEntry[];
  };
  obligations: StatisticsObligations;
  secondary: StatisticsSecondaryMetrics;
};

type StatisticsStore = {
  selectedCurrencyId: number | null;
  period: import("@/lib/statisticsQuery").StatisticsPeriod;
  periodStartMs: number;
  periodEndMs: number;
  granularity: StatisticsGranularity;
  response: StatisticsResponse | null;
  cache: Record<string, StatisticsResponse>;
  loading: boolean;
  error: string | null;
};

type StatisticsActions = {
  setSelectedCurrencyId: (currencyId: number | null) => void;
  setPeriod: (period: import("@/lib/statisticsQuery").StatisticsPeriod) => void;
  previousPeriod: () => void;
  nextPeriod: () => void;
  setGranularity: (granularity: StatisticsGranularity) => void;
  fetchStatistics: () => Promise<StatisticsResponse | null>;
  clearError: () => void;
};
