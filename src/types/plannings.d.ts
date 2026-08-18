type PlanningRecurringType = BasicType & {
  key: string;
  singular: string;
  plural: string;
};

type PlanningStatus = BasicType & {
  key: string;
  color: string;
};

type PlanningYearDay = {
  month: number;
  dayOfMonth: number;
};

type PlanningRecurringRuleDetail = {
  id: number;
  recurringTypeId: number;
  intervalStep: number;
  startDate: number;
  endDate?: number | null;
  isActive: boolean;
  weekDays: number[];
  monthDays: number[];
  yearDays: PlanningYearDay[];
};

type PlanningOccurrence = {
  id: number;
  planningId: number;
  movementId?: number | null;
  statusId: number;
  expectedDate: number;
  isOverdue: boolean;
};

type Planning = {
  id: number;
  typeId: number;
  accountId: number;
  categoryId: number;
  currencyId: number;
  name: string;
  amount: number;
  recurringRule: PlanningRecurringRuleDetail;
  currentOccurrence?: PlanningOccurrence | null;
};

type CreatePlanningRequest = {
  typeId: number;
  accountId: number;
  categoryId: number;
  currencyId: number;
  name: string;
  amount: number;
  recurringTypeId: number;
  intervalStep: number;
  startDate: number;
  endDate?: number | null;
  weekDays?: number[] | null;
  monthDays?: number[] | null;
  yearDays?: PlanningYearDay[] | null;
};

type UpdatePlanningRequest = {
  typeId: number;
  accountId: number;
  categoryId: number;
  currencyId: number;
  name: string;
  amount: number;
  recurringTypeId: number;
  intervalStep: number;
  startDate: number;
  endDate?: number | null;
  weekDays?: number[] | null;
  monthDays?: number[] | null;
  yearDays?: PlanningYearDay[] | null;
};

type PlanningsStore = {
  plannings: Planning[];
  recurringTypes: PlanningRecurringType[];
  statuses: PlanningStatus[];
  occurrencesByPlanning: Record<number, PlanningOccurrence[]>;
};

type PlanningActions = {
  populate: () => Promise<void>;
  getById: (id: number) => Planning | undefined;
  get: (id: number) => Promise<Planning>;
  getOccurrences: (planningId: number) => Promise<PlanningOccurrence[]>;
  create: (request: CreatePlanningRequest) => Promise<Planning>;
  update: (id: number, request: UpdatePlanningRequest) => Promise<Planning>;
  remove: (id: number) => Promise<void>;
  activate: (id: number) => Promise<Planning>;
  deactivate: (id: number) => Promise<Planning>;
  cancelOccurrence: (occurrenceId: number, planningId: number) => Promise<PlanningOccurrence>;
  completeOccurrence: (
    occurrenceId: number,
    movementId: number,
    planningId: number,
  ) => Promise<PlanningOccurrence>;
  refresh: (id: number) => Promise<Planning | undefined>;
};
