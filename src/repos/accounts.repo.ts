import { DataSource } from 'typeorm';
import { Account } from '../entity/Account';
import { User } from '../entity/User';

export class AccountsRepo {
  private static instance: AccountsRepo;

  public static getInstance(ds: DataSource): AccountsRepo {
    if (!AccountsRepo.instance) {
      AccountsRepo.instance = new AccountsRepo(ds);
    }

    return AccountsRepo.instance;
  }

  private constructor(ds: DataSource) {
    this.ds = ds;
  }

  private ds: DataSource;

  public async update(userId: User['id'], accountId: Account['id'], account: Account) {
    this.ds.manager.update(Account, accountId, { ...account, user: { id: userId } });
  }
}
