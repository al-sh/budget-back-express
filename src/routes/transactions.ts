import * as express from 'express';
import { DataSource, In, TypeORMError } from 'typeorm';
import { Account } from '../entity/Account';
import { Category } from '../entity/Category';
import { Transaction } from '../entity/Transaction';
import { TransactionType } from '../entity/TransactionType';
import { CategoriesRepo } from '../repos/categories.repo';
import { TransactionsRepo } from '../repos/transactions.repo';
import { ETRANSACTION_TYPE } from '../types/transactions';

export interface GetTransactionTypesRequest extends express.Request {
  query: {
    hideReturns?: '1' | '0';
  };
}

export interface GetTransactionsRequest extends express.Request {
  query: {
    accountId?: string;
    categoryId?: string;
    dateEnd?: string;
    dateFrom?: string;
    page: string;
    typeId?: string;
  };
}

export class TransactionsController {
  constructor(ds: DataSource) {
    this.ds = ds;

    this.categoriesRepo = CategoriesRepo.getInstance(ds);
    this.transactionsRepo = TransactionsRepo.getInstance(ds);

    this.router.get(this.path, this.getAll);
    this.router.get(`${this.path}types`, this.getTypes);
    this.router.get(`${this.path}:id`, this.getById);
    this.router.post(this.path, this.create);
    this.router.put(`${this.path}:id`, this.update);
    this.router.delete(this.path, this.delete);
  }

  public router = express.Router();

  private categoriesRepo: CategoriesRepo;

  private ds: DataSource;

  private path = '/';

  private transactionsRepo: TransactionsRepo;

  private create = async (request: express.Request, response: express.Response) => {
    console.log('tran create', request.body); //todo: типизировать body для запросов

    const tranToCreate = this.transformTranFromRequest(request);

    const tran = this.ds.manager.create(Transaction, { ...tranToCreate, user: { id: parseInt(String(request.headers.userid)) } });

    this.ds.manager
      .save(tran)
      .then((item) => {
        console.log('create - ok: ', item);
        response.send({ tran: item });
      })
      .catch((err) => {
        response.status(500);
        console.log('tran create error: ', err?.message);
        response.send({ message: err?.message });
      });
  };

  private delete = async (request: express.Request, response: express.Response) => {
    console.log('tran delete', request.body);

    await this.ds
      .createQueryBuilder()
      .delete()
      .from(Transaction)
      .where('id = :id', { id: request.body.id })
      .execute()
      .then((tran) => {
        console.log('delete - ok');
        response.send({ tran: tran });
      })
      .catch((err) => response.send(err));
  };

  private getAll = async (request: GetTransactionsRequest, response: express.Response) => {
    const userId = parseInt(String(request.headers.userid));
    const pageNumber = Number.isFinite(parseInt(request.query.page as string)) ? parseInt(request.query.page as string) : 0;
    const dtFrom = request.query.dateFrom;
    const dtEnd = request.query.dateEnd;
    const accountId = request.query.accountId;
    const categoryId = request.query?.categoryId;
    const typeId = parseInt(request.query?.typeId || '');

    const transactions = await this.transactionsRepo.getAll(userId, {
      accountId: accountId,
      categoryId: categoryId,
      dateEnd: dtEnd,
      dateFrom: dtFrom,
      typeId: typeId,
      pageNumber: pageNumber,
    });

    setTimeout(() => {
      response.send(transactions);
    }, 500);
  };

  private getById = async (request: express.Request, response: express.Response) => {
    const tranId = request.params.id;
    const userId = parseInt(String(request.headers.userid));

    try {
      const tran = await this.transactionsRepo.getById(userId, tranId);

      response.send(tran);
    } catch (err) {
      response.status(500);
      console.log('transactions getById error', err);
      response.send({ message: (err as TypeORMError)?.message });
    }
  };

  private getTypes = async (request: GetTransactionTypesRequest, response: express.Response) => {
    const hideReturns = request.query.hideReturns === '1';
    const types = await this.ds.manager.find(
      TransactionType,
      hideReturns ? { where: { id: In([ETRANSACTION_TYPE.EXPENSE, ETRANSACTION_TYPE.INCOME]) } } : undefined
    );

    response.send(types);
  };

  private transformTranFromRequest(request: express.Request): Omit<Transaction, 'id'> {
    //todo: проверка формата

    const tran: Omit<Transaction, 'id'> = {
      account: { id: request.body.accountId } as Account,
      amount: request.body.amount,
      description: request.body.description,
      dt: request.body.dt,
      type: { id: request.body.typeId },
    };

    if (request.body.typeId !== ETRANSACTION_TYPE.TRANSFER) {
      tran.category = { id: request.body.categoryId } as Category;
    } else {
      tran.toAccount = { id: request.body.toAccountId } as Account;
    }

    return tran;
  }

  private update = async (request: express.Request, response: express.Response) => {
    console.log('tran update', request.body);

    const tranToUpdate = this.transformTranFromRequest(request);

    try {
      const tran = await this.ds.manager.update(Transaction, request.params.id, tranToUpdate);
      response.send({ tran: tran });
    } catch (err) {
      console.error('tran update error', err);
      response.send(err);
    }
  };
}
