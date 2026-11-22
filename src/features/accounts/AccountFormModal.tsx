import { useEffect, useState, type FormEvent } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import type { AccountType, BankAccount } from '@/types/finance';
import { ACCOUNT_TYPES } from '@/types/finance';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { ACCOUNT_TYPE_LABELS, isAccountType } from '@/lib/accounts';
import { parseSignedMoney, toInputString } from '@/lib/money';
import { looksLikeSecret, toLast4 } from '@/lib/security';
import { newId } from '@/lib/factories';

type Props = { open: boolean; onClose: () => void; account: BankAccount | null; onSave: (account: BankAccount) => void };

type FormState = { name: string; institution: string; type: AccountType; branch: string; cardLast4: string; balance: string; notes: string };

const initial = (account: BankAccount | null): FormState => ({
  name: account?.name ?? '',
  institution: account?.institution ?? '',
  type: account?.type ?? 'savings',
  branch: account?.branch ?? '',
  cardLast4: account?.cardLast4 ?? '',
  balance: account ? toInputString(account.currentBalance) : '',
  notes: account?.notes ?? '',
});

/**
 * Deliberately has no password / login note / security hint / access-code fields.
 * Free text is screened so credentials don't slip into "Notes" either.
 */
export const AccountFormModal = ({ open, onClose, account, onSave }: Props) => {
  const [form, setForm] = useState<FormState>(() => initial(account));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initial(account));
      setError(null);
    }
  }, [open, account]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void => setForm((f) => ({ ...f, [key]: value }));
  const secretWarning = looksLikeSecret(`${form.notes} ${form.name} ${form.branch}`);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const balance = parseSignedMoney(form.balance || '0');
    if (!form.name.trim()) return setError('Give the account a name, e.g. “Salary account”.');
    if (balance === null) return setError('Balance must be a number. Use “-” for money owed, e.g. -65000.');
    if (form.cardLast4 && !/^\d{4}$/.test(form.cardLast4)) return setError('Card reference must be exactly the last 4 digits.');
    if (secretWarning) return setError('This looks like a password, PIN or full card number. Remove it. This app never stores credentials.');
    onSave({
      id: account?.id ?? newId(),
      name: form.name.trim(),
      institution: form.institution.trim(),
      type: form.type,
      branch: form.branch.trim(),
      cardLast4: form.cardLast4 || null,
      currentBalance: balance,
      notes: form.notes.trim(),
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={account ? 'Edit account' : 'Add account'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="account-form">{account ? 'Save changes' : 'Add account'}</Button>
        </>
      }
    >
      <form id="account-form" onSubmit={submit} className="grid grid-cols-2 gap-3.5">
        <Field label="Account name" className="col-span-2">
          {(id) => <Input id={id} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Salary account" maxLength={60} />}
        </Field>
        <Field label="Bank / institution">
          {(id) => <Input id={id} value={form.institution} onChange={(e) => set('institution', e.target.value)} placeholder="e.g. Commercial Bank" maxLength={60} />}
        </Field>
        <Field label="Account type">
          {(id) => (
            <Select id={id} value={form.type} onChange={(e) => isAccountType(e.target.value) && set('type', e.target.value)}>
              {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Branch info">
          {(id) => <Input id={id} value={form.branch} onChange={(e) => set('branch', e.target.value)} placeholder="Optional" maxLength={60} />}
        </Field>
        <Field label="Card ref (last 4 only)" hint="Paste a full number and we keep only the last 4">
          {(id) => (
            <Input id={id} value={form.cardLast4} onChange={(e) => set('cardLast4', toLast4(e.target.value))} inputMode="numeric" placeholder="1234" className="tabular tracking-widest" autoComplete="off" />
          )}
        </Field>
        <Field label="Current balance" className="col-span-2" hint="Use a minus sign for money owed, e.g. -65000 on a credit card">
          {(id) => <Input id={id} value={form.balance} onChange={(e) => set('balance', e.target.value)} inputMode="decimal" placeholder="0" className="tabular" />}
        </Field>
        <Field label="Notes" className="col-span-2">
          {(id) => <Input id={id} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. Salary credited on the 25th" maxLength={140} autoComplete="off" />}
        </Field>
        <div className={secretWarning ? 'col-span-2 flex gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300' : 'col-span-2 flex gap-2.5 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'}>
          {secretWarning ? <ShieldAlert className="size-4 shrink-0" /> : <ShieldCheck className="size-4 shrink-0" />}
          <p>
            {secretWarning
              ? 'That looks like a password, PIN, login or full card number. Please remove it.'
              : 'Security by design: this app has no fields for passwords, login notes, security hints or access codes. Keep those in a password manager.'}
          </p>
        </div>
        {error && <p className="col-span-2 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
};
