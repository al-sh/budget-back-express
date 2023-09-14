/* eslint-disable @typescript-eslint/member-ordering */
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Account } from './Account';
import { Category } from './Category';
import { TransactionType } from './TransactionType';
import { User } from './User';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  @Column()
  public description?: string;

  @Column()
  public amount!: number;

  @Column()
  public dt?: Date;

  @ManyToOne(() => Account, (acc) => acc.transactions)
  public account?: Account;

  @ManyToOne(() => Account, (acc) => acc.incomingTransactions)
  public toAccount?: Account;

  @ManyToOne(() => Category, (cat) => cat.transactions)
  public category?: Category; //в случае переводов между своими счетами поле пустое, но заполнен toAccount

  @ManyToOne(() => TransactionType, (type) => type.categories)
  public type!: TransactionType;

  @ManyToOne(() => User, (user) => user.transactions)
  public user?: User;
}
