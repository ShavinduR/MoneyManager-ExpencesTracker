import { IndexedDbRepository } from './indexedDbRepository';
import { LocalStorageRepository } from './localStorageRepository';
import type { FinanceRepository } from './repository';

export const createRepository = (): FinanceRepository =>
  typeof indexedDB !== 'undefined' ? new IndexedDbRepository() : new LocalStorageRepository();

export type { FinanceRepository } from './repository';
