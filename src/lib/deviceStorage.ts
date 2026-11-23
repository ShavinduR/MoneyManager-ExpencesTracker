/** Thin wrapper around the StorageManager API (not available in every browser). */
export type StorageInfo = { usageBytes: number | null; persisted: boolean | null };

export const getStorageInfo = async (): Promise<StorageInfo> => {
  const manager = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!manager) return { usageBytes: null, persisted: null };
  const [estimate, persisted] = await Promise.all([
    manager.estimate ? manager.estimate().catch(() => null) : Promise.resolve(null),
    manager.persisted ? manager.persisted().catch(() => null) : Promise.resolve(null),
  ]);
  return { usageBytes: estimate?.usage ?? null, persisted };
};

/** Asks the browser not to evict this site's data under storage pressure. */
export const requestPersistentStorage = async (): Promise<boolean> => {
  const manager = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!manager?.persist) return false;
  return manager.persist().catch(() => false);
};

export const formatBytes = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
