import { useEffect, useState, type FormEvent } from 'react';
import type { ISODate, MonthKey, OtherBill } from '@/types/finance';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { CheckCircle } from '@/components/ui/CheckCircle';
import { expenseCategoryOptions, isExpenseCategory } from '@/lib/categories';
import { parseMoney, toInputString, ZERO } from '@/lib/money';
import { dateInMonth, isISODate, monthKeyOf, todayISO } from '@/lib/dates';
import { newId } from '@/lib/factories';

type BillFormModalProps = {
  open: boolean;
  onClose: () => void;
  month: MonthKey;
  bill: OtherBill | null;
  onSave: (bill: OtherBill) => void;
};

type FormState = { name: string; dueDate: ISODate; category: string; amountDue: string; amountPaid: string; paid: boolean; notes: string };

const initialState = (month: MonthKey, bill: OtherBill | null): FormState => {
  const today = todayISO();
  return {
    name: bill?.name ?? '',
    dueDate: bill?.dueDate ?? (monthKeyOf(today) === month ? today : dateInMonth(month, 15)),
    category: bill?.category ?? 'other',
    amountDue: bill ? toInputString(bill.amountDue) : '',
    amountPaid: bill && bill.amountPaid > 0 ? toInputString(bill.amountPaid) : '',
    paid: bill?.paid ?? false,
    notes: bill?.notes ?? '',
  };
};

export const BillFormModal = ({ open, onClose, month, bill, onSave }: BillFormModalProps) => {
  const [form, setForm] = useState<FormState>(() => initialState(month, bill));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initialState(month, bill));
      setError(null);
    }
  }, [open, month, bill]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void => setForm((f) => ({ ...f, [key]: value }));

  const togglePaid = (): void =>
    setForm((f) => ({ ...f, paid: !f.paid, amountPaid: !f.paid && !f.amountPaid.trim() ? f.amountDue : f.amountPaid }));

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const amountDue = parseMoney(form.amountDue);
    const amountPaid = form.amountPaid.trim() ? parseMoney(form.amountPaid) : ZERO;
    if (!form.name.trim()) return setError('Give the bill a name.');
    if (amountDue === null) return setError('Enter the amount due, e.g. 4200.');
    if (amountPaid === null) return setError('Amount paid must be a number.');
    if (!isISODate(form.dueDate)) return setError('Pick a valid due date.');
    if (!isExpenseCategory(form.category)) return setError('Choose a category.');
    onSave({
      id: bill?.id ?? newId(),
      name: form.name.trim(),
      dueDate: form.dueDate,
      category: form.category,
      amountDue,
      amountPaid,
      paid: form.paid,
      notes: form.notes.trim(),
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={bill ? 'Edit bill' : 'Add bill or expense'}
      description="One-off and irregular bills: doctor, repairs, gifts, annual fees…"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="bill-form">{bill ? 'Save changes' : 'Add bill'}</Button>
        </>
      }
    >
      <form id="bill-form" onSubmit={submit} className="grid grid-cols-2 gap-3.5">
        <Field label="Bill" className="col-span-2">
          {(id) => <Input id={id} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Vehicle service" maxLength={80} />}
        </Field>
        <Field label="Due date">
          {(id) => <Input id={id} type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />}
        </Field>
        <Field label="Category">
          {(id) => (
            <Select id={id} value={form.category} onChange={(e) => set('category', e.target.value)}>
              {expenseCategoryOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Amount due">
          {(id) => <Input id={id} value={form.amountDue} onChange={(e) => set('amountDue', e.target.value)} inputMode="decimal" placeholder="0" className="tabular" />}
        </Field>
        <Field label="Amount paid" hint="Partial payments are fine">
          {(id) => <Input id={id} value={form.amountPaid} onChange={(e) => set('amountPaid', e.target.value)} inputMode="decimal" placeholder="0" className="tabular" />}
        </Field>
        <Field label="Notes" className="col-span-2">
          {(id) => <Input id={id} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" maxLength={140} />}
        </Field>
        <label className="col-span-2 flex cursor-pointer items-center gap-3 rounded-xl bg-zinc-50 px-3 py-2.5 text-sm dark:bg-ink-850">
          <CheckCircle checked={form.paid} onChange={togglePaid} label="Paid" />
          <span>Paid</span>
          <span className="ml-auto text-xs text-zinc-500">Only the amount paid counts toward expenses</span>
        </label>
        {error && <p className="col-span-2 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
};
