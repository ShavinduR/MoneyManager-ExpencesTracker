import type { ExpenseCategory, IncomeCategory, SavingsCategory } from '@/types/finance';

/** What a keyword resolves to. `debt` targets can be refined to a specific account by creditor name. */
export type EntryTarget =
  | { kind: 'income'; category: IncomeCategory }
  | { kind: 'savings'; category: SavingsCategory }
  | { kind: 'debt'; category: 'debt' }
  | { kind: 'fixed'; category: ExpenseCategory };

type LexiconGroup = { target: EntryTarget; terms: readonly string[] };

const income = (category: IncomeCategory, terms: readonly string[]): LexiconGroup => ({
  target: { kind: 'income', category },
  terms,
});
const savings = (category: SavingsCategory, terms: readonly string[]): LexiconGroup => ({
  target: { kind: 'savings', category },
  terms,
});
const expense = (category: ExpenseCategory, terms: readonly string[]): LexiconGroup => ({
  target: { kind: 'fixed', category },
  terms,
});

/**
 * English, Singlish (romanized Sinhala) and Sinhala-script keywords.
 * Matching is whole-word / whole-phrase and the LONGEST matching term wins,
 * so "credit card" (debt) beats "card", and "water bill" beats "bill".
 */
export const LEXICON: readonly LexiconGroup[] = [
  income('salary', ['salary', 'salery', 'padiya', 'paditha', 'pagaya', 'paga', 'payroll', 'wage', 'wages', 'පඩිය', 'වැටුප']),
  income('freelance', ['freelance', 'fiverr', 'upwork', 'client payment', 'project payment', 'gig']),
  income('business', ['sales', 'business income', 'shop income', 'profit', 'wyaparaya']),
  income('interest', ['interest income', 'fd interest', 'poli labuna', 'dividend', 'dividends']),
  income('other-income', ['bonus', 'allowance', 'commission', 'refund', 'income', 'received', 'labuna', 'rent income', 'cashback']),

  savings('emergency-fund', ['emergency fund', 'emergency']),
  savings('fixed-deposit', ['fixed deposit', 'fd']),
  savings('investment', ['unit trust', 'shares', 'stocks', 'cse', 'invest', 'investment', 'mutual fund', 'gold']),
  savings('other-savings', ['save', 'saved', 'saving', 'savings', 'ithuru', 'ithurum', 'ithuru kala', 'ඉතුරුම්', 'ඉතිරි']),

  { target: { kind: 'debt', category: 'debt' }, terms: ['loan', 'leasing', 'lease', 'credit card', 'card payment', 'card bill', 'installment', 'instalment', 'emi', 'naya', 'naya gewwa', 'ණය', 'mortgage payment'] },

  expense('housing', ['rent', 'house rent', 'boarding', 'kuliya', 'geval kuliya', 'annex', 'mortgage', 'කුලිය']),
  expense('utilities', ['electricity', 'electric', 'light bill', 'current bill', 'ceb', 'leco', 'water bill', 'water board', 'wathura bill', 'gas', 'litro', 'laugfs', 'ලයිට් බිල', 'වතුර බිල', 'කරන්ට් බිල']),
  expense('groceries', ['grocery', 'groceries', 'keells', 'cargills', 'arpico', 'food city', 'glomark', 'spar', 'supermarket', 'kade', 'badu', 'elawalu', 'vegetables', 'fruits', 'haal', 'rice packet', 'බඩු']),
  expense('food', ['lunch', 'dinner', 'breakfast', 'kema', 'kaema', 'bath', 'bath packet', 'rice and curry', 'kottu', 'coffee', 'tea', 'snack', 'snacks', 'short eats', 'restaurant', 'cafe', 'pizza', 'burger', 'uber eats', 'pickme food', 'kfc', 'කෑම']),
  expense('transport', ['bus', 'train', 'tuk', 'tuktuk', 'three wheel', 'threewheel', 'trishaw', 'pickme', 'uber', 'taxi', 'parking', 'toll', 'highway', 'bus fare', 'bus eka']),
  expense('fuel', ['petrol', 'diesel', 'fuel', 'thel', 'oil change', 'පෙට්‍රල්', 'ඉන්ධන']),
  expense('health', ['pharmacy', 'medicine', 'medicines', 'beheth', 'doctor', 'hospital', 'channelling', 'channeling', 'osu', 'lab test', 'dental', 'dentist', 'බෙහෙත්']),
  expense('education', ['tuition', 'class fee', 'class', 'course', 'school fees', 'school', 'books', 'potha', 'exam fee', 'udemy', 'coursera']),
  expense('insurance', ['insurance', 'aia', 'ceylinco', 'allianz', 'softlogic life', 'premium']),
  expense('subscriptions', ['netflix', 'spotify', 'youtube premium', 'subscription', 'icloud', 'chatgpt', 'prime video', 'google one', 'canva']),
  expense('phone-internet', ['dialog', 'mobitel', 'hutch', 'airtel', 'slt', 'fibre', 'fiber', 'internet', 'wifi', 'reload', 'data pack', 'phone bill', 'mobile bill']),
  expense('shopping', ['clothes', 'shoes', 'shopping', 'daraz', 'odel', 'fashion bug', 'nolimit', 'amazon', 'aliexpress', 'redhuge', 'dress']),
  expense('entertainment', ['movie', 'cinema', 'film', 'party', 'trip', 'outing', 'concert', 'game', 'games', 'trip eka']),
  expense('family', ['amma', 'ammata', 'thaththa', 'thaththata', 'parents', 'family', 'kids', 'baby', 'daughter', 'son', 'pocket money']),
  expense('gifts-donations', ['gift', 'gifts', 'donation', 'dana', 'dansal', 'temple', 'pansala', 'church', 'charity', 'pin']),
  expense('personal-care', ['salon', 'haircut', 'barber', 'cosmetics', 'gym', 'skincare', 'saloon']),
  expense('other', ['bill', 'misc', 'other', 'expense', 'spent', 'viyadam']),
];

/** Relative-date words: offset in days from today. Longest match wins. */
export const RELATIVE_DATE_TERMS: readonly { terms: readonly string[]; offset: number }[] = [
  { terms: ['today', 'ada', 'aja', 'අද', 'tonight', 'this morning'], offset: 0 },
  { terms: ['yesterday', 'iye', 'iiye', 'ee ye', 'ඊයේ'], offset: -1 },
  { terms: ['day before yesterday', 'pereda', 'perede', 'පෙරේදා'], offset: -2 },
  { terms: ['tomorrow', 'heta', 'හෙට'], offset: 1 },
];

/** Words that carry no meaning for the description. */
export const FILLER_WORDS: ReadonlySet<string> = new Set([
  'for', 'on', 'at', 'to', 'the', 'a', 'an', 'of', 'paid', 'pay', 'spent', 'spend', 'got', 'bought', 'buy', 'from',
  'gewwa', 'gewa', 'giya', 'una', 'eka', 'ekak', 'walata', 'ta', 'and', 'my', 'rs', 'rs.', 'lkr', 'rupees', 'rupiyal',
]);
