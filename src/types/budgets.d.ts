type BudgetType = BasicType;

type Budget = {
  id: number;
  typeId: number;
  categoryId: number;
  currencyId: number;
  name: string;
  amount: number;
  amountLimit: number;
  startDate: string;
};

type HistoricalBudget = {
  id: number;
  budgetId: number;
  amount: number;
  amountLimit: number;
  startDate: string;
};

type Goals = {
  id: number;
  currencyId: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  startDate: string;
  endDate?: string;
};

type BudgetPeriodType = {
  id: number;
  key: string;
  name: string;
};

type BudgetRow = {
  id: number;
  budgetPeriodTypeId: number;
  categoryId: number;
  currencyId: number;
  name: string;
};

type BudgetPeriodDetails = {
  startDate: number;
  endDate: number;
  amountLimit: number;
  amountSpend: number;
  movementIds: number[];
};

type BudgetDetails = {
  budget: BudgetRow;
  periods: BudgetPeriodDetails[];
};

type BudgetStore = {
  budgets: BudgetDetails[];
  periodTypes: BudgetPeriodType[];
};

enum BUDGET_UPDATE_TYPES {
  CORRECT = "correct",
  TODAY = "today",
  NEXT_PERIOD = "next_period",
}

type BudgetAmountUpdateType = BUDGET_UPDATE_TYPES;

type BudgetActions = {
  populate: () => Promise<void>;
  getById: (id: number) => BudgetDetails | undefined;
  add: (budget: {
    budgetPeriodTypeId: number;
    categoryId: number;
    currencyId: number;
    name: string;
    amountLimit: number;
    startDate: number;
  }) => Promise<void>;
  remove: (id: number) => Promise<void>;
  updateAmount: (id: number, amountLimit: number, updateType: BudgetAmountUpdateType) => Promise<void>;
  updateName: (id: number, name: string) => Promise<void>;
  refresh: (id: number) => Promise<void>;
  refreshAffected: (categoryId: number, previousCategoryId?: number) => Promise<void>;
};
