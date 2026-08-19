export enum ACCOUNT_TYPES {
  CASH = 1,
  DEBIT = 2,
  CREDIT = 3,
}

export enum ACCOUNT_FUNCTIONS {
  add = "add_account",
  remove = "remove_account",
  get = "get_accounts",
  update = "update_account",
  getBalance = "get_account_balance",
  getNextPayment = "get_credit_cards_next_payment",
  payCreditCard = "pay_credit_card",
}

export enum CURRENCY_FUNCTIONS {
  get = "get_currencies",
  refreshRates = "refresh_currency_rates",
}

export enum CATEGORY_FUNCTIONS {
  get = "get_categories",
}

export enum MOVEMENT_FUNCTIONS {
  get = "get_movements",
  getById = "get_movement",
  getTypes = "get_movement_types",
  add = "add_movement",
  update = "update_movement",
  remove = "remove_movement",
  getInstallments = "get_movement_installments",
  markInstallmentsPaid = "mark_installments_as_paid",
}

export enum MOVEMENT_TYPES {
  INCOME = 1,
  EXPENSE = 2,
  TRANSFER = 3,
}

export enum BUDGET_TYPES {
  WEEKLY = 1,
  MONTHLY = 2,
  YEARLY = 3,
}

export enum BUDGET_FUNCTIONS {
  getAll = "get_all_budgets",
  get = "get_budget",
  getPeriodTypes = "get_budget_period_types",
  create = "create_budget",
  delete = "delete_budget",
  updateAmount = "update_budget_amount",
  updateName = "update_budget_name",
  getAffectedBudgetIds = "get_affected_budget_ids",
}

export enum BUDGET_UPDATE_TYPES {
  CORRECT = "correct",
  TODAY = "today",
  NEXT_PERIOD = "next_period",
}

export enum PLANNING_FUNCTIONS {
  getRecurringTypes = "get_planning_recurring_types",
  getStatuses = "get_planning_statuses",
  getAll = "get_plannings",
  get = "get_planning",
  getOccurrences = "get_planning_occurrences",
  create = "create_planning",
  update = "update_planning",
  delete = "delete_planning",
  activate = "activate_planning",
  deactivate = "deactivate_planning",
  cancelOccurrence = "cancel_planning_occurrence",
  completeOccurrence = "complete_planning_occurrence",
}

export enum PLANNINGS_RECURRING_TYPES {
  DAILY = 1,
  WEEKLY = 2,
  MONTHLY = 3,
  YEARLY = 4,
}

export enum PLANNING_STATUS {
  PENDING = 1,
  CANCELED = 2,
  COMPLETED = 3,
}

export const MODAL_ID = {
  ACCOUNT: {
    CREATE: "create-account-dialog",
    EDIT: "edit-account-dialog",
    DELETE: "delete-account-dialog",
    DEACTIVATE: "deactivate-account-dialog",
  },
  MOVEMENT: {
    INCOME: {
      CREATE: "create-income-dialog",
      EDIT: "edit-income-dialog",
      DELETE: "delete-income-dialog",
    },
    EXPENSE: {
      CREATE: "create-expense-dialog",
      EDIT: "edit-expense-dialog",
      DELETE: "delete-expense-dialog",
    },
    TRANSFER: {
      CREATE: "create-transfer-dialog",
      EDIT: "edit-transfer-dialog",
      DELETE: "delete-transfer-dialog",
    },
  },
  BUDGET: {
    CREATE: "create-budget-dialog",
    EDIT: "edit-budget-dialog",
  },
  PLANNING: {
    CREATE: "create-planning-dialog",
    EDIT: "edit-planning-dialog",
    DELETE: "delete-planning-dialog",
    DEACTIVATE: "deactivate-planning-dialog",
  },
};

export enum EDIT_TYPES {
  ACCOUNT,
  BUDGET,
  PLANNING,
  INCOME,
  EXPENSE,
  TRANSFER,
}

export const DAYS = [
  { id: "1" },
  { id: "2" },
  { id: "3" },
  { id: "4" },
  { id: "5" },
  { id: "6" },
  { id: "7" },
  { id: "8" },
  { id: "9" },
  { id: "10" },
  { id: "11" },
  { id: "12" },
  { id: "13" },
  { id: "14" },
  { id: "15" },
  { id: "16" },
  { id: "17" },
  { id: "18" },
  { id: "19" },
  { id: "20" },
  { id: "21" },
  { id: "22" },
  { id: "23" },
  { id: "24" },
  { id: "25" },
  { id: "26" },
  { id: "27" },
  { id: "28" },
  { id: "29" },
  { id: "30" },
  { id: "31" },
] as const;

export const MONTHS = [
  { id: "Enero" },
  { id: "Febrero" },
  { id: "Marzo" },
  { id: "Abril" },
  { id: "Mayo" },
  { id: "Junio" },
  { id: "Julio" },
  { id: "Agosto" },
  { id: "Septiembre" },
  { id: "Octubre" },
  { id: "Noviembre" },
  { id: "Diciembre" },
] as const;

export const MONTH_DAYS = {
  Enero: 31,
  Febrero: 28,
  Marzo: 31,
  Abril: 30,
  Mayo: 31,
  Junio: 30,
  Julio: 31,
  Agosto: 31,
  Septiembre: 30,
  Octubre: 31,
  Noviembre: 30,
  Diciembre: 31,
} as const;
