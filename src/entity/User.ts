/* eslint-disable @typescript-eslint/no-inferrable-types */
/* eslint-disable @typescript-eslint/member-ordering */
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Account } from './Account';
import { Category } from './Category';
import { Transaction } from './Transaction';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  public id!: number;

  @Column()
  public name?: string;

  @Column()
  public login?: string;

  @Column()
  public passwordHash?: string;

  @Column({ nullable: true })
  public token?: string = '';

  @Column({ nullable: true })
  public loginAttemts?: number = 0;

  @Column({ nullable: true })
  public isBlocked?: boolean = false;

  @OneToMany(() => Account, (acc) => acc.user)
  public accounts?: Account[];

  @OneToMany(() => Category, (cat) => cat.user)
  public categories?: Category[];

  @OneToMany(() => Transaction, (tran) => tran.user)
  public transactions?: Transaction[];
}
