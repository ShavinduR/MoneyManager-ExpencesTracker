import { migrateToLatest } from './migrations';
import type { LoadResult } from './repository';
import { salvageFinanceData } from './salvage';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Shared by every adapter: raw stored document → migrate → salvage record by record.
 * `keepRecoveryCopy` is called (additively) whenever something couldn't be read.
 */
export const interpretStoredDocument = async (
  doc: unknown,
  keepRecoveryCopy: (reason: string) => Promise<void>,
): Promise<LoadResult> => {
  if (!isRecord(doc)) {
    await keepRecoveryCopy('Stored data is not a JSON object');
    return { kind: 'unreadable', error: 'Stored data is not in a format this app understands.' };
  }
  const migrated = migrateToLatest(doc);
  if (!migrated.ok || !isRecord(migrated.value)) {
    const error = migrated.ok ? 'Stored data is not in a format this app understands.' : migrated.error;
    await keepRecoveryCopy(error);
    return { kind: 'unreadable', error };
  }
  const { data, issues } = salvageFinanceData(migrated.value);
  if (issues.length > 0) await keepRecoveryCopy(issues.join(' '));
  return { kind: 'loaded', data, issues };
};
