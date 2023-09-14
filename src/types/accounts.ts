import { Account } from '../entity/Account';

export interface AccountWithRest extends Account {
  rest: number;
}

export interface LocalAccount {
  icon: string;
  id: string;
  initialValue: number;
  isActive: boolean;
  name: string;
}

export interface LocalAccountWithRest extends LocalAccount {
  rest: number;
}
