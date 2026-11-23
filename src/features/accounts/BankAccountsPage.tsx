import { useState } from 'react';
import { CreditCard, Landmark, Lock, Pencil, PiggyBank, Plus, Trash2, Wallet, Building2 } from 'lucide-react';
import type { AccountType, BankAccount } from '@/types/finance';
import { PageHeader } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Money } from '@/components/ui/Money';
import { toast } from '@/components/ui/toast';
import { accountTotals, ACCOUNT_TYPE_LABELS } from '@/lib/accounts';
import { maskLast4 } from '@/lib/security';
import { useFinanceStore } from '@/store/useFinanceStore';
import { AccountFormModal } from './AccountFormModal';

const TYPE_ICON: Record<AccountType, typeof Landmark> = { savings: PiggyBank, current: Building2, credit: CreditCard, wallet: Wallet };

const AccountCard = ({ account, onEdit, onDelete }: { account: BankAccount; onEdit: () => void; onDelete: () => void }) => {
  const Icon = TYPE_ICON[account.type];
  return (
    <Card className="group flex flex-col p-4 transition-[border-color,box-shadow] duration-150 hover:border-zinc-300 hover:shadow-sm sm:p-5 dark:hover:border-ink-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-ink-800 dark:text-zinc-300">
            <Icon className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold tracking-tight">{account.name}</p>
            <p className="truncate text-xs text-zinc-500">{account.institution || 'No institution'}{account.branch ? ` · ${account.branch}` : ''}</p>
          </div>
        </div>
        <div className="flex opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <IconButton label={`Edit ${account.name}`} onClick={onEdit} className="size-8"><Pencil className="size-3.5" /></IconButton>
          <IconButton label={`Delete ${account.name}`} tone="danger" onClick={onDelete} className="size-8"><Trash2 className="size-3.5" /></IconButton>
        </div>
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Current balance</p>
          <Money value={account.currentBalance} signed={account.currentBalance < 0} tone={account.currentBalance < 0 ? 'negative' : 'none'} className="text-xl font-semibold tracking-tight" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge>{ACCOUNT_TYPE_LABELS[account.type]}</Badge>
          <span className="font-mono text-xs text-zinc-500 tabular">{maskLast4(account.cardLast4)}</span>
        </div>
      </div>
      {account.notes && <p className="mt-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-ink-800">{account.notes}</p>}
    </Card>
  );
};

export const BankAccountsPage = () => {
  const accounts = useFinanceStore((s) => s.data.bankAccounts);
  const setBankAccounts = useFinanceStore((s) => s.setBankAccounts);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [open, setOpen] = useState(false);
  const totals = accountTotals(accounts);

  const save = (account: BankAccount): void => {
    setBankAccounts((list) => (list.some((a) => a.id === account.id) ? list.map((a) => (a.id === account.id ? account : a)) : [...list, account]));
    toast.success(editing ? 'Account updated' : 'Account added');
  };

  const remove = (account: BankAccount): void => {
    const index = accounts.findIndex((a) => a.id === account.id);
    setBankAccounts((list) => list.filter((a) => a.id !== account.id));
    toast.success(`Deleted “${account.name}”`, {
      label: 'Undo',
      run: () => setBankAccounts((list) => [...list.slice(0, index), account, ...list.slice(index)]),
    });
  };

  const openNew = (): void => {
    setEditing(null);
    setOpen(true);
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Bank accounts"
        subtitle="Balances at a glance. No passwords, PINs or security hints, by design."
        actions={<Button variant="primary" icon={<Plus className="size-4" />} onClick={openNew}>Add account</Button>}
      />

      {accounts.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Assets', value: totals.assets, tone: 'none' as const },
            { label: 'Owed', value: totals.liabilities, tone: totals.liabilities < 0 ? ('negative' as const) : ('muted' as const) },
            { label: 'Net position', value: totals.net, tone: 'auto' as const },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <p className="text-xs font-medium text-zinc-500">{s.label}</p>
              <Money value={s.value} tone={s.tone} signed={s.value < 0} className="mt-1 block text-base font-semibold tracking-tight sm:text-xl" />
            </Card>
          ))}
        </div>
      )}

      {accounts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Landmark className="size-4" />}
            title="No accounts yet"
            description="Add your savings, current, credit card and wallet accounts to see your net position."
            action={<Button variant="primary" size="sm" icon={<Plus className="size-3.5" />} onClick={openNew}>Add your first account</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} onEdit={() => { setEditing(account); setOpen(true); }} onDelete={() => remove(account)} />
          ))}
        </div>
      )}

      <div className="mt-6 flex gap-3 rounded-[var(--radius-card)] border border-dashed border-zinc-300 p-4 text-xs leading-relaxed text-zinc-600 dark:border-ink-700 dark:text-zinc-400">
        <Lock className="mt-0.5 size-4 shrink-0 text-accent-500" />
        <p>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">Why there’s no “login note” or “security hint” field.</span> The paper planner asks for them, but writing
          down credentials, even as hints, is the most common way accounts get compromised. A finance app that collects them becomes a target. This app stores card references as the
          last 4 digits only and warns you if a note looks like a password or PIN. Use a password manager for credentials.
        </p>
      </div>

      <AccountFormModal open={open} onClose={() => setOpen(false)} account={editing} onSave={save} />
    </div>
  );
};
