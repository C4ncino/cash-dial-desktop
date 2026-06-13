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
}

export enum CURRENCY_FUNCTIONS {
  get = "get_currencies",
}

export enum MOVEMENT_TYPES {
  EXPENSE,
  INCOME,
  TRANSFER,
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
};

export enum EDIT_TYPES {
  ACCOUNT,
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
