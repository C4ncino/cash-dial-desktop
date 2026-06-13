type Planning = {
  id: number;
  typeId: number;
  accountId: number;
  categoryId: number;
  currencyId: number;
  recurringTypeId: number;
  name: string;
  amount: number;
  date: string;
};

type PlanningType = BasicType;

type PlanningRecurringType = BasicType & {
  singular: string;
  plural: string;
};

type PlanningStatus = BasicType;

type RecurringPlanning = Planning & {
  interval: number;
  times: number;
  startDate: string;
};

type PayDaysPlanning = {
  planningId: number;
  day: number;
  month?: number;
};

type HistoricalPlanning = {
  id: number;
  planningId: number;
  statusId: number;
  amount: number;
  date: string;
};
