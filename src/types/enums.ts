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
}

export enum CURRENCY_FUNCTIONS {
  get = "get_currencies",
}

export enum CATEGORY_FUNCTIONS {
  get = "get_categories",
}

export enum MOVEMENT_FUNCTIONS {
  get = "get_movements",
  getTypes = "get_movement_types",
  add = "add_movement",
  update = "update_movement",
  remove = "remove_movement",
  getInstallments = "get_movement_installments",
}

export enum MOVEMENT_TYPES {
  INCOME = 1,
  EXPENSE = 2,
  TRANSFER = 3,
}

export enum BUDGET_TYPES {
  WEEKLY,
  MONTHLY,
  YEARLY,
}

export enum PLANNINGS_RECURRING_TYPES {
  UNIQUE,
  DAILY,
  WEEKLY,
  MONTHLY,
  YEARLY,
}

export enum PLANNING_STATUS {
  PENDING,
  COMPLETED,
  CANCELLED,
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
};

export enum EDIT_TYPES {
  ACCOUNT,
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
