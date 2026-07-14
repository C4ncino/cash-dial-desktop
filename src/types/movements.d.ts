type MovementType = BasicType & {
  key: string;
};

type MovementInstallment = {
  id: number;
  movementId: number;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueTimestamp: number;
  paid: boolean;
  paidTimestamp: number | null;
};

type Movement = {
  id: number;
  typeId: number;
  accountId: number;
  toAccountId?: number;
  categoryId: number;
  currencyId: number;
  originalAmount: number;
  accountAmount: number;
  installments?: number;
  timestamp: number;
  description?: string;
  installmentsData?: MovementInstallment[];
};

type MovementsStore = {
  byId: Record<number, Movement>;
  allIds: number[];
  byAccount: Record<number, number[]>;
  types: MovementType[];
};
