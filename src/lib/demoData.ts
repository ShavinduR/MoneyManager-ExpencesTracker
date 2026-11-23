import type {
  BankAccount,
  DebtAccount,
  ExpenseCategory,
  FinanceData,
  ISODate,
  MonthKey,
  MonthRecord,
  MonthlyEntry,
  OtherBill,
  YearPlan,
} from '@/types/finance';
import { SCHEMA_VERSION } from '@/types/finance';
import { currentMonthKey, dateInMonth, parseMonthKey, shiftMonth, todayISO } from './dates';
import { emptyYearlyGoal, GOAL_SLOTS } from './factories';
import { fromMajor } from './money';

/** Deterministic PRNG so the demo looks the same on every load. */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const DEBT_LOAN_ID = 'demo-debt-hnb-loan';
const DEBT_CARD_ID = 'demo-debt-sampath-card';

const MONTH_GOALS: readonly string[][] = [
  ['Track every expense for 30 days', 'Cook at home 5 days a week', 'Put Rs. 15,000 into emergency fund', 'Pay credit card above minimum', 'Cancel one unused subscription'],
  ['Keep groceries under Rs. 35,000', 'No impulse online shopping (Daraz)', 'Read one personal finance book', 'Review insurance policy', 'Walk to work twice a week'],
  ['Start a Rs. 10,000 unit trust SIP', 'Fuel under Rs. 25,000', 'Plan Avurudu budget early', 'Pay electricity bill on time', 'Sell old phone'],
  ['Extra Rs. 10,000 on credit card', 'Eat out max 4 times', 'Finish freelance project', 'Update budget categories', 'Call bank about FD rates'],
  ['Hit 3 months of emergency savings', 'Meal prep Sundays', 'Negotiate internet plan', 'No new debt', 'Donate to a cause I care about'],
  ['Close the credit card balance', 'Plan December spending', 'Keep fun money under Rs. 12,000', 'Reflect on the year', 'Set next year’s 8 goals'],
];

const REFLECTIONS: readonly string[] = [
  'Writing everything down showed me how fast small lunches add up. Rs. 850 a day is almost Rs. 19,000 a month.',
  'Having a grocery list before going to Keells saved me more than any coupon. Planning beats willpower.',
  'Automating the unit trust deposit on salary day means I never “see” that money, and I don’t miss it.',
  'Paying more than the minimum on the card feels slow, but the interest line on the statement is finally shrinking.',
  'The emergency fund gave me calm when the car needed repairs. No panic, no new loan.',
  'Small, consistent steps beat big resolutions. Seeing the whole year on one page showed me how far I’ve come.',
];

const NOTES: readonly string[] = [
  'Bonus month at work, kept lifestyle the same.',
  'Vehicle service due next month — set aside cash.',
  'Avurudu shopping planned, stick to the list.',
  'Freelance client paid late; follow up earlier next time.',
  'Electricity tariff changed, check next bill.',
  'Year-end: review all subscriptions before renewal.',
];

type Rng = () => number;
const between = (rng: Rng, min: number, max: number, step = 10): number =>
  Math.round((min + rng() * (max - min)) / step) * step;

const buildMonth = (month: MonthKey, index: number, rng: Rng, today: ISODate): MonthRecord => {
  const d = (day: number): ISODate => dateInMonth(month, day);
  const isPast = (date: ISODate): boolean => date <= today;
  let seq = 0;
  const id = (): string => `demo-${month}-${(seq++).toString().padStart(3, '0')}`;
  const fixed = (day: number, description: string, category: ExpenseCategory, amount: number): MonthlyEntry => ({
    id: id(),
    kind: 'fixed',
    category,
    date: d(day),
    description,
    amount: fromMajor(amount),
    cleared: isPast(d(day)),
  });

  const entries: MonthlyEntry[] = [
    { id: id(), kind: 'income', category: 'salary', date: d(25), description: 'Salary — Monthly', amount: fromMajor(265000), cleared: isPast(d(25)) },
    ...(index % 2 === 1
      ? [{ id: id(), kind: 'income' as const, category: 'freelance' as const, date: d(12), description: 'Freelance — Web project', amount: fromMajor(between(rng, 25000, 60000, 500)), cleared: isPast(d(12)) }]
      : []),
    ...(index === 3 ? [{ id: id(), kind: 'income' as const, category: 'other-income' as const, date: d(28), description: 'Performance bonus', amount: fromMajor(50000), cleared: isPast(d(28)) }] : []),

    { id: id(), kind: 'savings', category: 'emergency-fund', date: d(26), description: 'Emergency fund', amount: fromMajor(15000), cleared: isPast(d(26)) },
    ...(index >= 2 ? [{ id: id(), kind: 'savings' as const, category: 'investment' as const, date: d(26), description: 'Unit trust SIP', amount: fromMajor(10000), cleared: isPast(d(26)) }] : []),
    ...(index % 3 === 0 ? [{ id: id(), kind: 'savings' as const, category: 'fixed-deposit' as const, date: d(27), description: 'FD top-up', amount: fromMajor(20000), cleared: isPast(d(27)) }] : []),

    { id: id(), kind: 'debt', category: 'debt', debtId: DEBT_LOAN_ID, notes: 'Standing order', date: d(5), description: 'HNB Personal Loan', amount: fromMajor(28500), cleared: isPast(d(5)) },
    { id: id(), kind: 'debt', category: 'debt', debtId: DEBT_CARD_ID, notes: index >= 3 ? 'Paid extra' : 'Minimum + a little', date: d(18), description: 'Sampath Credit Card', amount: fromMajor(index >= 3 ? 25000 : 15000), cleared: isPast(d(18)) },

    fixed(1, 'House rent', 'housing', 45000),
    fixed(8, 'Electricity bill (CEB)', 'utilities', between(rng, 6200, 9400)),
    fixed(9, 'Water bill', 'utilities', between(rng, 1150, 1850)),
    fixed(10, 'SLT Fibre', 'phone-internet', 4990),
    fixed(3, 'Dialog reload', 'phone-internet', 1500),
    fixed(2, 'Keells groceries', 'groceries', between(rng, 9000, 13000)),
    fixed(16, 'Cargills groceries', 'groceries', between(rng, 7000, 11000)),
    fixed(23, 'Pola — vegetables & fruit', 'groceries', between(rng, 3500, 5500)),
    fixed(6, 'Petrol', 'fuel', between(rng, 5500, 7500, 100)),
    fixed(20, 'Petrol', 'fuel', between(rng, 5500, 7500, 100)),
    fixed(11, 'Lunch — office week', 'food', between(rng, 3800, 5200)),
    fixed(21, 'Dinner out with friends', 'food', between(rng, 2800, 6500)),
    fixed(14, 'PickMe rides', 'transport', between(rng, 1200, 3200)),
    fixed(4, 'Netflix', 'subscriptions', 2100),
    fixed(7, 'Gym membership', 'personal-care', 5000),
    fixed(15, 'AIA life insurance', 'insurance', 8500),
    fixed(26, 'Amma — monthly support', 'family', 15000),
    ...(index % 2 === 0 ? [fixed(19, 'Movie night', 'entertainment', between(rng, 1800, 3500))] : []),
    ...(index === 2 ? [fixed(13, 'Avurudu clothes — Odel', 'shopping', 14500)] : []),
    ...(index === 4 ? [fixed(22, 'Dansala donation', 'gifts-donations', 5000)] : []),
  ];

  const bills: OtherBill[] = [
    { id: id(), name: 'Doctor channelling', dueDate: d(12), amountDue: fromMajor(3500), amountPaid: fromMajor(isPast(d(12)) ? 3500 : 0), paid: isPast(d(12)), category: 'health', notes: 'Asiri — Dr. visit' },
    { id: id(), name: 'Pharmacy', dueDate: d(13), amountDue: fromMajor(between(rng, 1800, 4200)), amountPaid: fromMajor(0), paid: false, category: 'health', notes: '' },
    ...(index % 2 === 0
      ? [{ id: id(), name: 'Vehicle service', dueDate: d(24), amountDue: fromMajor(18500), amountPaid: fromMajor(isPast(d(24)) ? 18500 : 0), paid: isPast(d(24)), category: 'transport' as const, notes: 'Toyota Aqua — 40,000 km' }]
      : [{ id: id(), name: 'Udemy course', dueDate: d(9), amountDue: fromMajor(3900), amountPaid: fromMajor(isPast(d(9)) ? 3900 : 0), paid: isPast(d(9)), category: 'education' as const, notes: 'React advanced patterns' }]),
    { id: id(), name: 'Birthday gift', dueDate: d(17), amountDue: fromMajor(6000), amountPaid: fromMajor(isPast(d(17)) ? 5200 : 0), paid: isPast(d(17)), category: 'gifts-donations', notes: 'Came in under budget' },
  ];
  // The current month gets one overdue and one upcoming bill so due-date badges and reminders are visible.
  const isCurrent = month === currentMonthKey();
  bills.push(
    { id: id(), name: 'Revenue licence renewal', dueDate: d(20), amountDue: fromMajor(3200), amountPaid: fromMajor(isCurrent ? 0 : 3200), paid: !isCurrent, category: 'transport', notes: isCurrent ? 'Divisional secretariat — bring emission cert' : '' },
    { id: id(), name: 'Home Wi-Fi router upgrade', dueDate: d(28), amountDue: fromMajor(12500), amountPaid: fromMajor(isPast(d(28)) ? 12500 : 0), paid: isPast(d(28)), category: 'phone-internet', notes: '' },
  );
  // Mark the pharmacy bill paid in past months
  const pharmacy = bills[1];
  if (pharmacy && isPast(pharmacy.dueDate)) {
    bills[1] = { ...pharmacy, amountPaid: pharmacy.amountDue, paid: true };
  }

  const goals = (MONTH_GOALS[index] ?? []).map((text, i) => ({
    id: id(),
    text,
    done: month < currentMonthKey() ? i !== 4 || index % 2 === 0 : i < 2,
  }));

  return {
    month,
    openingBalanceOverride: null,
    goals,
    entries,
    otherBills: bills,
    notes: NOTES[index] ?? '',
    reflection: month < currentMonthKey() ? (REFLECTIONS[index] ?? '') : '',
    updatedAt: new Date().toISOString(),
  };
};

/** 6 months of realistic LKR data ending in the current month, 2 debts, 4 goals, 3 bank accounts. */
export const createDemoData = (now: Date = new Date()): FinanceData => {
  const rng = mulberry32(20261122);
  const today = todayISO();
  const current = currentMonthKey(now);
  const monthKeys = Array.from({ length: 6 }, (_, i) => shiftMonth(current, i - 5));
  const first = monthKeys[0] ?? current;
  const months = Object.fromEntries(monthKeys.map((m, i) => [m, buildMonth(m, i, rng, today)]));
  const year = parseMonthKey(current).year;

  const debts: DebtAccount[] = [
    {
      id: DEBT_LOAN_ID,
      creditor: 'HNB Personal Loan',
      accountRef: '4821',
      interestRateApr: 14.5,
      startingBalance: fromMajor(1_200_000),
      startDate: dateInMonth(shiftMonth(first, -1), 5),
      minimumPayment: fromMajor(28500),
      goalPayoffDate: `${year + 3}-12-31`,
      motivation: 'So my salary works for my future, not for the bank. Debt-free before 30.',
      archived: false,
    },
    {
      id: DEBT_CARD_ID,
      creditor: 'Sampath Credit Card',
      accountRef: '1093',
      interestRateApr: 28,
      startingBalance: fromMajor(185_000),
      startDate: dateInMonth(shiftMonth(first, -1), 18),
      minimumPayment: fromMajor(9250),
      goalPayoffDate: `${year + 1}-03-31`,
      motivation: 'Paying 28% interest is paying for things twice. Never carry a balance again.',
      archived: false,
    },
  ];

  const filled: Record<number, { title: string; target: number | null; current: number; status: YearPlan['goals'][number]['status'] }> = {
    1: { title: 'Build a Rs. 300,000 emergency fund', target: 300000, current: 195000, status: 'in-progress' },
    2: { title: 'Clear the Sampath credit card', target: 185000, current: 120000, status: 'in-progress' },
    3: { title: 'Invest Rs. 10,000 every month in unit trusts', target: 120000, current: 40000, status: 'in-progress' },
    4: { title: 'Read 6 personal finance books', target: null, current: 0, status: 'in-progress' },
  };
  const yearPlan: YearPlan = {
    year,
    commitment: 'This year, I will spend with intention, save first, and treat every rupee as a decision — not an accident.',
    mindMap: 'Freedom → no debt · emergency fund · travel with family\nIncome → salary growth · freelance side income\nHabits → track daily · review weekly · reflect monthly',
    goals: GOAL_SLOTS.map((slot) => {
      const g = filled[slot];
      const base = emptyYearlyGoal(slot);
      return g
        ? { ...base, title: g.title, targetAmount: g.target === null ? null : fromMajor(g.target), currentAmount: fromMajor(g.current), status: g.status }
        : base;
    }),
  };

  const bankAccounts: BankAccount[] = [
    { id: 'demo-acc-1', name: 'Salary Account', institution: 'Commercial Bank', type: 'savings', branch: 'Kandy City', cardLast4: '7712', currentBalance: fromMajor(142_350), notes: 'Salary credited on the 25th' },
    { id: 'demo-acc-2', name: 'Emergency Fund', institution: 'Sampath Bank', type: 'savings', branch: 'Nugegoda', cardLast4: null, currentBalance: fromMajor(195_000), notes: 'Do not touch unless real emergency' },
    { id: 'demo-acc-3', name: 'Credit Card', institution: 'Sampath Bank', type: 'credit', branch: 'Card Centre', cardLast4: '1093', currentBalance: fromMajor(-65_000), notes: 'Pay in full from next year' },
    { id: 'demo-acc-4', name: 'Mobile Wallet', institution: 'Genie (Dialog)', type: 'wallet', branch: '', cardLast4: null, currentBalance: fromMajor(3_250), notes: 'Bills & small payments' },
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    profile: {
      name: 'Demo User',
      email: 'demo@example.com',
      phone: '',
      city: 'Colombo',
      country: 'Sri Lanka',
      currency: 'LKR',
      theme: 'system',
      initialBalance: fromMajor(85_000),
      llmEnabled: false,
    },
    months,
    debts,
    yearPlans: { [String(year)]: yearPlan },
    bankAccounts,
  };
};
