'use client';

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { Category, Transaction, TransactionType } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { TransactionModal } from './modals/TransactionModal';
import { CategoryModal } from './modals/CategoryModal';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Tags,
  DollarSign,
  ArrowUpDown,
  Download,
  Calendar,
} from 'lucide-react';

export function TransactionsView() {
  const {
    transactions,
    deleteTransaction,
    categories,
    accounts,
    deleteCategory,
  } = useFinance();

  const [activeSubTab, setActiveSubTab] = useState<'transactions' | 'categories'>('transactions');
  const [filterType, setFilterType] = useState<string>('all'); // 'all' | 'income' | 'expense'
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);
  const [defaultTxType, setDefaultTxType] = useState<TransactionType>('expense');

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catToEdit, setCatToEdit] = useState<Category | null>(null);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (filterType !== 'all' && tx.type !== filterType) return false;
        if (filterCategory !== 'all' && tx.categoryId !== filterCategory) return false;
        if (filterAccount !== 'all' && tx.accountId !== filterAccount) return false;
        if (
          searchQuery &&
          !tx.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(tx.notes && tx.notes.toLowerCase().includes(searchQuery.toLowerCase()))
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === 'amount_desc') return b.amount - a.amount;
        if (sortBy === 'amount_asc') return a.amount - b.amount;
        return 0;
      });
  }, [transactions, filterType, filterCategory, filterAccount, searchQuery, sortBy]);

  // Metrics for current filter
  const { totalIncome, totalExpense, netTotal } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'income') inc += tx.amount;
      if (tx.type === 'expense') exp += tx.amount;
    });
    return { totalIncome: inc, totalExpense: exp, netTotal: inc - exp };
  }, [filteredTransactions]);

  const handleOpenAddTx = (type: TransactionType) => {
    setTxToEdit(null);
    setDefaultTxType(type);
    setIsTxModalOpen(true);
  };

  const handleEditTx = (tx: Transaction) => {
    setTxToEdit(tx);
    setIsTxModalOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Descricao', 'Tipo', 'Categoria', 'Conta', 'Valor', 'Observacoes'];
    const rows = filteredTransactions.map((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId)?.name || '';
      const acc = accounts.find((a) => a.id === tx.accountId)?.name || '';
      return [
        tx.date,
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.type === 'income' ? 'Receita' : 'Despesa',
        `"${cat}"`,
        `"${acc}"`,
        tx.amount.toFixed(2),
        `"${(tx.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transacoes_fincontrol_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
            Transações & Categorias
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Controle detalhado de todas as suas entradas, saídas e categorias
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenAddTx('income')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ArrowUpRight className="w-4 h-4" />
            Nova Receita
          </button>
          <button
            onClick={() => handleOpenAddTx('expense')}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Nova Despesa
          </button>
        </div>
      </div>

      {/* Main Mode Tabs: Transações vs Categorias */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-1">
        <button
          onClick={() => setActiveSubTab('transactions')}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-all relative ${
            activeSubTab === 'transactions'
              ? 'text-indigo-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-500'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Extrato de Transações ({transactions.length})
        </button>
        <button
          onClick={() => setActiveSubTab('categories')}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-all relative ${
            activeSubTab === 'categories'
              ? 'text-indigo-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-500'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Gerenciar Categorias ({categories.length})
        </button>
      </div>

      {activeSubTab === 'transactions' ? (
        <>
          {/* Summary Mini Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
              <span className="text-xs text-zinc-400">Total Receitas Filtradas</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">+{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
              <span className="text-xs text-zinc-400">Total Despesas Filtradas</span>
              <p className="text-xl font-bold text-rose-400 mt-1">-{formatCurrency(totalExpense)}</p>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
              <span className="text-xs text-zinc-400">Saldo Líquido</span>
              <p className={`text-xl font-bold mt-1 ${netTotal >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                {formatCurrency(netTotal)}
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Search */}
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar por descrição ou notas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Type Filter */}
              <div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">Todos os Tipos</option>
                  <option value="income">Apenas Receitas (+)</option>
                  <option value="expense">Apenas Despesas (-)</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">Todas as Categorias</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Filter */}
              <div>
                <select
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">Todas as Contas</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub toolbar */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span>Ordenação:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent border-none text-zinc-200 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="date_desc" className="bg-zinc-900">Mais recentes primeiro</option>
                  <option value="date_asc" className="bg-zinc-900">Mais antigas primeiro</option>
                  <option value="amount_desc" className="bg-zinc-900">Maior valor</option>
                  <option value="amount_asc" className="bg-zinc-900">Menor valor</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span>{filteredTransactions.length} lançamentos encontrados</span>
                <button
                  onClick={handleExportCSV}
                  className="text-zinc-300 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" /> Exportar CSV
                </button>
              </div>
            </div>
          </div>

          {/* Transactions Table / List */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            {filteredTransactions.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-sm">
                <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>Nenhuma transação encontrada com os filtros atuais.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/80 text-zinc-400 uppercase font-semibold border-b border-zinc-800 tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Descrição</th>
                      <th className="py-3.5 px-4">Categoria</th>
                      <th className="py-3.5 px-4">Conta</th>
                      <th className="py-3.5 px-4">Data</th>
                      <th className="py-3.5 px-4 text-right">Valor</th>
                      <th className="py-3.5 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {filteredTransactions.map((tx) => {
                      const cat = categories.find((c) => c.id === tx.categoryId);
                      const acc = accounts.find((a) => a.id === tx.accountId);

                      return (
                        <tr key={tx.id} className="hover:bg-zinc-800/40 transition-colors group">
                          {/* Description */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                  tx.type === 'income'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {tx.type === 'income' ? (
                                  <ArrowUpRight className="w-4 h-4" />
                                ) : (
                                  <ArrowDownLeft className="w-4 h-4" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-zinc-100">{tx.description}</p>
                                {tx.notes && <p className="text-[11px] text-zinc-500 line-clamp-1">{tx.notes}</p>}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4">
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium"
                              style={{
                                backgroundColor: `${cat?.color || '#64748b'}15`,
                                color: cat?.color || '#cbd5e1',
                              }}
                            >
                              <CategoryIcon name={cat?.icon || 'Tag'} className="w-3 h-3" />
                              {cat?.name || 'Geral'}
                            </span>
                          </td>

                          {/* Account */}
                          <td className="py-3.5 px-4 text-zinc-300 font-medium">
                            {acc?.name || 'Conta desconhecida'}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-zinc-400 font-mono">
                            {formatDate(tx.date)}
                          </td>

                          {/* Amount */}
                          <td
                            className={`py-3.5 px-4 text-right font-bold font-mono text-sm ${
                              tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEditTx(tx)}
                                title="Editar"
                                className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Excluir a transação "${tx.description}"?`)) {
                                    deleteTransaction(tx.id);
                                  }
                                }}
                                title="Excluir"
                                className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Categories Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              Categorias organizam seus relatórios e facilitam o controle de orçamentos.
            </p>
            <button
              onClick={() => {
                setCatToEdit(null);
                setIsCatModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nova Categoria
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-4 bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                    style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                  >
                    <CategoryIcon name={cat.icon} className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-100">{cat.name}</h4>
                    <span className="text-[10px] text-zinc-400 uppercase font-medium">
                      {cat.type === 'income' ? 'Receita' : cat.type === 'expense' ? 'Despesa' : 'Mista'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setCatToEdit(cat);
                      setIsCatModalOpen(true);
                    }}
                    className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir categoria "${cat.name}"?`)) {
                        deleteCategory(cat.id);
                      }
                    }}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        transactionToEdit={txToEdit}
        defaultType={defaultTxType}
      />
      <CategoryModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        categoryToEdit={catToEdit}
      />
    </div>
  );
}
