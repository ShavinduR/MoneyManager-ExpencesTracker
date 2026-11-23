import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CircleHelp, Compass, Database, Download, HardDrive, KeyRound, MonitorSmartphone, RotateCcw, ShieldCheck, Smartphone, Upload, User, WifiOff } from 'lucide-react';
import type { FinanceData, ThemePreference } from '@/types/finance';
import { CURRENCY_CODES, THEME_PREFERENCES } from '@/types/finance';
import { useFinanceStore } from '@/store/useFinanceStore';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, Input, Select } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { toast } from '@/components/ui/toast';
import { formatMoney, fromMajor, parseSignedMoney, toInputString } from '@/lib/money';
import { DEFAULT_GEMINI_MODEL, getGeminiKey, getGeminiModel, isValidModelId, setGeminiKey, setGeminiModel } from '@/lib/localPrefs';
import { formatBytes, getStorageInfo, requestPersistentStorage, type StorageInfo } from '@/lib/deviceStorage';
import { backupStats, downloadBackup, readBackupFile, type BackupStats } from '@/data/backup';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useUiStore } from '@/store/uiStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const isCurrency = (v: string): v is (typeof CURRENCY_CODES)[number] => CURRENCY_CODES.some((c) => c === v);

const THEME_LABELS: Record<ThemePreference, string> = { light: 'Light', dark: 'Dark', system: 'System' };

const StatsGrid = ({ stats }: { stats: BackupStats }) => (
  <dl className="grid grid-cols-3 gap-2 text-center">
    {(
      [
        ['Months', stats.months],
        ['Entries', stats.entries],
        ['Bills', stats.bills],
        ['Debts', stats.debts],
        ['Accounts', stats.accounts],
        ['Goals', stats.goals],
      ] as const
    ).map(([label, value]) => (
      <div key={label} className="rounded-xl bg-zinc-50 px-2 py-2.5 dark:bg-ink-850">
        <dd className="text-lg font-semibold tabular">{value}</dd>
        <dt className="text-[11px] text-muted">{label}</dt>
      </div>
    ))}
  </dl>
);

const ProfileCard = () => {
  const profile = useFinanceStore((s) => s.data.profile);
  const updateProfile = useFinanceStore((s) => s.updateProfile);
  const [form, setForm] = useState({
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    city: profile.city,
    country: profile.country,
    initial: toInputString(profile.initialBalance),
  });

  useEffect(() => {
    setForm({ name: profile.name, email: profile.email, phone: profile.phone, city: profile.city, country: profile.country, initial: toInputString(profile.initialBalance) });
  }, [profile.name, profile.email, profile.phone, profile.city, profile.country, profile.initialBalance]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = (event: FormEvent): void => {
    event.preventDefault();
    const initialBalance = parseSignedMoney(form.initial || '0');
    if (initialBalance === null) return toast.error('Starting balance must be a number up to 1 trillion');
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) return toast.error('That email doesn’t look right');
    updateProfile({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), city: form.city.trim(), country: form.country.trim(), initialBalance });
    toast.success('Profile saved');
  };

  return (
    <Card>
      <CardHeader title="Personal information" subtitle="Optional, and stays on this device" icon={<User className="size-4" />} />
      <form onSubmit={save} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <Field label="Name">{(id) => <Input id={id} value={form.name} onChange={set('name')} autoComplete="name" />}</Field>
        <Field label="Email">{(id) => <Input id={id} type="email" value={form.email} onChange={set('email')} autoComplete="email" />}</Field>
        <Field label="Phone">{(id) => <Input id={id} type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />}</Field>
        <Field label="City">{(id) => <Input id={id} value={form.city} onChange={set('city')} autoComplete="address-level2" />}</Field>
        <Field label="Country">{(id) => <Input id={id} value={form.country} onChange={set('country')} autoComplete="country-name" />}</Field>
        <div id="starting-balance">
          <Field label="Starting balance" hint="Opening balance of your first tracked month">
            {(id) => <Input id={id} value={form.initial} onChange={set('initial')} inputMode="decimal" className="tabular" />}
          </Field>
        </div>
        <div className="flex justify-end sm:col-span-2">
          <Button variant="primary" type="submit">Save profile</Button>
        </div>
      </form>
    </Card>
  );
};

const PreferencesCard = () => {
  const profile = useFinanceStore((s) => s.data.profile);
  const updateProfile = useFinanceStore((s) => s.updateProfile);
  return (
    <Card>
      <CardHeader title="Preferences" icon={<MonitorSmartphone className="size-4" />} />
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <Field label="Currency" hint={`Example: ${formatMoney(fromMajor(8500), profile.currency)}`}>
          {(id) => (
            <Select id={id} value={profile.currency} onChange={(e) => isCurrency(e.target.value) && updateProfile({ currency: e.target.value })}>
              {CURRENCY_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          )}
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Theme</span>
          <Segmented<ThemePreference> label="Theme" value={profile.theme} onChange={(theme) => updateProfile({ theme })} options={THEME_PREFERENCES.map((t) => ({ value: t, label: THEME_LABELS[t] }))} />
        </div>
      </div>
    </Card>
  );
};

const AiCard = () => {
  const llmEnabled = useFinanceStore((s) => s.data.profile.llmEnabled);
  const updateProfile = useFinanceStore((s) => s.updateProfile);
  const [apiKey, setApiKey] = useState(getGeminiKey() ?? '');
  const [model, setModel] = useState(getGeminiModel());
  return (
    <Card>
      <CardHeader title="AI quick-entry (optional)" subtitle="The offline parser always works; Gemini is an extra for free-form text" icon={<KeyRound className="size-4" />} />
      <div className="space-y-3 p-4 sm:p-5">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={llmEnabled} onChange={(e) => updateProfile({ llmEnabled: e.target.checked })} className="size-4 accent-emerald-500" />
          Show the AI button in quick-add
        </label>
        <Field label="Gemini API key" hint="Stored only in this browser and never included in backups. Text you parse with AI is sent to Google.">
          {(id) => (
            <div className="flex gap-2">
              <Input id={id} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AIza…" autoComplete="off" />
              <Button onClick={() => { setGeminiKey(apiKey); toast.success(apiKey.trim() ? 'Key saved on this device' : 'Key removed'); }}>Save</Button>
            </div>
          )}
        </Field>
        <Field label="Gemini model" hint={`Default ${DEFAULT_GEMINI_MODEL}. Change it if Google retires that model.`}>
          {(id) => (
            <div className="flex gap-2">
              <Input id={id} value={model} onChange={(e) => setModel(e.target.value)} placeholder={DEFAULT_GEMINI_MODEL} autoComplete="off" spellCheck={false} />
              <Button
                onClick={() => {
                  const next = model.trim() || DEFAULT_GEMINI_MODEL;
                  if (!isValidModelId(next)) return toast.error('Model ids look like “gemini-2.5-flash”.');
                  setGeminiModel(next);
                  setModel(next);
                  toast.success(`Using ${next}`);
                }}
              >
                Save
              </Button>
            </div>
          )}
        </Field>
      </div>
    </Card>
  );
};

type Pending = { kind: 'import'; data: FinanceData; exportedAt: string | null } | { kind: 'reset' } | null;

const DataCard = () => {
  const markProtected = useOnboardingStore((s) => s.update);
  const cardRef = useRef<HTMLDivElement>(null);
  // Seeing the backup & sync section (not just opening Settings) completes "Protect or sync your data".
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          markProtected({ protectVisited: true });
          observer.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [markProtected]);
  const data = useFinanceStore((s) => s.data);
  const resetAll = useFinanceStore((s) => s.resetAll);
  const replaceAll = useFinanceStore((s) => s.replaceAll);
  const openSync = useUiStore((s) => s.openSync);
  const [pending, setPending] = useState<Pending>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const current = backupStats(data);

  const onFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    const result = await readBackupFile(file);
    if (!result.ok) return toast.error(result.error);
    setPending({ kind: 'import', data: result.data, exportedAt: result.exportedAt });
  };

  return (
    <Card id="backup" ref={cardRef}>
      <CardHeader title="Data management" subtitle="Back up, sync to another device or restore" icon={<Database className="size-4" />} />
      <div className="space-y-4 p-4 sm:p-5">
        <StatsGrid stats={current} />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            icon={<Download className="size-4" />}
            onClick={() => {
              downloadBackup(data);
              markProtected({ protectVisited: true });
              toast.success('Backup downloaded');
            }}
          >
            Export JSON
          </Button>
          <Button icon={<Smartphone className="size-4" />} onClick={openSync} aria-haspopup="dialog">Sync devices</Button>
          <Button icon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()}>Import JSON</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
          <Button variant="danger" icon={<RotateCcw className="size-4" />} onClick={() => setPending({ kind: 'reset' })} className="sm:ml-auto">Reset data</Button>
        </div>
        <p className="flex gap-2 text-xs text-muted">
          <ShieldCheck className="size-4 shrink-0 text-accent-500" />
          Imports are validated before anything is replaced: unknown fields (like passwords on bank accounts), full card numbers and non-integer amounts are rejected.
        </p>
      </div>

      <ConfirmDialog
        open={pending?.kind === 'import'}
        title="Replace your data with this backup?"
        description={pending?.kind === 'import' && pending.exportedAt ? `Exported ${new Date(pending.exportedAt).toLocaleString()}` : undefined}
        confirmLabel="Replace & import"
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending?.kind !== 'import') return;
          void replaceAll(pending.data)
            .then(() => toast.success('Backup imported'))
            .catch(() => toast.error('Import failed. Your existing data was not changed.'));
        }}
      >
        {pending?.kind === 'import' && (
          <div className="space-y-3 text-sm">
            <StatsGrid stats={backupStats(pending.data)} />
            <p className="text-xs text-muted">Your current data ({current.months} months, {current.entries} entries) will be replaced. Export a backup first if you might need it.</p>
          </div>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={pending?.kind === 'reset'}
        title="Delete all data on this device?"
        description="This can’t be undone. Export a backup first if you might need it."
        confirmLabel="Delete everything"
        tone="danger"
        onClose={() => setPending(null)}
        onConfirm={() =>
          void resetAll()
            .then(() => toast.success('All data cleared'))
            .catch(() => toast.error('Reset failed. Your data is unchanged.'))
        }
      />
    </Card>
  );
};

const DeviceCard = () => {
  const [info, setInfo] = useState<StorageInfo>({ usageBytes: null, persisted: null });
  const { canInstall, installed, install } = useInstallPrompt();
  const online = useOnlineStatus();

  useEffect(() => {
    void getStorageInfo().then(setInfo);
  }, []);

  return (
    <Card>
      <CardHeader title="This device" subtitle="Local-first: works offline, nothing is sent to a server" icon={<HardDrive className="size-4" />} />
      <div className="space-y-3 p-4 text-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-zinc-600 dark:text-zinc-400">Connection</span>
          {online ? <Badge tone="green">Online</Badge> : <Badge tone="amber"><WifiOff className="size-3" /> Offline: everything still works</Badge>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-zinc-600 dark:text-zinc-400">Storage used</span>
          <span className="tabular">{info.usageBytes === null ? 'Unknown' : formatBytes(info.usageBytes)}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-zinc-600 dark:text-zinc-400">Protected from cleanup</span>
          {info.persisted ? (
            <Badge tone="green">Yes</Badge>
          ) : (
            <Button
              size="sm"
              onClick={() =>
                void requestPersistentStorage().then((granted) => {
                  setInfo((i) => ({ ...i, persisted: granted }));
                  if (granted) toast.success('Storage marked as persistent');
                  else toast.info('The browser declined. Installing the app usually helps.');
                })
              }
            >
              Keep my data
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-zinc-600 dark:text-zinc-400">App</span>
          {installed ? (
            <Badge tone="green">Installed</Badge>
          ) : canInstall ? (
            <Button size="sm" variant="primary" onClick={() => void install()}>Install app</Button>
          ) : (
            <span className="text-xs text-muted">Use your browser’s “Install” or “Add to Home Screen”</span>
          )}
        </div>
      </div>
    </Card>
  );
};

const HelpCard = () => {
  const openHelp = useUiStore((s) => s.openHelp);
  const startTour = useUiStore((s) => s.startTour);
  return (
    <Card>
      <CardHeader title="Help & guide" subtitle="How the monthly rhythm works, in English and සිංහල" icon={<CircleHelp className="size-4" />} />
      <div className="flex flex-wrap gap-2 p-4 sm:p-5">
        <Button icon={<CircleHelp className="size-4" />} onClick={openHelp} aria-haspopup="dialog">How it works</Button>
        <Button icon={<Compass className="size-4" />} onClick={startTour}>Take a 30s tour</Button>
      </div>
    </Card>
  );
};

const SettingsLayout = () => (
  <div className="animate-fade-up">
    <PageHeader title="Profile & settings" subtitle="Everything is stored locally on this device." />
    <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
      <div className="space-y-4">
        <ProfileCard />
        <PreferencesCard />
        <AiCard />
      </div>
      <div className="space-y-4">
        <DataCard />
        <DeviceCard />
        <HelpCard />
      </div>
    </div>
  </div>
);

export const SettingsPage = SettingsLayout;
