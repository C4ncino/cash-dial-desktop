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

type AccountsStore = {
  accounts: Account[];
  types: AccountType[];
};
