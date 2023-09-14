import format from 'date-fns/format';
import isValid from 'date-fns/isValid';
import * as express from 'express';
import fs from 'fs';
import multer from 'multer';
import { DataSource } from 'typeorm';
import { Account } from '../entity/Account';
import { Category } from '../entity/Category';
import { Transaction } from '../entity/Transaction';
import { User } from '../entity/User';
import { LocalAccount } from '../types/accounts';
import { BaseItemRequest, BaseResponse } from '../types/api';
import { LocalCategory } from '../types/categories';
import { ETRANSACTION_TYPE, LocalTransaction } from '../types/transactions';
import { SyncSaveResult } from '../types/sync';

export class SyncController {
  constructor(ds: DataSource) {
    this.ds = ds;

    //TODO: проверять что в системе нет таких счетов/транзакций у других пользователей
    // вариант - сделать через просто удаление всех предыдущих счетов/категорий и insert новых (не использовать save)
    this.router.get(`${this.path}download/all`, this.exportAll);
    this.router.post(`${this.path}upload/all/file`, multer().single('fileData'), this.importAllFromFile);
    this.router.post(`${this.path}upload/all/raw`, multer().single('fileData'), this.importAllRaw);
    this.router.post(`${this.path}upload/accounts`, multer().single('fileData'), this.importAccounts);
    this.router.post(`${this.path}upload/categories`, multer().single('fileData'), this.importCategories);
    this.router.post(`${this.path}upload/transactions`, multer().single('fileData'), this.importTransactions);
  }

  public router = express.Router();

  private ds: DataSource;

  private path = '/';

  private buildAccountFromObject: (object: Partial<LocalAccount>, userId: User['id']) => { errorText: string; item?: Account } = (
    object,
    userId
  ) => {
    const newAcc = new Account();
    let errorText = '';

    if (String(object.id)) {
      newAcc.id = String(object.id);
    } else {
      errorText = 'id is null';
    }

    newAcc.name = String(object.name);
    newAcc.isActive = !!object.isActive;

    const initialValue = parseFloat(String(object.initialValue));
    if (Number.isFinite(initialValue)) {
      newAcc.initialValue = initialValue;
    } else {
      errorText = 'initialValue is not number';
    }
    newAcc.icon = String(object.icon);
    newAcc.user = { id: userId };

    return { errorText: errorText, item: !errorText ? newAcc : undefined };
  };

  private buildCategoryFromObject: (object: Partial<LocalCategory>, userId: User['id']) => { errorText: string; item?: Category } = (
    object,
    userId
  ) => {
    const newCat = new Category();
    let errorText = '';

    if (String(object.id)) {
      newCat.id = String(object.id);
    } else {
      errorText = 'id is null';
    }

    newCat.name = String(object.name);
    newCat.isActive = !!object.isActive;
    newCat.type = { id: object.typeId as ETRANSACTION_TYPE };
    newCat.parentCategory = { id: object.parentCategoryId } as Category;

    const order = parseInt(object.order as unknown as string);
    if (Number.isFinite(order)) {
      newCat.order = order;
    }

    newCat.user = { id: userId };

    return { errorText: errorText, item: !errorText ? newCat : undefined };
  };

  private buildTransactionFromObject: (
    object: Partial<LocalTransaction>,
    userId: number,
    accountIds: Account['id'][],
    categoriesIds: Category['id'][]
  ) => { errorText: string; item?: Transaction } = (object, userId, accountIds, categoriesIds) => {
    let errorText = '';

    const newTran = new Transaction();
    if (String(object.id)) {
      newTran.id = String(object.id);
    } else {
      errorText = 'id is null';
    }

    const amount = parseInt(String(object.amount));
    if (Number.isFinite(amount)) {
      newTran.amount = amount;
    } else {
      errorText = 'incorrect amount';
    }

    const typeId = parseInt(String(object.typeId));
    if (Number.isFinite(typeId)) {
      newTran.type = { id: typeId };
    } else {
      errorText = 'incorrect typeId';
    }

    newTran.description = String(object.description);
    const dt = new Date(String(object.dt));
    if (isValid(dt)) {
      newTran.dt = dt;
    } else {
      errorText = 'incorrect dt';
    }

    if (!object.accountId) {
      errorText = 'accountId is null';
    }

    if (accountIds.includes(String(object.accountId))) {
      newTran.account = { id: object.accountId } as Account;
    } else {
      errorText = 'accountId not found';
    }

    if (object.toAccountId) {
      if (accountIds.includes(String(object.toAccountId))) {
        newTran.toAccount = { id: object.toAccountId } as Account;
      } else {
        errorText = 'toAccountId not found';
      }
    }

    if (!object.toAccountId) {
      if (categoriesIds.includes(String(object.categoryId))) {
        newTran.category = { id: object.categoryId } as Category;
      } else {
        errorText = 'category not found';
      }
    }

    newTran.user = { id: userId };

    return { errorText: errorText, item: !errorText ? newTran : undefined };
  };

  private exportAll = async (request: express.Request<BaseItemRequest>, response: express.Response) => {
    const getAccountsQuery = `SELECT id, name, "isActive", "initialValue", icon FROM account where "userId" = $1`;
    const getCategoriesQuery = `SELECT id, name, "isActive", mpath, "typeId", "parentCategoryId", "order" FROM category where "userId" = $1`;
    const getTransactionsQuery = `SELECT description, amount, dt, "categoryId", id, "accountId", "toAccountId", "typeId" FROM "transaction" where "userId"=$1`;

    try {
      const queryRunner = await this.ds.createQueryRunner();
      const userId = parseInt(String(request.headers.userid));

      const accounts = await queryRunner.manager.query(getAccountsQuery, [userId]);
      const categories = await queryRunner.manager.query(getCategoriesQuery, [userId]);
      const transactions = await queryRunner.manager.query(getTransactionsQuery, [userId]);

      response.send({ accounts: accounts, categories: categories, transactions: transactions });
    } catch (err) {
      console.error('exportAll error: ', err);
      response.status(500);
      response.send({ message: `exportAll error`, additional: err });
    }
  };

  private exportToFile = async (request: express.Request<BaseItemRequest>, response: express.Response) => {
    const getCategoriesQuery = `SELECT id, name, "isActive", mpath, "typeId", "parentCategoryId" FROM category where "userId" = $1`;
    const queryRunner = await this.ds.createQueryRunner();
    const result = await queryRunner.manager.query(getCategoriesQuery, [parseInt(String(request.headers.userid))]);

    const dt = new Date();
    const fileName = `${format(dt, 'yyyyMMdd_HHmmss')}`;
    const fileFullPath = `${__dirname}/${fileName}.txt`;

    fs.writeFile(fileFullPath, JSON.stringify(result), function (err) {
      if (err) {
        return console.log(err);
      }
      response.sendFile(fileFullPath);
      console.log('The file was saved!');
    });
  };

  private importAccounts = async (request: express.Request<BaseItemRequest>, response: express.Response) => {
    try {
      const accounts = JSON.parse(request.file?.buffer + '');
      if (!Array.isArray(accounts)) {
        response.status(500);
        response.send({ message: 'Некорректный формат файла' });
      }

      const importErrors: { item: unknown; message: string }[] = [];
      const itemsToCreate: Account[] = [];
      for (let i = 0; i < accounts.length; i++) {
        const itemFromFile = accounts[i];

        const newAcc = this.buildAccountFromObject(itemFromFile, parseInt(String(request.headers.userid)));
        if (newAcc.item) {
          itemsToCreate.push(newAcc.item);
        } else {
          importErrors.push({ item: itemFromFile, message: newAcc.errorText });
        }
      }

      await this.ds.manager.save(itemsToCreate);
      // this.ds.getRepository(Account).insert(itemsToCreate);
      response.send({ imported: itemsToCreate.length, errors: importErrors });
    } catch (err) {
      console.error('accounts import error: ', err);
      response.status(500);
      response.send({ message: `accounts import error`, additional: err });
    }
  };

  private importAll = async (
    userId: number,
    accounts: LocalAccount[],
    categories: LocalCategory[],
    transactions: LocalTransaction[],
    response: express.Response<BaseResponse<SyncSaveResult>>
  ) => {
    try {
      if (!Array.isArray(accounts) || !Array.isArray(categories) || !Array.isArray(transactions)) {
        response.status(500);
        response.send({ message: 'Некорректный формат файла' });
        return;
      }

      const importErrors: { item: unknown; message: string }[] = [];

      const accsToCreate: Account[] = [];
      for (let i = 0; i < accounts.length; i++) {
        const accFromFile = accounts[i];

        const newAcc = this.buildAccountFromObject(accFromFile, userId);
        if (newAcc.item) {
          accsToCreate.push(newAcc.item);
        } else {
          importErrors.push({ item: accFromFile, message: newAcc.errorText });
        }
      }

      const categoriesToCreate: Category[] = [];
      for (let i = 0; i < categories.length; i++) {
        const catFromFile = categories[i];

        const newCat = this.buildCategoryFromObject(catFromFile, userId);
        if (newCat.item) {
          categoriesToCreate.push(newCat.item);
        } else {
          importErrors.push({ item: catFromFile, message: newCat.errorText });
        }
      }

      const accountIds: Account['id'][] = accsToCreate.map((acc) => acc.id);
      const categoriesIds: Category['id'][] = categoriesToCreate.map((category) => category.id);

      const transactionsToCreate: Transaction[] = [];
      for (let i = 0; i < transactions.length; i++) {
        const tranFromFile = transactions[i];

        const newTran = this.buildTransactionFromObject(tranFromFile, userId, accountIds, categoriesIds);
        if (newTran.item) {
          transactionsToCreate.push(newTran.item);
        } else {
          importErrors.push({ item: tranFromFile, message: newTran.errorText });
        }
      }

      if (importErrors.length > 0) {
        response.status(500);
        response.send({ errors: importErrors });
        return;
      }

      await this.ds.transaction(async (transactionalEntityManager) => {
        await transactionalEntityManager.delete(Transaction, { user: { id: userId } });
        await transactionalEntityManager.delete(Account, { user: { id: userId } });
        await transactionalEntityManager.delete(Category, { user: { id: userId } });
        await transactionalEntityManager.insert(Account, accsToCreate);
        await transactionalEntityManager.insert(Category, categoriesToCreate);
        await transactionalEntityManager.insert(Transaction, transactionsToCreate);
      });

      const res: SyncSaveResult = {
        imported: { accounts: accsToCreate.length, categories: categoriesToCreate.length, transactions: transactionsToCreate.length },
        errors: importErrors,
      };

      response.send(res);
    } catch (err) {
      console.error('importAll error: ', err);
      response.status(500);
      response.send({ message: `importAll error`, additional: err });
    }
  };

  private importAllFromFile = async (request: express.Request<BaseItemRequest>, response: express.Response) => {
    const fileContent = JSON.parse(request.file?.buffer + '');
    const accounts = fileContent.accounts;
    const categories = fileContent.categories;
    const transactions = fileContent.transactions;
    const userId = parseInt(String(request.headers.userid));
    this.importAll(userId, accounts, categories, transactions, response);
  };

  private importAllRaw = async (request: express.Request, response: express.Response) => {
    const accounts = request.body.accounts;
    const categories = request.body.categories;
    const transactions = request.body.transactions;
    const userId = parseInt(String(request.headers.userid));

    this.importAll(userId, accounts, categories, transactions, response);
  };

  private importCategories = async (request: express.Request<BaseItemRequest>, response: express.Response) => {
    try {
      const categoriesFromFile = JSON.parse(request.file?.buffer + '');
      if (!Array.isArray(categoriesFromFile)) {
        response.status(500);
        response.send({ message: 'Некорректный формат файла' });
      }

      const importErrors: { item: unknown; message: string }[] = [];
      const itemsToCreate: Category[] = [];
      for (let i = 0; i < categoriesFromFile.length; i++) {
        const itemFromFile = categoriesFromFile[i];

        const newCat = this.buildCategoryFromObject(itemFromFile, parseInt(String(request.headers.userid)));
        if (newCat.item) {
          itemsToCreate.push(newCat.item);
        } else {
          importErrors.push({ item: itemFromFile, message: newCat.errorText });
        }
      }

      await this.ds.manager.save(itemsToCreate);
    } catch (err) {
      console.error('category import error: ', err);
      response.status(500);
      response.send({ message: `category import error`, additional: err });
    }
  };

  private importTransactions = async (request: express.Request<BaseItemRequest>, response: express.Response) => {
    try {
      const fileContent = JSON.parse(request.file?.buffer + '');
      if (!Array.isArray(fileContent)) {
        response.status(500);
        response.send({ message: 'Некорректный формат файла' });
      }
      const userId = parseInt(String(request.headers.userid));

      const categories = await this.ds.manager.find(Category, {
        where: { user: { id: userId } },
      });
      const categoriesIds: Category['id'][] = categories.map((category) => category.id);

      const accounts = await this.ds.manager.find(Account, {
        where: { user: { id: Number(request.headers.userid) } },
      });
      const accountIds: Account['id'][] = accounts.map((account) => account.id);

      const importErrors: { item: unknown; message: string }[] = [];
      const itemsToCreate: Transaction[] = [];
      for (let i = 0; i < fileContent.length; i++) {
        const newTran = this.buildTransactionFromObject(fileContent[i], userId, accountIds, categoriesIds);
        if (newTran.item) {
          itemsToCreate.push(newTran.item);
        } else {
          importErrors.push({ item: newTran, message: newTran.errorText });
        }
      }

      await this.ds.manager.save(itemsToCreate);
      response.send({ imported: itemsToCreate.length, errors: importErrors });
    } catch (err) {
      console.error('transactions import error: ', err);
      response.status(500);
      response.send({ message: `transactions import error`, additional: err });
    }
  };
}
