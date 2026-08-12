type AccountType = BasicType & {
  icon: string;
  color: string;
};

type Account = {
  id: number;
  type: AccountType;
  currencyId: number;
  name: string;
  balance: number;
  creditInfo?: CreditCardInfo;
  isActive: boolean;
};

type CreditCardInfo = {
  creditLimit: number;
  cutoffDay: number;
  daysToPay: number;
};

type CreditCardPaymentMovement = {
  movementId: number;
  installmentIds: number[];
  amount: number;
};

type CreditCardNextPayment = {
  accountId: number;
  paymentDate: number;
  totalAmount: number;
  movements: CreditCardPaymentMovement[];
};

type CreditCardPaymentRequest = {
  fromAccountId: number;
  amount: number;
};

type AccountsStore = {
  accounts: Account[];
  types: AccountType[];
  updateBalance: (id1: number, id2?: number) => Promise<number | [number, number]>;
  getNextPayment: (accountId: number) => Promise<CreditCardNextPayment | null>;
  payCreditCard: (creditAccountId: number, payments: CreditCardPaymentRequest[]) => Promise<number[]>;
};
