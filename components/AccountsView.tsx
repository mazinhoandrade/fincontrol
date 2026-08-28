'use client';

import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { Account, AccountType } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { AccountModal } from './modals/AccountModal';
import { TransferModal } from './modals/TransferModal';
import {
  Wallet,
  Landmark,
  Coins,
  Building2,
  Plus,
  ArrowRightLeft,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
} from 'lucide-react';

export function AccountsView() {
  const { accounts, deleteAccount, transactions, totalBalance, categories } = useFinance();

  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  // Transactions belonging to the selected account
  const accountTransactions = transactions.filter((t) => t.accountId === selectedAccount?.id);

  // Group accounts by type for quick summary
  const totalCash = accounts
    .filter((a) => a.type === 'dinheiro')
    .reduce((acc, a) => acc + a.balance, 0);

  const totalBank = accounts
    .filter((a) => a.type === 'banco')
    .reduce((acc, a) => acc + a.balance, 0);

  const totalWallet = accounts
    .filter((a) => a.type === 'carteira' || a.type === 'investimento')
    .reduce((acc, a) => acc + a.balance, 0);

  const handleEditAccount = (acc: Account) => {
    setAccountToEdit(acc);
    setIsAccountModalOpen(true);
  };

  const getAccountTypeIcon = (type: AccountType) => {
    switch (type) {
      case 'dinheiro':
        return <Coins className="w-5 h-5" />;
      case 'carteira':
        return <Wallet className="w-5 h-5" />;
      default:
        return <Landmark className="w-5 h-5" />;
    }
  };

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
      case 'dinheiro':
        return 'Dinheiro Físico';
      case 'carteira':
        return 'Carteira & Investimentos';
      default:
        return 'Conta Bancária';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
            Contas & Carteiras
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Gerencie seu dinheiro em espécie, contas bancárias e carteiras de investimento
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            Transferência
          </button>
          <button
            onClick={() => {
              setAccountToEdit(null);
              setIsAccountModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-950/50"
          >
            <Plus className="w-4 h-4" />
            Nova Conta
          </button>
        </div>
      </div>

      {/* Summary Cards by Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Consolidado */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Patrimônio Consolidado</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-100 tracking-tight">{formatCurrency(totalBalance)}</p>
          <span className="text-[11px] text-zinc-400 mt-1 block">{accounts.length} contas ativas</span>
        </div>

        {/* Contas Bancárias */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Contas Bancárias</span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-violet-400 tracking-tight">{formatCurrency(totalBank)}</p>
          <span className="text-[11px] text-zinc-400 mt-1 block">Nubank, Itaú, etc.</span>
        </div>

        {/* Dinheiro */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Dinheiro Físico</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 tracking-tight">{formatCurrency(totalCash)}</p>
          <span className="text-[11px] text-zinc-400 mt-1 block">Em espécie na carteira</span>
        </div>

        {/* Carteira / Investimentos */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Carteira & Reservas</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-cyan-400 tracking-tight">{formatCurrency(totalWallet)}</p>
          <span className="text-[11px] text-zinc-400 mt-1 block">Aplicações e reservas</span>
        </div>
      </div>

      {/* Accounts List & Details Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Accounts Cards List */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Suas Contas</h3>

          {accounts.map((acc) => {
            const isSelected = selectedAccount?.id === acc.id;

            return (
              <div
                key={acc.id}
                onClick={() => setSelectedAccountId(acc.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-md ${
                  isSelected
                    ? 'bg-zinc-900 border-indigo-500/60 ring-2 ring-indigo-500/20'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: `${acc.color}25`, color: acc.color }}
                    >
                      {getAccountTypeIcon(acc.type)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-100">{acc.name}</h4>
                      <p className="text-xs text-zinc-400">
                        {acc.institution || getAccountTypeLabel(acc.type)}
                        {acc.accountNumber ? ` • ${acc.accountNumber}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAccount(acc);
                      }}
                      title="Editar Conta"
                      className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {accounts.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Excluir conta "${acc.name}"?`)) {
                            deleteAccount(acc.id);
                          }
                        }}
                        title="Excluir Conta"
                        className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Saldo disponível</span>
                  <span
                    className={`text-base font-black font-mono ${
                      acc.balance >= 0 ? 'text-zinc-100' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(acc.balance)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Account Extrato / Details */}
        <div className="lg:col-span-7 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <span>Extrato de: {selectedAccount?.name}</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  {accountTransactions.length} {accountTransactions.length === 1 ? 'lançamento' : 'lançamentos'} nesta conta
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-zinc-400">Saldo atual</span>
                <p className="text-lg font-black text-zinc-100 font-mono">
                  {selectedAccount ? formatCurrency(selectedAccount.balance) : 'R$ 0,00'}
                </p>
              </div>
            </div>

            {/* Transactions List */}
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {accountTransactions.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 text-xs">
                  <DollarSign className="w-8 h-8 mx-auto mb-1 opacity-30" />
                  Nenhuma movimentação registrada nesta conta ainda.
                </div>
              ) : (
                accountTransactions.map((tx) => {
                  const cat = categories.find((c) => c.id === tx.categoryId);

                  return (
                    <div
                      key={tx.id}
                      className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.type === 'income'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {tx.type === 'income' ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-zinc-200 truncate">{tx.description}</p>
                          <p className="text-[10px] text-zinc-400">{cat?.name || 'Geral'}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p
                          className={`text-xs font-bold font-mono ${
                            tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono">{formatDate(tx.date)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        accountToEdit={accountToEdit}
      />
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />
    </div>
  );
}
