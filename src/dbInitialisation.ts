import { DataSource } from 'typeorm';
import { DEMO_USER_LOGIN } from './constants/users';
import { Account } from './entity/Account';
import { Category } from './entity/Category';
import { Transaction } from './entity/Transaction';
import { TransactionType } from './entity/TransactionType';
import { User } from './entity/User';
import { getPasswordHash } from './routes/auth';
import { ETRANSACTION_TYPE } from './types/transactions';
import { isNeedDbReInit } from './utils/envSettngs';

export const dbInitializer = async (ds: DataSource) => {
  console.log('isNeedDbReInit: ', isNeedDbReInit());
  if (!isNeedDbReInit()) {
    return;
  }

  ds.transaction(async (transactionalEntityManager) => {
    /** MYSQL SPECIFIC START */
    /*transactionalEntityManager.query('SET FOREIGN_KEY_CHECKS=0');
    transactionalEntityManager.query('ALTER TABLE account CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci;');
    transactionalEntityManager.query('ALTER TABLE transaction_type CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci;');
    transactionalEntityManager.query('ALTER TABLE transaction CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci;');
    transactionalEntityManager.query('ALTER TABLE category CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci;');
    transactionalEntityManager.query('ALTER TABLE user CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci;');*/
    /** MYSQL SPECIFIC END */

    const queryBuilder = transactionalEntityManager.createQueryBuilder();

    await queryBuilder.delete().from(Transaction).execute();
    await queryBuilder.delete().from(Account).execute();
    await queryBuilder.delete().from(Category).execute();
    await queryBuilder.delete().from(TransactionType).execute();
    await queryBuilder.delete().from(User).execute();

    const newDemoUser = new User();
    newDemoUser.name = 'Demo User';
    newDemoUser.login = DEMO_USER_LOGIN;
    newDemoUser.isBlocked = false;
    newDemoUser.passwordHash = getPasswordHash('demo');
    await transactionalEntityManager.save(newDemoUser);
    console.log('Saved a new user with id: ' + newDemoUser.id);

    const account = new Account();
    account.name = 'Сберкарта';
    account.initialValue = 2000;
    account.user = newDemoUser;

    const account2 = new Account();
    account2.name = 'Tinkoff Black';
    account2.initialValue = 12000;
    account2.user = newDemoUser;

    const account3 = new Account();
    account3.name = 'Клюква';
    account3.initialValue = 1000;
    account3.isActive = false;
    account3.user = newDemoUser;

    const account4 = new Account();
    account4.name = 'Вклад Прибыльный';
    account4.initialValue = 50000;
    account4.user = newDemoUser;

    await transactionalEntityManager.save([account, account2, account3, account4]);

    const type1 = new TransactionType();
    type1.id = ETRANSACTION_TYPE.EXPENSE;
    type1.name = 'Расход';

    const type2 = new TransactionType();
    type2.id = ETRANSACTION_TYPE.INCOME;
    type2.name = 'Доход';

    const type3 = new TransactionType();
    type3.id = ETRANSACTION_TYPE.RETURN_EXPENSE;
    type3.name = 'Возврат расхода';

    const type4 = new TransactionType();
    type4.id = ETRANSACTION_TYPE.RETURN_INCOME;
    type4.name = 'Возврат дохода';

    const type5 = new TransactionType();
    type5.id = ETRANSACTION_TYPE.TRANSFER;
    type5.name = 'Перевод между счетами';

    await transactionalEntityManager.save([type1, type2, type3, type4, type5]);
    console.log('TransactionTypes initialized');

    const salaryCategory = new Category();
    salaryCategory.type = { id: ETRANSACTION_TYPE.INCOME };
    salaryCategory.name = 'Зарплата';
    salaryCategory.user = newDemoUser;

    const bonusIncomeCategory = new Category();
    bonusIncomeCategory.type = { id: ETRANSACTION_TYPE.INCOME };
    bonusIncomeCategory.name = 'Премия';
    bonusIncomeCategory.user = newDemoUser;

    const groceryCategory = new Category();
    groceryCategory.type = { id: ETRANSACTION_TYPE.EXPENSE };
    groceryCategory.name = 'Продукты';
    groceryCategory.user = newDemoUser;

    const apartmentCategory = new Category();
    apartmentCategory.type = { id: ETRANSACTION_TYPE.EXPENSE };
    apartmentCategory.name = 'Квартира';
    apartmentCategory.user = newDemoUser;

    await transactionalEntityManager.save([salaryCategory, bonusIncomeCategory, groceryCategory, apartmentCategory]);
    console.log('Categories initialized');

    const utilitiesTran = new Transaction();
    utilitiesTran.account = account2;
    utilitiesTran.amount = 423000;
    utilitiesTran.category = apartmentCategory;
    utilitiesTran.dt = new Date();
    utilitiesTran.description = 'Коммуналка';
    utilitiesTran.user = newDemoUser;

    const capitalRepairTran = new Transaction();
    capitalRepairTran.account = account2;
    capitalRepairTran.amount = 81500;
    capitalRepairTran.category = apartmentCategory;
    capitalRepairTran.dt = new Date();
    capitalRepairTran.description = 'Капремонт';
    capitalRepairTran.user = newDemoUser;

    const avanceTran = new Transaction();
    avanceTran.account = account;
    avanceTran.amount = 8000000;
    avanceTran.category = salaryCategory;
    avanceTran.dt = new Date();
    avanceTran.description = 'Аванс';
    avanceTran.user = newDemoUser;

    await transactionalEntityManager.save([utilitiesTran, capitalRepairTran, avanceTran]);
    console.log('Transactions initialized');

    // transactionalEntityManager.query('SET FOREIGN_KEY_CHECKS=1');
  });
};
