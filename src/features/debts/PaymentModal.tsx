import { useEffect, useState, type FormEvent } from 'react';
import type { DebtAccount, DebtEntry, ISODate } from '@/types/finance';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { isISODate, todayISO } from '@/lib/dates';
import { parseMoney, toInputString } from '@/lib/money';
import { newId } from '@/lib/factories';

type Props = { open: boolean; onClose: () => void; debt: DebtAccount; payment: DebtEntry | null; onSave: (entry: DebtEntry) => void };

/** Logging a payment here writes a Debt Payment row into that month's monthly tracker (single source of truth). */
export const PaymentModal = ({ open, onClose, debt, payment, onSave }: Props) => {
  const [date, setDate] = useState<ISODate>(todayISO());
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDate(payment?.date ?? todayISO());
    setAmount(payment ? toInputString(payment.amount) : toInputString(debt.minimumPayment));
    setNotes(payment?.notes ?? '');
    setError(null);
  }, [open, payment, debt.minimumPayment]);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const value = parseMoney(amount);
    if (value === null || value <= 0) return setError('Enter the amount you paid.');
    if (!isISODate(date)) return setError('Pick a valid date.');
    onSave({
      id: payment?.id ?? newId(),
      kind: 'debt',
      category: 'debt',
      debtId: debt.id,
      date,
      amount: value,
      description: payment?.description ?? debt.creditor,
      notes: notes.trim(),
      cleared: true,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={payment ? 'Edit payment' : `Log payment: ${debt.creditor}`}
      description="Also appears in that month’s Debt Payments table."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="payment-form">{payment ? 'Save' : 'Log payment'}</Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={submit} className="grid grid-cols-2 gap-3.5">
        <Field label="Date">{(id) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
        <Field label="Amount paid">{(id) => <Input id={id} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="tabular" />}</Field>
        <Field label="Notes" className="col-span-2">{(id) => <Input id={id} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Paid extra from bonus" maxLength={120} />}</Field>
        {error && <p className="col-span-2 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
};
