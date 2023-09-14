import * as express from 'express';
import { DataSource, FindOptionsWhere } from 'typeorm';
import { Account } from '../entity/Account';
import { Transaction } from '../entity/Transaction';
import { AccountsRepo } from '../repos/accounts.repo';
import { AccountWithRest } from '../types/accounts';
import { ETRANSACTION_TYPE } from '../types/transactions';

export interface GetAccountsRequest extends express.Request {
  query: {
    showHidden?: '1' | '0';
  };
}

export class AccountsController {
  constructor(ds: DataSource) {
    this.ds = ds;
    this.accsRepo = AccountsRepo.getInstance(ds);

    this.router.get(this.path, this.getAll);
    this.router.get(`${this.path}:id`, this.getById);
    this.router.post(this.path, this.create);
    this.router.put(`${this.path}:id`, this.update);
    this.router.delete(`${this.path}:id`, this.delete);
  }

  public router = express.Router();

  private accsRepo: AccountsRepo;

  private ds: DataSource;

  private path = '/';

  private calculateRest = (transactions: Transaction[], account: Account) => {
    const rest = transactions.reduce((prev, current) => {
      if (current.type?.id === ETRANSACTION_TYPE.INCOME || current.type?.id === ETRANSACTION_TYPE.RETURN_EXPENSE) {
        return prev + current.amount;
      }

      if (current.toAccount && current?.toAccount?.id === account.id) {
        return prev + current.amount;
      }

      return prev - current.amount;
    }, account.initialValue);

    return rest;
  };

  private create = async (request: express.Request, response: express.Response) => {
    const account = this.ds.manager.create(Account, { ...request.body, user: { id: request.headers.userid } });

    this.ds.manager
      .save(account)
      .then((acc) => {
        setTimeout(() => {
          response.send({ account: acc });
        }, 1500); //load emulation
      })
      .catch((err) => response.send(err));
  };

  private delete = async (request: express.Request, response: express.Response) => {
    if (!parseInt(request.params.id)) {
      response.status(500);
      response.send(`acc delete error. request.params.id: ${request.params.id}`);
      return;
    }
    const account = await this.ds.manager.update(Account, parseInt(request.params.id), { isActive: false });
    response.send({ account: account });
  };

  private getAll = async (request: GetAccountsRequest, response: express.Response<AccountWithRest[]>) => {
    const showHidden = request.query.showHidden === '1';

    const whereClause: FindOptionsWhere<Account> = { user: { id: Number(request.headers.userid) } };
    if (!showHidden) {
      whereClause.isActive = true;
    }

    const accounts = await this.ds.manager.find(Account, {
      relations: { incomingTransactions: { toAccount: true, category: true, type: true }, transactions: { category: true, type: true } },
      where: whereClause,
    });

    const accountsWithRest: AccountWithRest[] = accounts.map((account) => {
      let transactions: Transaction[] = [];
      if (account.incomingTransactions?.length) {
        transactions = [...account.incomingTransactions];
      }

      if (account.transactions?.length) {
        transactions = [...transactions, ...account.transactions];
      }

      return {
        id: account.id,
        icon: account.icon,
        initialValue: account.initialValue,
        isActive: account.isActive,
        name: account.name,
        rest: this.calculateRest(transactions, account),
      };
    });
    setTimeout(() => {
      response.send(accountsWithRest);
    }, 1500);
  };

  private getById = async (request: express.Request, response: express.Response) => {
    const accId = request.params.id;

    const account = await this.ds.manager.findOne(Account, {
      where: { id: accId, user: { id: Number(request.headers.userid) } },
      relations: { incomingTransactions: { toAccount: true, category: true, type: true }, transactions: { category: true, type: true } },
    });

    if (!account) {
      console.error('accounts getById request.params.id', request.params.id, ' - not found');
      response.status(500);
      response.send('account not found');
      return;
    }

    const transactions = [...(account.transactions ?? []), ...(account.incomingTransactions ?? [])];

    const rest = this.calculateRest(transactions, account);

    setTimeout(() => {
      response.send({ ...account, rest: rest });
    }, 1000);
  };

  private update = async (request: express.Request, response: express.Response) => {
    const userId = parseInt(String(request.headers.userid));

    try {
      this.accsRepo.update(userId, request.params.id, request.body);
      response.send('ok');
    } catch (err) {
      response.send(err);
    }
  };
}
