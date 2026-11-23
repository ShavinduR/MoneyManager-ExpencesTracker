import { SCHEMA_VERSION } from '@/types/finance';

/**
 * Upgrades older backup/stored documents to the current schema before validation.
 * Each step takes version N and returns version N+1. v1 is the first public schema,
 * so there are no steps yet. Add `2: (doc) => ...` here when bumping SCHEMA_VERSION.
 */
type Migration = (doc: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, Migration> = {};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export type MigrationOutcome = { ok: true; value: unknown } | { ok: false; error: string };

export const migrateToLatest = (input: unknown): MigrationOutcome => {
  if (!isRecord(input)) return { ok: false, error: 'Expected a JSON object.' };
  const version = typeof input.schemaVersion === 'number' ? input.schemaVersion : 1;
  if (version > SCHEMA_VERSION) {
    return { ok: false, error: `This backup was made by a newer version of the app (schema v${version}). Update the app first.` };
  }
  let doc = input;
  for (let v = version; v < SCHEMA_VERSION; v += 1) {
    const step = MIGRATIONS[v + 1];
    if (!step) return { ok: false, error: `No migration from schema v${v} to v${v + 1}.` };
    doc = { ...step(doc), schemaVersion: v + 1 };
  }
  return { ok: true, value: doc };
};
