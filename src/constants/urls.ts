export const homepage = 'budget';

export const publicUrl = location?.origin + '/' + homepage;

const uiRoot = '/' + homepage;

export const UI_ROUTES = {
  HOME: `${uiRoot}/home`,
  SETTINGS: {
    ROOT: `${uiRoot}/settings`,
    ACCOUNTS: `${uiRoot}/accounts`,
    CATEGORIES: `${uiRoot}/settings/categories`,
    SYNC: `${uiRoot}/settings/sync`,
    LOGIN: `${uiRoot}/settings/login`,
  },
  STATISTICS: `${uiRoot}/statistics`,
  TRANSACTIONS: `${uiRoot}/transactions`,
};
