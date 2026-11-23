import { useEffect, useState, type FormEvent } from 'react';
import type { GoalStatus, YearlyGoal } from '@/types/finance';
import { GOAL_STATUSES } from '@/types/finance';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { parseMoney, toInputString, ZERO } from '@/lib/money';
import { GOAL_STATUS_LABELS, isGoalStatus } from '@/lib/goals';

type Props = { open: boolean; onClose: () => void; goal: YearlyGoal; year: number; onSave: (goal: YearlyGoal) => void };

export const GoalFormModal = ({ open, onClose, goal, year, onSave }: Props) => {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [status, setStatus] = useState<GoalStatus>('not-started');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(goal.title);
    setTarget(goal.targetAmount === null ? '' : toInputString(goal.targetAmount));
    setCurrent(goal.currentAmount > 0 ? toInputString(goal.currentAmount) : '');
    setStatus(goal.status);
    setNotes(goal.notes);
    setError(null);
  }, [open, goal]);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const targetAmount = target.trim() ? parseMoney(target) : null;
    const currentAmount = current.trim() ? parseMoney(current) : ZERO;
    if (target.trim() && targetAmount === null) return setError('Target must be a number up to 1 trillion, or leave it empty.');
    if (currentAmount === null) return setError('Progress must be a number up to 1 trillion.');
    const reachedTarget = targetAmount !== null && targetAmount > 0 && currentAmount >= targetAmount;
    onSave({
      ...goal,
      title: title.trim(),
      targetAmount,
      currentAmount,
      status: reachedTarget && status === 'in-progress' ? 'achieved' : title.trim() && status === 'not-started' && currentAmount > 0 ? 'in-progress' : status,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Goal ${goal.slot} · ${year}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="goal-form">Save goal</Button>
        </>
      }
    >
      <form id="goal-form" onSubmit={submit} className="grid grid-cols-2 gap-3.5">
        <Field label="Goal" className="col-span-2">
          {(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Build a Rs. 300,000 emergency fund" maxLength={100} />}
        </Field>
        <Field label="Target amount" hint="Optional: leave empty for non-money goals">
          {(id) => <Input id={id} value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" placeholder="300000" className="tabular" />}
        </Field>
        <Field label="Progress so far">
          {(id) => <Input id={id} value={current} onChange={(e) => setCurrent(e.target.value)} inputMode="decimal" placeholder="0" className="tabular" />}
        </Field>
        <Field label="Status" className="col-span-2">
          {(id) => (
            <Select id={id} value={status} onChange={(e) => isGoalStatus(e.target.value) && setStatus(e.target.value)}>
              {GOAL_STATUSES.map((s) => <option key={s} value={s}>{GOAL_STATUS_LABELS[s]}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Notes" className="col-span-2">
          {(id) => <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Steps, milestones, why it matters…" className="min-h-20" maxLength={400} />}
        </Field>
        {error && <p className="col-span-2 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
};
