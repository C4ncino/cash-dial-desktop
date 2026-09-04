export type AccountBalanceView = Pick<Account, "balance" | "creditInfo">;

export function getAccountDisplayBalance(account: AccountBalanceView): number {
  return account.creditInfo ? account.creditInfo.creditLimit - account.balance : account.balance;
}
