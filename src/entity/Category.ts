/* eslint-disable @typescript-eslint/no-inferrable-types */
/* eslint-disable @typescript-eslint/member-ordering */
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, Tree, TreeChildren, TreeParent } from 'typeorm';
import { Transaction } from './Transaction';
import { TransactionType } from './TransactionType';
import { User } from './User';

@Entity()
@Tree('materialized-path')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  @Column()
  public name?: string;

  @Column()
  public isActive?: boolean = true;

  @Column({ type: 'int', nullable: true })
  public order?: number = 0;

  @ManyToOne(() => TransactionType, (type) => type.categories)
  public type!: TransactionType;

  @TreeChildren({ cascade: true })
  public childrenCategories?: Category[];

  @TreeParent()
  public parentCategory?: Category;

  @OneToMany(() => Transaction, (tran) => tran.category)
  public transactions?: Transaction[];

  @ManyToOne(() => User, (user) => user.accounts)
  public user?: User;
}

export interface CategoryWithAmount extends Category {
  selfAmount: number;
  totalAmount: number;
}

export interface CategoryWithAmountAndShare extends CategoryWithAmount {
  share: number;
}

export interface ICategoryTreeItem {
  title?: string;
  id: string;
  key: string | number; //key и value - для Tree в antd
  value: string;
  isActive?: boolean;
  children?: ICategoryTreeItem[];
  transactions?: Transaction[];
}

export interface ICategoryStatItem extends ICategoryTreeItem {
  selfAmount: number;
  totalAmount: number;
  share: number;
}
