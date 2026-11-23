import { useEffect, useState, type FormEvent } from 'react';
import type { DebtAccount } from '@/types/finance';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { parseMoney, toInputString } from '@/lib/money';
import { isISODate, todayISO } from '@/lib/dates';
import { toLast4 } from '@/lib/security';
import { newId } from '@/lib/factories';

type Props = { open: boolean; onClose: () => void; debt: DebtAccount | null; onSave: (debt: DebtAccount) => void };

type FormState = {
  creditor: string;
  accountRef: string;
  apr: string;
  startingBalance: string;
  startDate: string;
  minimumPayment: string;
  goalPayoffDate: string;
  motivation: string;
};

const initial = (debt: DebtAccount | null): FormState => ({
  creditor: debt?.creditor ?? '',
  accountRef: debt?.accountRef ?? '',
  apr: debt ? String(debt.interestRateApr) : '',
  startingBalance: debt ? toInputString(debt.startingBalance) : '',
  startDate: debt?.startDate ?? todayISO(),
  minimumPayment: debt ? toInputString(debt.minimumPayment) : '',
  goalPayoffDate: debt?.goalPayoffDate ?? '',
  motivation: debt?.motivation ?? '',
});

export const DebtFormModal = ({ open, onClose, debt, onSave }: Props) => {
  const [form, setForm] = useState<FormState>(() => initial(debt));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initial(debt));
      setError(null);
    }
  }, [open, debt]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void => setForm((f) => ({ ...f, [key]: value }));

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const apr = form.apr.trim() === '' ? 0 : Number(form.apr.replace('%', ''));
    const startingBalance = parseMoney(form.startingBalance);
    const minimumPayment = parseMoney(form.minimumPayment || '0');
    if (!form.creditor.trim()) return setError('Who do you owe? Add the creditor.');
    if (!Number.isFinite(apr) || apr < 0 || apr > 100) return setError('Interest rate must be between 0 and 100%. Use 0 for interest-free.');
    if (startingBalance === null || startingBalance <= 0) return setError('Enter the starting balance.');
    if (minimumPayment === null) return setError('Minimum payment must be a number.');
    if (!isISODate(form.startDate)) return setError('Pick a valid start date.');
    if (form.goalPayoffDate && !isISODate(form.goalPayoffDate)) return setError('Pick a valid goal date.');
    onSave({
      id: debt?.id ?? newId(),
      creditor: form.creditor.trim(),
      accountRef: form.accountRef || null,
      interestRateApr: Math.round(apr * 100) / 100,
      startingBalance,
      startDate: form.startDate,
      minimumPayment,
      goalPayoffDate: form.goalPayoffDate || null,
      motivation: form.motivation.trim(),
      archived: debt?.archived ?? false,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={debt ? 'Edit debt' : 'Add debt account'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="debt-form">{debt ? 'Save changes' : 'Add debt'}</Button>
        </>
      }
    >
      <form id="debt-form" onSubmit={submit} className="grid grid-cols-2 gap-3.5">
        <Field label="Creditor" className="col-span-2" hint="Used by quick-add: “hnb 25000” links to a creditor named HNB…">
          {(id) => <Input id={id} value={form.creditor} onChange={(e) => set('creditor', e.target.value)} placeholder="e.g. HNB Personal Loan" maxLength={60} />}
        </Field>
        <Field label="Account # (last 4)">
          {(id) => <Input id={id} value={form.accountRef} onChange={(e) => set('accountRef', toLast4(e.target.value))} inputMode="numeric" placeholder="4821" className="tabular tracking-widest" autoComplete="off" />}
        </Field>
        <Field label="Interest rate (APR %)" hint="0 for interest-free">
          {(id) => <Input id={id} value={form.apr} onChange={(e) => set('apr', e.target.value)} inputMode="decimal" placeholder="14.5" className="tabular" />}
        </Field>
        <Field label="Starting balance">
          {(id) => <Input id={id} value={form.startingBalance} onChange={(e) => set('startingBalance', e.target.value)} inputMode="decimal" placeholder="1200000" className="tabular" />}
        </Field>
        <Field label="Minimum payment">
          {(id) => <Input id={id} value={form.minimumPayment} onChange={(e) => set('minimumPayment', e.target.value)} inputMode="decimal" placeholder="28500" className="tabular" />}
        </Field>
        <Field label="Start date">
          {(id) => <Input id={id} type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />}
        </Field>
        <Field label="Goal payoff date">
          {(id) => <Input id={id} type="date" value={form.goalPayoffDate} onChange={(e) => set('goalPayoffDate', e.target.value)} />}
        </Field>
        <Field label="Why I’m doing this…" className="col-span-2">
          {(id) => <Textarea id={id} value={form.motivation} onChange={(e) => set('motivation', e.target.value)} placeholder="Your reason, shown as a banner every time you open this debt." className="min-h-20" maxLength={280} />}
        </Field>
        {error && <p className="col-span-2 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
};
