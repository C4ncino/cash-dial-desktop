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
