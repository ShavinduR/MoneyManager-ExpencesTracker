import { useEffect, useState, type FormEvent } from 'react';
import type { EntryKind, ISODate, MonthKey, MonthlyEntry } from '@/types/finance';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { CheckCircle } from '@/components/ui/CheckCircle';
import { expenseCategoryOptions, incomeCategoryOptions, isExpenseCategory, isIncomeCategory, isSavingsCategory, KIND_LABELS, savingsCategoryOptions } from '@/lib/categories';
import { parseMoney, toInputString } from '@/lib/money';
import { dateInMonth, isISODate, monthKeyOf, todayISO } from '@/lib/dates';
import { newId } from '@/lib/factories';
import { assertNever } from '@/lib/assertNever';
import { useFinanceStore } from '@/store/useFinanceStore';

type EntryFormModalProps = {
  open: boolean;
  onClose: () => void;
  kind: EntryKind;
  month: MonthKey;
  entry: MonthlyEntry | null;
  onSave: (entry: MonthlyEntry) => void;
};

type FormState = {
  date: ISODate;
  description: string;
  category: string;
  amount: string;
  cleared: boolean;
  debtId: string;
  notes: string;
};

const DEFAULT_CATEGORY: Record<EntryKind, string> = { income: 'salary', savings: 'emergency-fund', debt: 'debt', fixed: 'other' };

const SOURCE_LABEL: Record<EntryKind, string> = { income: 'Source', savings: 'Source / account', debt: 'Description', fixed: 'Description' };
const PLACEHOLDER: Record<EntryKind, string> = {
  income: 'e.g. Salary — Monthly',
  savings: 'e.g. Emergency fund',
  debt: 'e.g. Personal loan installment',
  fixed: 'e.g. House rent',
};

const initialState = (kind: EntryKind, month: MonthKey, entry: MonthlyEntry | null): FormState => {
  const today = todayISO();
  return {
    date: entry?.date ?? (monthKeyOf(today) === month ? today : dateInMonth(month, 1)),
    description: entry?.description ?? '',
    category: entry?.category ?? DEFAULT_CATEGORY[kind],
    amount: entry ? toInputString(entry.amount) : '',
    cleared: entry?.cleared ?? kind === 'income',
    debtId: entry?.kind === 'debt' ? (entry.debtId ?? '') : '',
    notes: entry?.kind === 'debt' ? entry.notes : '',
  };
};

const buildEntry = (kind: EntryKind, id: string, form: FormState, amount: NonNullable<ReturnType<typeof parseMoney>>): MonthlyEntry | null => {
  const base = { id, date: form.date, description: form.description.trim(), amount, cleared: form.cleared };
  switch (kind) {
    case 'income':
      return isIncomeCategory(form.category) ? { ...base, kind, category: form.category } : null;
    case 'savings':
      return isSavingsCategory(form.category) ? { ...base, kind, category: form.category } : null;
    case 'debt':
      return { ...base, kind, category: 'debt', debtId: form.debtId || null, notes: form.notes.trim() };
    case 'fixed':
      return isExpenseCategory(form.category) ? { ...base, kind, category: form.category } : null;
    default:
      return assertNever(kind);
  }
};

export const EntryFormModal = ({ open, onClose, kind, month, entry, onSave }: EntryFormModalProps) => {
  const [form, setForm] = useState<FormState>(() => initialState(kind, month, entry));
  const [error, setError] = useState<string | null>(null);
  const debts = useFinanceStore((s) => s.data.debts);

  useEffect(() => {
    if (open) {
      setForm(initialState(kind, month, entry));
      setError(null);
    }
  }, [open, kind, month, entry]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void => setForm((f) => ({ ...f, [key]: value }));

  const categoryOptions = kind === 'income' ? incomeCategoryOptions : kind === 'savings' ? savingsCategoryOptions : expenseCategoryOptions;

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const amount = parseMoney(form.amount);
    if (!form.description.trim() && !(kind === 'debt' && form.debtId)) return setError('Add a description.');
    if (amount === null || amount <= 0) return setError('Enter an amount greater than zero and up to 1 trillion, e.g. 1500 or 1.5k.');
    if (!isISODate(form.date)) return setError('Pick a valid date.');
    const creditor = debts.find((d) => d.id === form.debtId)?.creditor;
    const withDescription = !form.description.trim() && creditor ? { ...form, description: creditor } : form;
    const built = buildEntry(kind, entry?.id ?? newId(), withDescription, amount);
    if (!built) return setError('Choose a category.');
    onSave(built);
    onClose();
  };

  const inMonth = monthKeyOf(form.date) === month;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${entry ? 'Edit' : 'Add'} ${KIND_LABELS[kind].toLowerCase()}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="entry-form">
            {entry ? 'Save changes' : 'Add entry'}
          </Button>
        </>
      }
    >
      <form id="entry-form" onSubmit={submit} className="grid grid-cols-2 gap-3.5">
        <Field label={SOURCE_LABEL[kind]} className="col-span-2">
          {(id) => <Input id={id} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder={PLACEHOLDER[kind]} maxLength={80} />}
        </Field>
        <Field label="Amount" hint="Accepts 1500, 1,500, 1.5k or 2 lakh">
          {(id) => <Input id={id} value={form.amount} onChange={(e) => set('amount', e.target.value)} inputMode="decimal" placeholder="0" className="tabular" />}
        </Field>
        <Field label="Date" hint={inMonth ? undefined : 'This date is in another month. The entry will move there.'}>
          {(id) => <Input id={id} type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />}
        </Field>
        {kind === 'debt' ? (
          <Field label="Debt account" className="col-span-2" hint={debts.length ? 'Linking adds this to the debt’s payment history' : 'Add debt accounts on the Debts page to link payments'}>
            {(id) => (
              <Select id={id} value={form.debtId} onChange={(e) => set('debtId', e.target.value)}>
                <option value="">Not linked</option>
                {debts.filter((d) => !d.archived || d.id === form.debtId).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.creditor}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : (
          <Field label="Category" className="col-span-2">
            {(id) => (
              <Select id={id} value={form.category} onChange={(e) => set('category', e.target.value)}>
                {categoryOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {kind === 'debt' && (
          <Field label="Notes" className="col-span-2">
            {(id) => <Input id={id} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" maxLength={120} />}
          </Field>
        )}
        <label className="col-span-2 flex cursor-pointer items-center gap-3 rounded-xl bg-zinc-50 px-3 py-2.5 text-sm dark:bg-ink-850">
          <CheckCircle checked={form.cleared} onChange={() => set('cleared', !form.cleared)} label={kind === 'income' ? 'Received' : 'Paid / cleared'} />
          <span>{kind === 'income' ? 'Received' : kind === 'savings' ? 'Transferred' : 'Paid / cleared'}</span>
        </label>
        {error && <p className="col-span-2 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
};
