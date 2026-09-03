import { ACCOUNT_FUNCTIONS } from "@/types/enums";

import { invokeCommand } from "./invoke";

export type AccountPayload = {
  name: string;
  balance: number;
  typeId: number;
  currencyId: number;
  creditInfo?: CreditCardInfo;
};

export const accountsCommands = {
  getTypes: () => invokeCommand<AccountType[]>("get_account_types"),
  getAll: () => invokeCommand<Account[]>(ACCOUNT_FUNCTIONS.get),
  add: (account: AccountPayload) => invokeCommand<Account>(ACCOUNT_FUNCTIONS.add, account),
  update: (id: number, account: AccountPayload) =>
    invokeCommand<Account>(ACCOUNT_FUNCTIONS.update, { id, ...account }),
  activate: (id: number) => invokeCommand<Account>(ACCOUNT_FUNCTIONS.activate, { id }),
  deactivate: (id: number) => invokeCommand<Account>(ACCOUNT_FUNCTIONS.deactivate, { id }),
  remove: (id: number) => invokeCommand<void>(ACCOUNT_FUNCTIONS.remove, { id }),
  getBalance: (id: number) => invokeCommand<number>(ACCOUNT_FUNCTIONS.getBalance, { id }),
  getNextPayment: (accountId: number) =>
    invokeCommand<CreditCardNextPayment>(ACCOUNT_FUNCTIONS.getNextPayment, { accountId }),
  payCreditCard: (
    creditAccountId: number,
    payments: CreditCardPaymentRequest[],
    installmentIds: number[],
  ) =>
    invokeCommand<CreditCardPaymentResult>(ACCOUNT_FUNCTIONS.payCreditCard, {
      creditAccountId,
      payments,
      installmentIds,
    }),
};
