export enum ETRANSACTION_TYPE {
  EXPENSE = 1,
  INCOME = 2,
  RETURN_EXPENSE = 3,
  RETURN_INCOME = 4,
  TRANSFER = 5,
}

export interface LocalTransaction {
  accountId: string;
  amount: number;
  categoryId: string;
  description?: string;
  dt: string;
  id: string;
  toAccountId: string;
  typeId: ETRANSACTION_TYPE;
}

export interface LocalTransactionWithNames extends LocalTransaction {
  categoryName?: string;
  accountName?: string;
}
