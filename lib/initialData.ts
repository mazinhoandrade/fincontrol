import { Account, Bill, Category, Transaction } from './types';

// Helper to get relative dates based on current date
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const prevMonth = String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0');
const prevYear = now.getMonth() === 0 ? year - 1 : year;

const getISODate = (y: number, m: number, d: number) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${y}-${pad(m)}-${pad(d)}`;
};

export const initialCategories: Category[] = [
  { id: 'cat-salario', name: 'Salário & Renda', type: 'income', icon: 'Banknote', color: '#10b981' },
  { id: 'cat-freelance', name: 'Freelance & Extras', type: 'income', icon: 'Laptop', color: '#06b6d4' },
  { id: 'cat-rendimentos', name: 'Rendimentos', type: 'income', icon: 'TrendingUp', color: '#8b5cf6' },
  { id: 'cat-alimentacao', name: 'Alimentação & Mercado', type: 'expense', icon: 'Utensils', color: '#f59e0b' },
  { id: 'cat-moradia', name: 'Moradia & Aluguel', type: 'expense', icon: 'Home', color: '#ec4899' },
  { id: 'cat-transporte', name: 'Transporte & Combustível', type: 'expense', icon: 'Car', color: '#3b82f6' },
  { id: 'cat-servicos', name: 'Contas & Serviços', type: 'expense', icon: 'Zap', color: '#ef4444' },
  { id: 'cat-saude', name: 'Saúde & Farmácia', type: 'expense', icon: 'HeartPulse', color: '#14b8a6' },
  { id: 'cat-lazer', name: 'Lazer & Entretenimento', type: 'expense', icon: 'Film', color: '#a855f7' },
  { id: 'cat-educacao', name: 'Educação', type: 'expense', icon: 'GraduationCap', color: '#6366f1' },
  { id: 'cat-outros', name: 'Outros', type: 'both', icon: 'Tag', color: '#64748b' },
];

export const initialAccounts: Account[] = [
  {
    id: 'acc-dinheiro',
    name: 'Dinheiro Físico',
    type: 'dinheiro',
    balance: 380.00,
    institution: 'Espécie',
    color: '#10b981',
    icon: 'Coins',
  },
  {
    id: 'acc-nubank',
    name: 'Nubank Principal',
    type: 'banco',
    balance: 4250.75,
    institution: 'Nubank',
    color: '#8b5cf6',
    icon: 'Landmark',
    accountNumber: 'Ag 0001 • C/C 98234-1',
  },
  {
    id: 'acc-itau',
    name: 'Itaú Corrente',
    type: 'banco',
    balance: 1820.30,
    institution: 'Itaú Unibanco',
    color: '#f97316',
    icon: 'Building2',
    accountNumber: 'Ag 1402 • C/C 45120-8',
  },
  {
    id: 'acc-carteira',
    name: 'Carteira de Investimentos',
    type: 'carteira',
    balance: 9500.00,
    institution: 'XP Investimentos',
    color: '#06b6d4',
    icon: 'Wallet',
  },
];

export const initialBills: Bill[] = [
  {
    id: 'bill-1',
    title: 'Aluguel do Apartamento',
    amount: 1450.00,
    dueDate: getISODate(year, now.getMonth() + 1, Math.min(28, now.getDate() + 5)),
    categoryId: 'cat-moradia',
    status: 'pending',
    recipient: 'Imobiliária Aliança',
    barcode: '34191.79001 01043.510047 91020.150008 5 91230000145000',
    notes: 'Vence no quinto dia útil',
    isRecurring: true,
    recurrencePeriod: 'monthly',
  },
  {
    id: 'bill-2',
    title: 'Energia Elétrica (Enel)',
    amount: 195.40,
    dueDate: getISODate(year, now.getMonth() + 1, Math.max(1, now.getDate() - 2)), // Overdue example
    categoryId: 'cat-servicos',
    status: 'overdue',
    recipient: 'Enel Distribuição',
    barcode: '83620000001 9 95400053000 4 00012431000 8 00000000000 0',
    notes: 'Conta de luz referente ao mês passado',
    isRecurring: true,
  },
  {
    id: 'bill-3',
    title: 'Internet Fibra 500MB',
    amount: 119.90,
    dueDate: getISODate(year, now.getMonth() + 1, Math.min(28, now.getDate() + 2)), // Due soon
    categoryId: 'cat-servicos',
    status: 'pending',
    recipient: 'Vivo Fibra',
    barcode: '23793.38128 60032.140234 14002.503408 9 92340000011990',
    isRecurring: true,
  },
  {
    id: 'bill-4',
    title: 'Cartão de Crédito Nubank',
    amount: 840.50,
    dueDate: getISODate(year, now.getMonth() + 1, Math.min(28, now.getDate() + 10)),
    categoryId: 'cat-outros',
    status: 'pending',
    recipient: 'Nu Pagamentos S.A.',
    isRecurring: true,
  },
  {
    id: 'bill-5',
    title: 'Plano de Saúde',
    amount: 320.00,
    dueDate: getISODate(year, now.getMonth() + 1, Math.max(1, now.getDate() - 6)),
    categoryId: 'cat-saude',
    status: 'paid',
    paidAt: getISODate(year, now.getMonth() + 1, Math.max(1, now.getDate() - 5)),
    accountId: 'acc-nubank',
    recipient: 'Unimed Saúde',
  },
  {
    id: 'bill-6',
    title: 'Academia SmartFit',
    amount: 119.90,
    dueDate: getISODate(year, now.getMonth() + 1, Math.min(28, now.getDate() + 15)),
    categoryId: 'cat-saude',
    status: 'pending',
    recipient: 'SmartFit',
    isRecurring: true,
  },
];

export const initialTransactions: Transaction[] = [
  {
    id: 'tx-1',
    description: 'Salário Mensal',
    amount: 5800.00,
    type: 'income',
    categoryId: 'cat-salario',
    accountId: 'acc-nubank',
    date: getISODate(year, now.getMonth() + 1, 5),
    notes: 'Pagamento empresa',
  },
  {
    id: 'tx-2',
    description: 'Projeto UI/UX Freelance',
    amount: 1200.00,
    type: 'income',
    categoryId: 'cat-freelance',
    accountId: 'acc-itau',
    date: getISODate(year, now.getMonth() + 1, 10),
    notes: 'Landing page cliente',
  },
  {
    id: 'tx-3',
    description: 'Supermercado Mensal',
    amount: 680.45,
    type: 'expense',
    categoryId: 'cat-alimentacao',
    accountId: 'acc-nubank',
    date: getISODate(year, now.getMonth() + 1, 8),
    notes: 'Compras do mês',
  },
  {
    id: 'tx-4',
    description: 'Abastecimento Carro',
    amount: 180.00,
    type: 'expense',
    categoryId: 'cat-transporte',
    accountId: 'acc-itau',
    date: getISODate(year, now.getMonth() + 1, 12),
    notes: 'Gasolina aditivada Posto Ipiranga',
  },
  {
    id: 'tx-5',
    description: 'Pagamento Plano de Saúde',
    amount: 320.00,
    type: 'expense',
    categoryId: 'cat-saude',
    accountId: 'acc-nubank',
    date: getISODate(year, now.getMonth() + 1, Math.max(1, now.getDate() - 5)),
    billId: 'bill-5',
    notes: 'Unimed Saúde',
  },
  {
    id: 'tx-6',
    description: 'Jantar Restaurante',
    amount: 145.80,
    type: 'expense',
    categoryId: 'cat-alimentacao',
    accountId: 'acc-dinheiro',
    date: getISODate(year, now.getMonth() + 1, 14),
  },
  {
    id: 'tx-7',
    description: 'Rendimento CDB 100% CDI',
    amount: 85.30,
    type: 'income',
    categoryId: 'cat-rendimentos',
    accountId: 'acc-carteira',
    date: getISODate(year, now.getMonth() + 1, 15),
  },
  {
    id: 'tx-8',
    description: 'Cinema e Lazer',
    amount: 72.00,
    type: 'expense',
    categoryId: 'cat-lazer',
    accountId: 'acc-dinheiro',
    date: getISODate(year, now.getMonth() + 1, 18),
  },
];
