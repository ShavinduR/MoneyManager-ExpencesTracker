import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SAVINGS_CATEGORIES } from '@/types/finance';
import { EXPENSE_LABELS, INCOME_LABELS, KIND_LABELS, SAVINGS_LABELS } from '@/lib/categories';
import type { EntryTarget } from './lexicon';

/** Every selectable (kind, category) pair, for the confirmation pill's category picker. */
export const ALL_TARGETS: readonly EntryTarget[] = [
  ...INCOME_CATEGORIES.map((category): EntryTarget => ({ kind: 'income', category })),
  ...SAVINGS_CATEGORIES.map((category): EntryTarget => ({ kind: 'savings', category })),
  { kind: 'debt', category: 'debt' },
  ...EXPENSE_CATEGORIES.filter((c) => c !== 'debt').map((category): EntryTarget => ({ kind: 'fixed', category })),
];

export const encodeTarget = (t: EntryTarget): string => `${t.kind}:${t.category}`;

export const decodeTarget = (value: string): EntryTarget | null => ALL_TARGETS.find((t) => encodeTarget(t) === value) ?? null;

export const targetLabel = (t: EntryTarget): string => {
  switch (t.kind) {
    case 'income':
      return INCOME_LABELS[t.category];
    case 'savings':
      return SAVINGS_LABELS[t.category];
    case 'debt':
      return 'Debt Payment';
    case 'fixed':
      return EXPENSE_LABELS[t.category];
  }
};

export const TARGET_GROUPS = (['income', 'savings', 'debt', 'fixed'] as const).map((kind) => ({
  kind,
  label: KIND_LABELS[kind],
  targets: ALL_TARGETS.filter((t) => t.kind === kind),
}));
