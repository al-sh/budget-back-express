import { DataSource } from 'typeorm';
import { Category, CategoryWithAmount } from '../entity/Category';
import { Transaction } from '../entity/Transaction';
import { ETRANSACTION_TYPE } from '../types/transactions';
import { CategoriesRepo } from '../repos/categories.repo';

export class StatisticsService {
  private static instance: StatisticsService;

  public static getInstance(ds: DataSource): StatisticsService {
    if (!StatisticsService.instance) {
      StatisticsService.instance = new StatisticsService(ds);
    }
    return StatisticsService.instance;
  }

  private constructor(ds: DataSource) {
    this.ds = ds;
    this.categoriesService = CategoriesRepo.getInstance(ds);
  }

  private categoriesService: CategoriesRepo;

  private ds: DataSource;

  public calculateAmount = (category: Category, categories: Category[]) => {
    const selfAmount = this.calculateTransactions(category.transactions || []);
    let totalAmount = selfAmount;
    const childrenCategories = categories.filter((cat) => cat.parentCategory?.id === category.id);
    if (childrenCategories) {
      const childrenAmount = childrenCategories.reduce((prev, current) => prev + this.calculateTransactions(current.transactions || []), 0);
      totalAmount = selfAmount + childrenAmount;
    }
    return { selfAmount, totalAmount };
  };

  public calculatePercents = (category: CategoryWithAmount, categories: CategoryWithAmount[]) => {
    const parentSelfAmount = category.parentCategory?.id
      ? categories.find((cat) => cat.id === category.parentCategory?.id)?.selfAmount || 0
      : 0;

    const total = categories.reduce((prev, current) => {
      if (category?.parentCategory?.id === current?.parentCategory?.id) {
        return prev + current.totalAmount;
      }

      return prev;
    }, parentSelfAmount);

    return total ? (category.totalAmount * 100) / total : 0;
  };

  public calculateTransactions = (transactions: Transaction[]) => {
    // только для массива транзакций одной категории
    const rest = transactions.reduce((prev, current) => {
      if (current?.type?.id === ETRANSACTION_TYPE.RETURN_INCOME || current?.type?.id === ETRANSACTION_TYPE.RETURN_EXPENSE) {
        return prev - current.amount;
      }

      return prev + current.amount;
    }, 0);

    return rest;
  };

  public calculateTransactionsByCategories = (transactions: Transaction[], categoryIds: string[]) => {
    const filteredTransactions = transactions.filter((item) => item.category?.id && categoryIds.includes(item.category?.id));
    return this.calculateTransactions(filteredTransactions);
  };

  public filterTransactionsByPeriod(period: string, transactions: Transaction[]) {
    const year = parseInt(period.substring(0, 4));
    const month = parseInt(period.substring(5, 7)) - 1;

    return transactions.filter((item) => item.dt?.getFullYear() === year && item.dt.getMonth() === month);
  }
}
