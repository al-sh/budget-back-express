export interface SyncSaveResult {
  imported?: { accounts: number; categories: number; transactions: number };
  errors: ImportError[];
}

interface ImportError {
  item: unknown;
  message: string;
}
