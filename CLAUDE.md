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
- Secondary text uses `text-muted` / `text-subtle` (AA in both themes). Don't use `text-zinc-400/500` for text, or 600-level green/accent/sky/amber text on light backgrounds; use the 700 shades.
- Dialogs use `components/ui/Modal` (native `<dialog>` + `showModal()`); don't build ad-hoc overlays. Destructive actions use `ConfirmDialog`, never `window.confirm`.
- Big amounts in cards use `<Money fit="xl|2xl|…">` so long values step down instead of overflowing; grids of cards need `[&>*]:min-w-0`.
- No inline scripts (the CSP forbids them); put boot code in `public/`.
- Mobile-first: bottom nav <768px, collapsible sidebar ≥768px. Tables become card lists on mobile.
- Numbers use `tabular-nums`. Positive and negative amounts get semantic color plus a sign, never color alone.
- Every list has an empty state with a clear next action.
- Calm fintech look: generous whitespace, subtle borders over heavy shadows, 150–200ms transitions on specific properties (no `transition-all`).

## Data safety

- **Loading never writes or deletes.** `FinanceRepository.load()` returns `empty | loaded(issues) | unreadable`. Stored data is migrated (`src/data/migrations.ts`) and then salvaged record by record (`src/data/salvage.ts`): one bad value is reported and set aside with a raw recovery copy, and never wipes the database. Don't reintroduce "on failure, start fresh" logic.
- Imports use `parseImport` (structure + cross-record integrity + secret screening). When changing the schema, bump `SCHEMA_VERSION`, add a migration step and a test.
- All amounts are bounded by `MAX_CENTS` (Rs. 1 trillion) in `parseMoney`, the quick-add parser and the schema.
- Writes go through the store's `persist()`: failures surface as `saveError` with a retry, and successful writes notify other tabs (`src/data/sync.ts`) so a stale tab can't overwrite newer data.
- Storage falls back IndexedDB → localStorage → memory (`ResilientRepository`); nothing touches storage at import time.
- Device-only preferences (theme mirror, sidebar state, Gemini key, onboarding flags, guide language) live in `src/lib/localPrefs.ts` and are never part of `FinanceData`, backups or sync payloads.
- Device sync (`src/lib/sync/`, `src/features/sync/`): the payload is `buildSyncPayload` (a JSON backup) and the receiver validates it with `parseSyncPayload` (the import pipeline). Everything on the wire is AES-GCM encrypted and every incoming message is zod-parsed. Never apply received data without the Sync Preview confirmation, and never send without the sender's approval. Stop camera tracks on every exit path. Session teardown must stay idempotent (PeerJS fires close events synchronously). A different signalling host needs a matching `connect-src` in `vercel.json`.

## Workflow

- Run `npm run build` and `npm run test` before every commit.
- Debts and Year Summary are lazy-loaded (`React.lazy` in `App.tsx`). Keep Recharts imports inside `components/charts/` and those routes so it stays out of the entry chunk.
- Help, tour and Sync are lazy overlays (`resettableLazy` in `AppShell.tsx`). PeerJS, `qrcode` and `jsqr` may only be imported from `features/sync/` so they stay out of the entry chunk.
- UI changes: check 390px and 768px widths for horizontal overflow (grid children need `min-w-0`).
- Branch: `claude/admiring-archimedes-2dv3pa`.
