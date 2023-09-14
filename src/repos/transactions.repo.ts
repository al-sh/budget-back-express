import { DataSource, FindOptionsWhere, In } from 'typeorm';
import { PAGE_SIZE } from '../constants/misc';
import { Optional } from '../utils/utilityTypes';
import { Account } from '../entity/Account';
import { Category } from '../entity/Category';
import { Transaction } from '../entity/Transaction';
import { User } from '../entity/User';
import { ETRANSACTION_TYPE } from '../types/transactions';
import { buildPeriodFilterString } from '../utils/dates';
import { CategoriesRepo } from './categories.repo';

type TransactionToInsert = Optional<Transaction, 'toAccount' | 'category' | 'description'>;

export class TransactionsRepo {
  private static instance: TransactionsRepo;

  public static getInstance(ds: DataSource): TransactionsRepo {
    if (!TransactionsRepo.instance) {
      TransactionsRepo.instance = new TransactionsRepo(ds);
    }
    return TransactionsRepo.instance;
  }

  private constructor(ds: DataSource) {
    this.ds = ds;
    this.categoriesService = CategoriesRepo.getInstance(ds);
  }

  private categoriesService: CategoriesRepo;

  private ds: DataSource;

  public create(item: TransactionToInsert) {
    console.log('todo', item);
  }

  public getAll = async (
    userId: User['id'],
    params: {
      accountId?: Account['id'];
      categoryId?: Category['id'];
      dateEnd?: string;
      dateFrom?: string;
      excludeReturns?: boolean;
      pageNumber?: number;
      typeId?: Transaction['type']['id'];
    }
  ) => {
    const accounts = await this.ds.manager.find(Account, { where: { user: { id: userId } } });

    const accountIds = accounts.map((acc) => acc.id);
    const whereClause: FindOptionsWhere<Transaction> = { account: { id: In(accountIds) } };

    const filterAccountId = params.accountId;
    if (filterAccountId) {
      if (accounts.find((acc) => acc.id === filterAccountId)) {
        whereClause.account = { id: filterAccountId };
      } else {
        const errMessage = `Данный счет не принадлежит данному клиенту! filterAccountId' ${filterAccountId} userId ${userId}`;
        console.error('TransactionsRepo getAll', errMessage);
        throw new Error(errMessage);
      }
    }

    const typeId = params.typeId;
    if (!params.excludeReturns && typeId === ETRANSACTION_TYPE.EXPENSE) {
      whereClause.type = { id: In([ETRANSACTION_TYPE.EXPENSE, ETRANSACTION_TYPE.RETURN_EXPENSE]) };
    }

    if (!params.excludeReturns && typeId === ETRANSACTION_TYPE.INCOME) {
      whereClause.type = { id: In([ETRANSACTION_TYPE.INCOME, ETRANSACTION_TYPE.RETURN_INCOME]) };
    }

    const filterCategoryId = params?.categoryId;
    if (filterCategoryId) {
      const allCategories = await this.categoriesService.getAll(userId, { showHidden: false });

      if (allCategories.findIndex((cat) => cat.id === filterCategoryId) === -1) {
        const errMessage = `Данная категория не принадлежит данному клиенту! request.query.categoryId' ${filterCategoryId} userId ${userId}`;
        console.error('TransactionsRepo getAll', errMessage);
        throw new Error(errMessage);
      }
      const childrenCategories = allCategories.filter((cat) => cat.parentCategory?.id === filterCategoryId);
      const categoriesIds: Category['id'][] = [...childrenCategories.map((cat) => cat.id), filterCategoryId];
      whereClause.category = { id: In(categoriesIds) };
    }

    const dtFrom = params.dateFrom;
    const dtEnd = params.dateEnd;
    if (dtFrom || dtEnd) {
      whereClause.dt = buildPeriodFilterString(dtFrom, dtEnd);
    }

    const transactions = await this.ds.manager.find(Transaction, {
      relations: ['account', 'category', 'category.type', 'category.parentCategory', 'type'],
      where: whereClause,
      order: {
        dt: 'DESC',
      },
      ...(params.pageNumber && { skip: (params.pageNumber - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    });

    return transactions;
  };

  public getById = async (userId: User['id'], tranId: Transaction['id']) => {
    const tran = await this.ds.manager.findOne(Transaction, {
      relations: ['account', 'toAccount', 'category', 'category.type', 'type'],
      where: { id: tranId, user: { id: userId } },
    });

    return tran;
  };
}
