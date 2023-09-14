import { UpdateResult } from 'typeorm';

export type BaseItemRequest = {
  id: string;
};

export type BaseResponse<T> = T | Error;

export type BaseUpdate = BaseResponse<UpdateResult>;

export type Error = {
  additional?: unknown;
  message: string;
};
