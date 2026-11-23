# CLAUDE.md

Personal Finance & Mindset Planner: a local-first React PWA that digitizes a paper 4-year finance planner. Default currency LKR. See `docs/PLAN.md` for the full architecture and data model.

## Commands

```bash
npm install          # install deps
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build (must pass with zero errors before every commit)
npm run preview      # serve the production build (test PWA/offline here, not in dev)
npm run test         # vitest run (pure logic in src/lib)
npm run typecheck    # tsc only
```

## Architecture rules

- **Layers:** `features/*` and `components/*` → `store/` → `data/repository.ts` interface. UI never touches IndexedDB, localStorage or `fetch` directly.
- **Pure logic lives in `src/lib/`.** No React imports there. Every calculation (month summary, carry-over, year summary, debt, payoff simulator, quick-entry parser) has a colocated `*.test.ts`.
- **Derived values are never stored.** Totals, balance forward, opening balance (unless overridden), debt remaining balance and payment history are computed via selectors.
- **Debt payment history is derived** from monthly `kind: 'debt'` entries with a `debtId`. Don't create a parallel payments collection.
- **Trust boundaries use zod:** JSON import and LLM responses. Domain types in `src/types/finance.ts` must stay in sync with `src/data/schema.ts`. Bump `schemaVersion` and add a migration for breaking changes.

## Money

- Amounts are integer minor units (`Cents` branded type). Never store or sum floats.
- Convert only in `src/lib/money.ts` (`parseMoney`, `formatMoney`, `sumCents`). Round interest to cents per period.

## TypeScript

- `strict`, `noUncheckedIndexedAccess`, no `any`, no `as` casts outside branded-type constructors in `lib/money.ts` / `lib/dates.ts`.
- Prefer discriminated unions and exhaustive `switch` with an `assertNever` helper.
- `type` over `interface`, except `FinanceRepository`, which is a contract for adapters.

## Security-by-design

- Bank accounts store **card last 4 digits only** and **never** passwords, login notes, security hints or access-code hints. Don't add such fields, even if asked in passing. Point to the README rationale.
- Debt account refs are stored masked (last 4).
- No API keys in the bundle: the Gemini key is user-entered in Settings and kept in local storage. `VITE_GEMINI_API_KEY` is for local dev only.

## UI conventions

- Tailwind only, `class`-based dark mode. Design tokens (colors, radius) live in `src/styles/index.css` `@theme`.
- Mobile-first: bottom nav <768px, collapsible sidebar ≥768px. Tables become card lists on mobile.
- Numbers use `tabular-nums`. Positive and negative amounts get semantic color plus a sign, never color alone.
- Every list has an empty state with a clear next action.
- Calm fintech look: generous whitespace, subtle borders over heavy shadows, 150–200ms transitions on specific properties (no `transition-all`).

## Data safety

- Stored data and imports go through `migrateToLatest` (`src/data/migrations.ts`) and then zod. When changing the schema, bump `SCHEMA_VERSION`, add a migration step and a test.
- Device-only preferences (theme mirror, sidebar state, Gemini key) live in `src/lib/localPrefs.ts` and are never part of `FinanceData` or backups.

## Workflow

- Run `npm run build` and `npm run test` before every commit.
- Debts and Year Summary are lazy-loaded (`React.lazy` in `App.tsx`). Keep Recharts imports inside `components/charts/` and those routes so it stays out of the entry chunk.
- UI changes: check 390px and 768px widths for horizontal overflow (grid children need `min-w-0`).
- Branch: `claude/admiring-archimedes-2dv3pa`.
