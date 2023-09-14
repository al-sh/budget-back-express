console.time('total serverInit');

import dotenvFlow from 'dotenv-flow';
dotenvFlow.config();
console.log('env loaded');

import express from 'express';
import { API_ROUTES } from './constants/api-routes';

import { AppDataSource } from './data-source';
import { dbInitializer } from './dbInitialisation';
import { AccountsController } from './routes/accounts';
import { AuthController } from './routes/auth';
import { CategoriesController } from './routes/categories';
import { StatisticsController } from './routes/statistics';
import { SyncController } from './routes/sync';
import { TransactionsController } from './routes/transactions';

const app = express();
const port = 3001;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Auth, UserId');
  res.header('Access-Control-Max-Age', '1000');

  next();
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

AppDataSource.initialize()
  .then(async () => {
    console.time('initDB');
    dbInitializer(AppDataSource);
    console.timeEnd('initDB');

    console.time('routesAdd');
    const MAIN_ROUTE = '/api/';

    const authController = new AuthController(AppDataSource);
    app.use(MAIN_ROUTE, authController.router);

    const accountsController = new AccountsController(AppDataSource);
    app.use(MAIN_ROUTE + API_ROUTES.ACCOUNTS, accountsController.router);

    const categoriesController = new CategoriesController(AppDataSource);
    app.use(MAIN_ROUTE + API_ROUTES.CATEGORIES, categoriesController.router);

    const statisticsController = new StatisticsController(AppDataSource);
    app.use(MAIN_ROUTE + API_ROUTES.STATISTICS, statisticsController.router);

    const transactionsController = new TransactionsController(AppDataSource);
    app.use(MAIN_ROUTE + API_ROUTES.TRANSACTIONS, transactionsController.router);

    const syncController = new SyncController(AppDataSource);
    app.use(MAIN_ROUTE + API_ROUTES.SYNC, syncController.router);
    console.timeEnd('routesAdd');

    app.listen(port, '0.0.0.0', () => {
      console.log(`Example app listening on port ${port}`);
    });
    console.timeEnd('total serverInit');
  })
  .catch((error) => console.log(error));
