import { useRef, useState, type FormEvent } from 'react';
import { Database, Download, KeyRound, RotateCcw, Upload, User } from 'lucide-react';
import { CURRENCY_CODES, THEME_PREFERENCES, type CurrencyCode, type ThemePreference } from '@/types/finance';
import { useFinanceStore } from '@/store/useFinanceStore';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { toast } from '@/components/ui/toast';
import { parseMoney, toInputString } from '@/lib/money';
import { getGeminiKey, setGeminiKey } from '@/lib/localPrefs';
import { downloadBackup, readBackupFile } from '@/data/backup';

const isCurrency = (v: string): v is CurrencyCode => CURRENCY_CODES.some((c) => c === v);

export const SettingsPage = () => {
  const profile = useFinanceStore((s) => s.data.profile);
  const data = useFinanceStore((s) => s.data);
  const updateProfile = useFinanceStore((s) => s.updateProfile);
  const loadDemo = useFinanceStore((s) => s.loadDemo);
  const resetAll = useFinanceStore((s) => s.resetAll);
  const replaceAll = useFinanceStore((s) => s.replaceAll);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [initial, setInitial] = useState(toInputString(profile.initialBalance));
  const [apiKey, setApiKey] = useState(getGeminiKey() ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  const saveProfile = (event: FormEvent): void => {
    event.preventDefault();
    const initialBalance = parseMoney(initial || '0');
    if (initialBalance === null) return toast.error('Starting balance must be a number');
    updateProfile({ name: name.trim(), email: email.trim(), initialBalance });
    toast.success('Profile saved');
  };

  const onImport = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    const result = await readBackupFile(file);
    if (!result.ok) return toast.error(result.error);
    if (!window.confirm('Replace ALL current data with this backup?')) return;
    await replaceAll(result.data);
    toast.success('Backup imported');
  };

  return (
    <div className="animate-fade-up space-y-4">
      <PageHeader title="Profile & settings" subtitle="Everything is stored locally on this device." />

      <Card>
        <CardHeader title="Profile" icon={<User className="size-4" />} />
        <form onSubmit={saveProfile} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <Field label="Name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          <Field label="Email">{(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Field label="Currency">
            {(id) => (
              <Select id={id} value={profile.currency} onChange={(e) => isCurrency(e.target.value) && updateProfile({ currency: e.target.value })}>
                {CURRENCY_CODES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Starting balance" hint="Opening balance of your first tracked month">
            {(id) => <Input id={id} value={initial} onChange={(e) => setInitial(e.target.value)} inputMode="decimal" className="tabular" />}
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Theme</span>
            <Segmented<ThemePreference>
              label="Theme"
              value={profile.theme}
              onChange={(theme) => updateProfile({ theme })}
              options={THEME_PREFERENCES.map((t) => ({ value: t, label: t[0]?.toUpperCase() + t.slice(1) }))}
            />
          </div>
          <div className="flex items-end justify-end sm:col-span-2">
            <Button variant="primary" type="submit">Save profile</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="AI quick-entry (optional)" subtitle="Gemini parses free-form text when the offline parser isn’t sure" icon={<KeyRound className="size-4" />} />
        <div className="space-y-3 p-4 sm:p-5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={profile.llmEnabled} onChange={(e) => updateProfile({ llmEnabled: e.target.checked })} className="size-4 accent-emerald-500" />
            Enable AI parsing button
          </label>
          <Field label="Gemini API key" hint="Stored only in this browser and never included in backups. Text you parse with AI is sent to Google.">
            {(id) => (
              <div className="flex gap-2">
                <Input id={id} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AIza…" autoComplete="off" />
                <Button onClick={() => { setGeminiKey(apiKey); toast.success(apiKey ? 'Key saved on this device' : 'Key removed'); }}>Save</Button>
              </div>
            )}
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Data management" subtitle="Back up, restore or explore with sample data" icon={<Database className="size-4" />} />
        <div className="flex flex-wrap gap-2 p-4 sm:p-5">
          <Button icon={<Download className="size-4" />} onClick={() => downloadBackup(data)}>Export JSON</Button>
          <Button icon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()}>Import JSON</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void onImport(e.target.files?.[0]); e.target.value = ''; }} />
          <Button
            icon={<Database className="size-4" />}
            onClick={() => {
              if (window.confirm('Replace current data with sample data?')) void loadDemo().then(() => toast.success('Sample data loaded'));
            }}
          >
            Load sample data
          </Button>
          <Button
            variant="danger"
            icon={<RotateCcw className="size-4" />}
            onClick={() => {
              if (window.confirm('Delete ALL data on this device? Export a backup first if you need it.')) void resetAll().then(() => toast.success('All data cleared'));
            }}
          >
            Reset data
          </Button>
        </div>
      </Card>
    </div>
  );
};
