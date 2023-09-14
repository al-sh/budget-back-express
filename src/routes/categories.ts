import * as express from 'express';
import { DataSource, FindOptionsWhere } from 'typeorm';
import { Category, ICategoryTreeItem } from '../entity/Category';
import { CategoriesRepo } from '../repos/categories.repo';
import { BaseItemRequest, BaseUpdate } from '../types/api';
import { ETRANSACTION_TYPE } from '../types/transactions';

export interface GetAllCategoriesRequest extends express.Request {
  query: {
    showHidden?: string;
    typeId?: string;
  };
}

type GetCategoriesTreeParams = {
  showHidden: string;
  typeId: string;
};

export interface GetCategoriesTree extends express.Request {
  params: GetCategoriesTreeParams;
}

export interface GetAllCategoriesQuery {
  showHidden?: string;
  typeId?: string;
}

export class CategoriesController {
  constructor(ds: DataSource) {
    this.ds = ds;
    this.categoriesService = CategoriesRepo.getInstance(ds);

    this.router.get(this.path, this.getAll);
    this.router.get(`${this.path}tree`, this.getTree);

    this.router.get(`${this.path}:id`, this.getById);
    this.router.post(this.path, this.create);
    this.router.put(`${this.path}:id`, this.update);
    this.router.delete(`${this.path}:id`, this.delete);
  }

  public router = express.Router();

  private categoriesService: CategoriesRepo;

  private ds: DataSource;

  private path = '/';

  private create = async (request: express.Request<null, null, Category>, response: express.Response) => {
    const categoryToCreate: Omit<Category, 'id'> = {
      name: request.body.name as string,
      type: { id: parseInt(String(request.body.type?.id)) },
    };

    const parentCategoryId = request.body.parentCategory?.id;
    if (parentCategoryId) {
      categoryToCreate.parentCategory = { id: parentCategoryId } as Category;
    }

    const res = await this.categoriesService.create(parseInt(String(request.headers.userid)), categoryToCreate);
    response.send(res);
  };

  private delete = async (request: express.Request<BaseItemRequest>, response: express.Response<BaseUpdate>) => {
    const categoryId = parseInt(request.params.id);

    if (!categoryId) {
      response.status(500);
      response.send({ message: `category delete error. request.params.id: ${request.params.id}` });
      return;
    }

    try {
      const res = await this.ds.manager.update(Category, categoryId, { isActive: false });
      response.send(res);
    } catch (err) {
      console.error('category delete error: ', err);
      response.send({ message: `category delete error. request.params.id: ${request.params.id}`, additional: err });
    }
  };

  private getAll = async (request: GetAllCategoriesRequest, response: express.Response<Category[]>) => {
    let typeId: ETRANSACTION_TYPE = parseInt(
      Array.isArray(request.query.typeId) ? request.query.typeId.join('') : (request.query.typeId as string)
    );

    if (typeId === ETRANSACTION_TYPE.RETURN_EXPENSE) typeId = ETRANSACTION_TYPE.EXPENSE;
    if (typeId === ETRANSACTION_TYPE.RETURN_INCOME) typeId = ETRANSACTION_TYPE.INCOME;

    const showHidden = request.query.showHidden === '1';

    const categories = await this.categoriesService.getAll(Number(request.headers.userid), { showHidden: showHidden, typeId: typeId });

    setTimeout(() => {
      response.send(categories);
    }, 500);
  };

  private getById = async (request: express.Request<BaseItemRequest>, response: express.Response) => {
    const id = request.params.id;

    const category = await this.ds.manager.findOne(Category, {
      relations: ['type', 'childrenCategories', 'parentCategory'],
      where: { id: id, user: { id: Number(request.headers.userid) } },
    });

    if (!category) {
      console.error('categories getById request.params.id', request.params.id, ' - not found');
      response.status(500);
      response.send('category not found');
    }

    setTimeout(() => {
      response.send(category);
    }, 1000);
  };

  private getTree = async (request: GetCategoriesTree, response: express.Response<ICategoryTreeItem[]>) => {
    let typeId: ETRANSACTION_TYPE = parseInt(
      Array.isArray(request.query.typeId) ? request.query.typeId.join('') : (request.query.typeId as string)
    );

    if (typeId === ETRANSACTION_TYPE.RETURN_EXPENSE) typeId = ETRANSACTION_TYPE.EXPENSE;
    if (typeId === ETRANSACTION_TYPE.RETURN_INCOME) typeId = ETRANSACTION_TYPE.INCOME;

    const whereClause: FindOptionsWhere<Category> = {
      type: typeId ? { id: typeId } : undefined,
      user: { id: Number(request.headers.userid) },
    };

    const showHidden = request.query.showHidden === '1';
    if (!showHidden) {
      whereClause.isActive = true;
    }

    const categoriesTree = await this.categoriesService.getTree(Number(request.headers.userid), showHidden, typeId);

    setTimeout(() => {
      response.send(categoriesTree);
    }, 500);
  };

  private update = async (request: express.Request<BaseItemRequest, null, Partial<Category>>, response: express.Response<BaseUpdate>) => {
    console.log('cat update request.body:', request.body);

    const categoryId = String(request.params.id);

    if (!categoryId) {
      response.status(500);
      response.send({ message: 'categoryId is null: ' + request.params.id });
      return;
    }

    // редактирование типа удалено, т.к. лишено всякой логики и может создать в дальнейшем ошибки
    const categoryToUpdate: Partial<Category> = {
      name: request.body.name as string,
      isActive: request.body.isActive,
    };

    categoryToUpdate.id = categoryId;

    if (request.body.parentCategory?.id) {
      categoryToUpdate.parentCategory = { id: request.body.parentCategory?.id } as Category;
    } else {
      categoryToUpdate.parentCategory = { id: undefined } as unknown as Category;
    }

    const order = parseInt(String(request.body.order));
    if (Number.isFinite(order)) {
      categoryToUpdate.order = order;
    }

    try {
      const updatedCategory = await this.ds.manager.update(Category, categoryId, categoryToUpdate);
      response.send(updatedCategory);
    } catch (err) {
      console.error(err);
      response.send({ message: 'category update error', additional: err });
    }
  };
}
