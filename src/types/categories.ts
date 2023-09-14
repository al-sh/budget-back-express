import { ETRANSACTION_TYPE } from './transactions';

export interface LocalCategory {
  id: string;
  isActive: boolean;
  mpath: string;
  name: string;
  order: number;
  parentCategoryId: string | null;
  typeId: ETRANSACTION_TYPE;
}

export interface LocalCategoryTreeItem {
  title?: string;
  id: string;
  key: string | number; //key и value - для Tree в antd
  value: string;
  isActive?: boolean;
  children?: LocalCategoryTreeItem[];
}

export interface LocalTransactionType {
  id: ETRANSACTION_TYPE;
  name: string;
}
