import { DataSource, FindOptionsOrder, FindOptionsWhere, In } from 'typeorm';
import { Category, ICategoryTreeItem } from '../entity/Category';
import { User } from '../entity/User';

const defaultCategoriesOrder: FindOptionsOrder<Category> = {
  order: 'ASC',
  name: 'ASC',
};

export class CategoriesRepo {
  private static instance: CategoriesRepo;

  public static getInstance(ds: DataSource): CategoriesRepo {
    if (!CategoriesRepo.instance) {
      CategoriesRepo.instance = new CategoriesRepo(ds);
    }

    return CategoriesRepo.instance;
  }

  private constructor(ds: DataSource) {
    this.ds = ds;
  }

  private ds: DataSource;

  public async create(userId: User['id'], categoryToCreate: Omit<Category, 'id'>) {
    const category = this.ds.manager.create(Category, { ...categoryToCreate, user: { id: userId } });
    category.order = 1;

    let siblings: Category[] = [];
    if (category.parentCategory?.id) {
      const parentCategory = await this.ds.manager.findOne(Category, {
        relations: ['childrenCategories'],
        where: { id: category.parentCategory?.id, user: { id: userId } },
        order: defaultCategoriesOrder,
      });
      siblings = parentCategory?.childrenCategories || [];
    } else {
      siblings = (
        await this.ds.manager.find(Category, {
          relations: ['parentCategory'],
          where: { user: { id: userId } },
          order: defaultCategoriesOrder,
        })
      ).filter((cat) => !cat.parentCategory?.id);
    }
    const lastSiblingOrder = siblings.length ? siblings[siblings.length - 1].order || 1 : 0;
    category.order = lastSiblingOrder + 1;

    try {
      this.ds.getRepository(Category).insert(category);
      return true;
    } catch (e) {
      console.error('CategoriesService create error', e);
      return false;
    }
  }

  public async getAll(
    userId: User['id'],
    params: { ids?: Category['id'][]; showHidden?: boolean; typeId?: Category['type']['id'] }
  ): Promise<Category[]> {
    const whereClause: FindOptionsWhere<Category> = {
      ...(params.ids && { id: In(params.ids) }),
      type: params.typeId ? { id: params.typeId } : undefined,
      user: { id: userId },
    };

    if (!params.showHidden) {
      whereClause.isActive = true;
    }

    try {
      const categories = await this.ds.manager.find(Category, {
        relations: ['type', 'childrenCategories', 'parentCategory'],
        where: whereClause,
        order: defaultCategoriesOrder,
      });

      return categories;
    } catch (e) {
      const errMessage = 'categoriesRepo getAll error' + e;
      throw new Error(errMessage);
      console.error(errMessage);
    }
    return [];
  }

  public async getTree(userId: User['id'], showHidden?: boolean, typeId?: Category['type']['id']): Promise<ICategoryTreeItem[]> {
    const whereClause: FindOptionsWhere<Category> = {
      type: typeId ? { id: typeId } : undefined,
      user: { id: userId },
    };

    if (!showHidden) {
      whereClause.isActive = true;
    }

    const categories = await this.ds.manager.find(Category, {
      relations: ['type', 'parentCategory'],
      where: whereClause,
      order: defaultCategoriesOrder,
    });

    const tree = categories
      ?.filter((item) => !item.parentCategory)
      .map((itemWithoutParents) => this.getTreeItem(itemWithoutParents, categories));

    return tree;
  }

  private getTreeItem = (category: Category, categories: Category[]) => {
    const item: ICategoryTreeItem = {
      title: category.name,
      key: category.id,
      id: category.id,
      value: category.id,
      isActive: category.isActive,
      transactions: category.transactions,
    };
    const children = categories.filter((item) => item.parentCategory?.id === category?.id);
    if (children?.length) {
      item.children = children.map((child) => this.getTreeItem(child, categories));
    }

    return item;
  };
}
