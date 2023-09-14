/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { ETRANSACTION_TYPE } from '../types/transactions';
import { Category } from './Category';

@Entity()
export class TransactionType {
  @PrimaryColumn()
  id!: ETRANSACTION_TYPE;

  @Column()
  name?: string;

  @Column()
  imageUrl?: string = '';

  @OneToMany(() => Category, (cat) => cat.type)
  categories?: Category[];
}
