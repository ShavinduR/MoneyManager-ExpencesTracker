# Phase 0: Architecture & Data Model Proposal

Status: **approved** (all four defaults in section 8 accepted). All phases (0–4) complete. See README.md for the shipped architecture.

The product: a local-first PWA that turns a paper 4-year finance planner into an app. One month is the unit of work: you open a month, log money in and out, and the app does the arithmetic, carries the balance into next month, and rolls everything up into yearly analytics.

---

## 1. Stack decisions

| Concern | Choice | Why |
|---|---|---|
| Build | Vite + React 18 + TypeScript (strict, `noUncheckedIndexedAccess`) | As specified |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`), `class`-based dark mode | Zero-config, fast |
| Icons / charts | `lucide-react`, `recharts` | As specified |
| Routing | `react-router-dom` v6 (hash-free, Vercel SPA rewrite) | Deep links per month: `/monthly/2026-11` |
| State | `zustand` store per domain slice, hydrated from the repository | Tiny, no provider pyramid, easy selectors |
| Persistence | IndexedDB via `idb` (≈1 kB), behind a `FinanceRepository` interface; localStorage fallback | Async API today = drop-in REST adapter later |
| Validation | `zod` at the two trust boundaries: JSON import and LLM output | Types derived from schemas, no `as` casts |
| Dates | `date-fns` | Tree-shakable, no timezone surprises with `YYYY-MM-DD` strings |
| PWA | `vite-plugin-pwa` (`generateSW`, `autoUpdate`) | Precache app shell, works offline |
| Tests | `vitest` for pure logic (calculations, parser, simulator, carry-over) | The math is where bugs hurt |

## 2. Money handling (floating-point safety)

All amounts are stored as **integer minor units** (cents / cents of a rupee) using a branded type:

```ts
type Cents = number & { readonly __brand: 'Cents' };
```

- Parsing (`"1,500.50"` → `150050`) and formatting (`150050` → `Rs. 1,500.50`) happen only in `lib/money.ts`.
- Sums are integer additions, so `0.1 + 0.2` never appears.
- Interest in the debt simulator is computed in floats per month and **rounded to cents each period** (`Math.round`), matching how lenders post interest.
- Formatting uses `Intl.NumberFormat` with the profile currency. LKR renders as `Rs. 1,500.00` (custom prefix, since `Intl` gives `LKR`).

## 3. Folder structure

```
src/
  main.tsx                    # mount, router, PWA registration
  App.tsx                     # routes + AppShell
  types/
    finance.ts                # domain types (section 4)
  lib/                        # pure, framework-free, unit-tested
    money.ts                  # Cents brand, parse/format, sum
    dates.ts                  # MonthKey helpers, prev/next month, due-date status
    calculations/
      monthSummary.ts         # totals, net, balance forward, biggest/smallest category
      carryOver.ts            # opening balance resolution across months
      yearSummary.ts          # 12-month aggregation, H1/H2 ranges, category matrix
      debt.ts                 # remaining balance, payment history derivation
      payoffSimulator.ts      # amortization, baseline vs extra payment
    quickEntry/
      parser.ts               # deterministic regex + keyword parser
      lexicon.ts              # EN + Sinhala/Singlish keyword → category/type map
      llmParser.ts            # optional Gemini hook, zod-validated output
    demoData.ts               # 6 months of realistic LKR data
  data/
    repository.ts             # FinanceRepository interface
    indexedDbRepository.ts    # default implementation
    localStorageRepository.ts # fallback when IndexedDB is unavailable
    schema.ts                 # zod schemas mirroring types/finance.ts + migrations
    backup.ts                 # export/import JSON (versioned envelope)
  store/
    useFinanceStore.ts        # zustand store: hydrate, mutate, persist via repository
    selectors.ts              # memoized derived data (month summary, year summary)
  components/
    ui/                       # Button, Card, Input, Select, Toggle, Badge, Modal, EmptyState, Stat, ProgressBar
    layout/                   # AppShell, Sidebar, BottomNav, TopBar, MonthPicker
    quick-entry/              # QuickEntryBar, ConfirmationPill
    charts/                   # IncomeExpenseBar, SavingsTrendLine, CategoryDonut, DebtBalanceLine
  features/
    dashboard/                # DashboardPage (overview of current month + mini charts)
    monthly/                  # MonthlyPage, GoalsList, TransactionTable, OtherBillsTable, OverviewCard, ReflectionPanel
    debts/                    # DebtsPage, DebtDetail, PaymentLog, PayoffSimulator
    goals/                    # YearlyGoalsPage, GoalCard
    summary/                  # YearSummaryPage, MonthlyMatrix, CategoryMatrix
    accounts/                 # BankAccountsPage, AccountForm
    settings/                 # SettingsPage, ProfileForm, DataManagement
  hooks/                      # useTheme, useCurrencyFormatter, useMonthParam, useOnlineStatus
  styles/index.css
tests live next to code: lib/**/*.test.ts
```

## 4. Data model (`src/types/finance.ts`, draft)

```ts
export type Cents = number & { readonly __brand: 'Cents' };
export type MonthKey = `${number}-${string}`;   // "2026-11", validated by helper
export type ISODate = string;                    // "2026-11-22"
export type Id = string;                         // crypto.randomUUID()

export type CurrencyCode = 'LKR' | 'USD' | 'EUR' | 'GBP' | 'INR' | 'AUD';
export type ThemePreference = 'light' | 'dark' | 'system';

// ---------- Monthly workspace ----------
export type EntryKind = 'income' | 'savings' | 'debt' | 'fixed';

export type ExpenseCategory =
  | 'housing' | 'utilities' | 'groceries' | 'food' | 'transport' | 'fuel'
  | 'health' | 'education' | 'insurance' | 'subscriptions' | 'phone-internet'
  | 'shopping' | 'entertainment' | 'family' | 'gifts-donations' | 'personal-care'
  | 'debt' | 'other';

export type IncomeCategory = 'salary' | 'freelance' | 'business' | 'interest' | 'gift' | 'other-income';
export type SavingsCategory = 'emergency-fund' | 'fixed-deposit' | 'investment' | 'goal-fund' | 'other-savings';

type EntryBase = {
  id: Id;
  date: ISODate;
  description: string;         // "Source" for income, "Description" otherwise
  amount: Cents;
  cleared: boolean;            // Paid / Cleared / Received toggle
};

// Discriminated union: category type follows the kind; debt entries may link to a DebtAccount.
export type MonthlyEntry =
  | (EntryBase & { kind: 'income';  category: IncomeCategory })
  | (EntryBase & { kind: 'savings'; category: SavingsCategory })
  | (EntryBase & { kind: 'debt';    category: 'debt'; debtId: Id | null })
  | (EntryBase & { kind: 'fixed';   category: ExpenseCategory });

export type OtherBill = {
  id: Id;
  name: string;
  dueDate: ISODate;
  amountDue: Cents;
  amountPaid: Cents;
  paid: boolean;
  category: ExpenseCategory;
  notes: string;
};

export type MonthGoal = { id: Id; text: string; done: boolean };

export type MonthRecord = {
  month: MonthKey;
  openingBalanceOverride: Cents | null;  // null = carry over automatically
  goals: MonthGoal[];                     // UI shows 5 slots minimum
  entries: MonthlyEntry[];
  otherBills: OtherBill[];
  notes: string;
  reflection: string;                     // "This month taught me..."
  updatedAt: string;
};

// ---------- Debts ----------
export type DebtAccount = {
  id: Id;
  creditor: string;
  accountRef: string | null;     // stored as last 4 only, displayed "•••• 4821"
  interestRateApr: number;       // percent, e.g. 18.5
  startingBalance: Cents;
  startDate: ISODate;
  minimumPayment: Cents;
  goalPayoffDate: ISODate | null;
  motivation: string;            // "Why I'm doing this..."
  archived: boolean;
};

// Payment history is DERIVED from MonthlyEntry(kind 'debt', debtId) across all months,
// so logging a payment in the monthly table and in the debt page is the same record.
export type DebtPaymentRow = {
  entryId: Id; month: MonthKey; date: ISODate;
  amountPaid: Cents; remainingBalance: Cents; notes: string;
};

// ---------- Yearly goals ----------
export type GoalStatus = 'not-started' | 'in-progress' | 'achieved' | 'paused';
export type YearlyGoal = {
  id: Id; slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  title: string; targetAmount: Cents | null; currentAmount: Cents;
  status: GoalStatus; notes: string;
};
export type YearPlan = { year: number; commitment: string; goals: YearlyGoal[] }; // "This year, I will..."

// ---------- Bank accounts (security-by-design) ----------
export type AccountType = 'savings' | 'current' | 'credit' | 'wallet';
export type BankAccount = {
  id: Id; name: string; institution: string; type: AccountType;
  branch: string; cardLast4: string | null;   // regex /^\d{4}$/, never full numbers
  currentBalance: Cents; notes: string;
  // Deliberately NO password / login note / security hint / access-code fields.
};

// ---------- Profile & root ----------
export type Profile = {
  name: string; email: string;
  currency: CurrencyCode; theme: ThemePreference;
  initialBalance: Cents;       // opening balance for the very first month
  llmEnabled: boolean;
};

export type FinanceData = {
  schemaVersion: 1;
  profile: Profile;
  months: Record<MonthKey, MonthRecord>;
  debts: DebtAccount[];
  yearPlans: Record<number, YearPlan>;
  bankAccounts: BankAccount[];
};

export type BackupEnvelope = { app: 'mindset-finance-planner'; exportedAt: string; data: FinanceData };

// ---------- Derived (never stored) ----------
export type MonthSummary = {
  month: MonthKey;
  openingBalance: Cents; openingSource: 'override' | 'carried' | 'initial';
  totalIncome: Cents;
  totalFixed: Cents; totalDebtPayments: Cents; totalOtherBills: Cents;
  totalExpenses: Cents;          // fixed + debt + other bills (paid amount)
  totalSavings: Cents;
  netDifference: Cents;          // income − expenses − savings
  balanceForward: Cents;         // opening + netDifference
  outstandingBills: Cents;       // Σ(amountDue − amountPaid) where > 0
  byCategory: Partial<Record<ExpenseCategory, Cents>>;
  biggestCategory: ExpenseCategory | null;
  smallestCategory: ExpenseCategory | null;  // smallest non-zero
};
```

## 5. Calculation logic

**Month summary** (`monthSummary.ts`)
- `totalIncome = Σ income.amount`
- `totalExpenses = Σ fixed.amount + Σ debt.amount + Σ otherBills.amountPaid`
- `totalSavings = Σ savings.amount`
- `netDifference = totalIncome − totalExpenses − totalSavings`
- `balanceForward = openingBalance + netDifference`
- Category ranking uses fixed entries + other bills (paid). Debt payments get their own `debt` bucket. Biggest = max, smallest = min of non-zero buckets; ties break alphabetically so the result is stable.

**Carry-over** (`carryOver.ts`)
- `opening(m) = override(m) ?? balanceForward(prev recorded month) ?? profile.initialBalance`
- "Previous recorded month" is the nearest earlier `MonthRecord`, so skipping a month doesn't zero the balance.
- Computed in one forward pass over sorted month keys (O(n)) and memoized in a selector, so editing March updates April through December instantly.

**Debt remaining balance** (`debt.ts`)
- Payment rows are linked `debt` entries sorted by date. `remaining = startingBalance − cumulative payments`, floored at 0.
- The log tracks what you paid, not lender-posted interest. The simulator handles interest projections.

**Payoff simulator** (`payoffSimulator.ts`)
- Monthly loop: `interest = round(balance × APR/12/100)`, `balance = balance + interest − payment`, cap 600 months.
- Run twice, baseline (minimum payment) and with `minimum + extra`. Output: months to payoff, payoff date, total interest, interest saved, a per-month balance series for both lines.
- If `payment ≤ first month's interest`, return `{ kind: 'never-pays-off' }` and show a warning instead of an infinite loop.

**Year summary** (`yearSummary.ts`)
- For a `range: 'full' | 'h1' | 'h2'`, map months 1–12 (or 1–6 / 7–12) to `MonthSummary | null` (null shows an empty row), plus column totals and a `category × month` matrix.

**Quick-entry parser** (`quickEntry/parser.ts`)
1. Normalize: lowercase, strip `Rs.`, `rs`, `LKR`, `/=`, thousands commas.
2. Amount: first number token, with `k` (`1.5k` → 1500) and `lakh` (`2 lakh` → 200000) multipliers.
3. Date: `today`/`ada` → today; `yesterday`/`iye`/`ayye` → −1; `day before`/`pereda` → −2; explicit `22/11`, `nov 22`, `2026-11-22`.
4. Kind + category from the lexicon (longest match wins): `salary, padiya, pagaya` → income/salary; `save, ithuru, fd` → savings; `loan, leasing, card payment, naya` → debt (also matches debt creditor names to set `debtId`); `electricity, current bill, CEB, LECO` → fixed/utilities; `water bill` → utilities; `petrol, diesel, thel` → fuel; `lunch, kema, dinner, bath` → food; `bus, train, pickme, uber, three wheel` → transport; `dialog, mobitel, slt, fiber` → phone-internet; `kade, keells, cargills, arpico` → groceries; and so on.
5. Remaining words become the description, title-cased (`"ada lunch 850"` → *Lunch*, fixed/food, Rs. 850, today).
6. Result is `{ ok: true, draft, confidence }` or `{ ok: false, reason }`. Low confidence offers "Try AI parse" when the LLM hook is enabled.
7. The LLM hook sends the text plus the allowed category list and validates the reply with the same zod schema. It never writes without the confirmation pill.

## 6. Persistence & backend seam

```ts
export interface FinanceRepository {
  load(): Promise<FinanceData | null>;
  saveMonth(record: MonthRecord): Promise<void>;
  saveDebts(debts: DebtAccount[]): Promise<void>;
  saveYearPlan(plan: YearPlan): Promise<void>;
  saveBankAccounts(accounts: BankAccount[]): Promise<void>;
  saveProfile(profile: Profile): Promise<void>;
  replaceAll(data: FinanceData): Promise<void>;   // import / demo / reset
  clear(): Promise<void>;
}
```

The UI only talks to the zustand store, and the store only talks to this interface. A later `HttpRepository` (Express + MongoDB) implements the same methods against REST endpoints. Writes are optimistic: the store updates first, then persists. Import goes through `zod` parse → `migrate(schemaVersion)` → `replaceAll`.

## 7. Navigation

- **Mobile (<768px):** sticky top bar with month picker + quick-entry, sticky bottom nav: Dashboard · Monthly · Debts · Goals · More (More → Summary, Accounts, Settings).
- **Desktop:** collapsible left sidebar (icons only when collapsed, state remembered) with all 7 sections; quick-entry bar pinned in the top bar.

## 8. Open questions (defaults in bold)

1. **Savings reduce the balance forward.** Savings move money out of the spending pot (the paper planner works this way). Alternative: treat savings as informational only.
2. **Totals count every row, paid or not**, so the month works as a plan. Overview shows "x of y paid" plus outstanding bills. Alternative: count only cleared rows.
3. **Gemini API key is entered in Settings and stored locally**, not baked into the bundle via `VITE_GEMINI_API_KEY`. Any `VITE_` variable ships to every visitor of the deployed site, which is a real leak for a public portfolio. `.env` support stays for local dev only.
4. **Monthly entries remain 4 fixed tables** as specified, with a compact card list on mobile instead of horizontally scrolling tables.
