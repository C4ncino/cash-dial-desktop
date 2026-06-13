type MovementType = BasicType;

type Movement = {
  id: number;
  accountId: number;
  categoryId: number;
  currencyId: number;
  amount: number;
  actualAccountAmount: number;
  timestamp: number;
  description?: string;
};

type Income = Movement;

type Expense = Movement & {
  installments: number;
};

type Transfer = Movement & {
  toAccountId: number;
};
