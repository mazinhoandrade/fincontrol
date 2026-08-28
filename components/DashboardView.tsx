'use client';

import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { formatCurrency, formatDate, getDueDateStatus } from '@/lib/utils';
import { CategoryChart } from './charts/CategoryChart';
import { MonthlyFlowChart } from './charts/MonthlyFlowChart';
import { CategoryIcon } from './CategoryIcon';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  CalendarClock,
  Plus,
  ArrowRightLeft,
  ReceiptText,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  CreditCard,
} from 'lucide-react';
import { Bill, Transaction } from '@/lib/types';
import { TransactionModal } from './modals/TransactionModal';
import { BillModal } from './modals/BillModal';
import { TransferModal } from './modals/TransferModal';
import { PayBillModal } from './modals/PayBillModal';

export function DashboardView() {
  const {
    totalBalance,
    currentMonthIncome,
    currentMonthExpense,
    pendingBillsCount,
    pendingBillsTotal,
    overdueBillsCount,
    overdueBillsTotal,
    transactions,
    bills,
    categories,
    accounts,
    setActiveTab,
  } = useFinance();

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [billToPay, setBillToPay] = useState<Bill | null>(null);

  // Recent transactions (last 5)
  const recentTransactions = transactions.slice(0, 5);

  // Urgent / Upcoming bills
  const urgentBills = bills
    .filter((b) => b.status !== 'paid')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
            Dashboard Financeiro
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Visão geral consolidada do seu patrimônio, receitas e compromissos
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
            Transferir
          </button>
          <button
            onClick={() => setIsBillModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ReceiptText className="w-3.5 h-3.5 text-amber-400" />
            Nova Conta a Pagar
          </button>
          <button
            onClick={() => setIsTxModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-950/50"
          >
            <Plus className="w-4 h-4" />
            Nova Transação
          </button>
        </div>
      </div>

      {/* Overdue alert banner if any */}
      {overdueBillsCount > 0 && (
        <div className="p-4 bg-gradient-to-r from-rose-950/60 to-zinc-900 border border-rose-800/60 rounded-2xl flex items-center justify-between gap-4 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-rose-200">
                Você tem {overdueBillsCount} {overdueBillsCount === 1 ? 'conta vencida' : 'contas vencidas'}!
              </h4>
              <p className="text-xs text-rose-300/80">
                Total pendente em atraso: <strong>{formatCurrency(overdueBillsTotal)}</strong>. Evite multas e juros.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('bills')}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition-all shrink-0"
          >
            Ver Vencidas
          </button>
        </div>
      )}

      {/* 4 Main Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Atual */}
        <div
          onClick={() => setActiveTab('accounts')}
          className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 backdrop-blur-md shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400">Saldo Atual</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-100 tracking-tight">
            {formatCurrency(totalBalance)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
            <span>{accounts.length} contas cadastradas</span>
            <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center">
              Detalhes &rarr;
            </span>
          </div>
        </div>

        {/* Receitas do Mês */}
        <div
          onClick={() => setActiveTab('transactions')}
          className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 backdrop-blur-md shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400">Receitas do Mês</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 tracking-tight">
            {formatCurrency(currentMonthIncome)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="text-emerald-500 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Entradas ativas
            </span>
            <span className="text-zinc-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center">
              Extrato &rarr;
            </span>
          </div>
        </div>

        {/* Despesas do Mês */}
        <div
          onClick={() => setActiveTab('transactions')}
          className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 backdrop-blur-md shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400">Despesas do Mês</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400 tracking-tight">
            {formatCurrency(currentMonthExpense)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="text-rose-400/80 font-medium">Gastos consolidados</span>
            <span className="text-zinc-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center">
              Extrato &rarr;
            </span>
          </div>
        </div>

        {/* Contas Pendentes */}
        <div
          onClick={() => setActiveTab('bills')}
          className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 backdrop-blur-md shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400">Contas Pendentes</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 tracking-tight">
            {formatCurrency(pendingBillsTotal)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
            <span>{pendingBillsCount} {pendingBillsCount === 1 ? 'conta a pagar' : 'contas a pagar'}</span>
            <span className="text-amber-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center">
              Pagar &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryChart />
        <MonthlyFlowChart />
      </div>

      {/* Bottom Row: Próximas Contas & Últimas Transações */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Contas a Pagar / Próximos Vencimentos */}
        <div className="lg:col-span-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-amber-400" />
                Contas a Pagar & Vencimentos
              </h3>
              <p className="text-xs text-zinc-400">Próximos compromissos financeiros</p>
            </div>
            <button
              onClick={() => setActiveTab('bills')}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
            >
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {urgentBills.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto mb-1" />
                Nenhuma conta pendente no momento.
              </div>
            ) : (
              urgentBills.map((bill) => {
                const statusInfo = getDueDateStatus(bill.dueDate, bill.status);
                const cat = categories.find((c) => c.id === bill.categoryId);

                return (
                  <div
                    key={bill.id}
                    className="p-3 bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 rounded-xl flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${cat?.color || '#f59e0b'}20`,
                          color: cat?.color || '#f59e0b',
                        }}
                      >
                        <CategoryIcon name={cat?.icon || 'Tag'} className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-zinc-200 truncate">{bill.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusInfo.colorClass}`}
                          >
                            {statusInfo.label}
                          </span>
                          {bill.recipient && (
                            <span className="text-[10px] text-zinc-500 truncate">{bill.recipient}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-bold text-zinc-100">{formatCurrency(bill.amount)}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">{formatDate(bill.dueDate)}</p>
                      </div>
                      <button
                        onClick={() => setBillToPay(bill)}
                        title="Marcar como paga"
                        className="p-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Últimas Transações */}
        <div className="lg:col-span-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                Últimas Transações
              </h3>
              <p className="text-xs text-zinc-400">Movimentações recentes no sistema</p>
            </div>
            <button
              onClick={() => setActiveTab('transactions')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
            >
              Ver extrato <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs">
                Nenhuma movimentação registrada.
              </div>
            ) : (
              recentTransactions.map((tx) => {
                const cat = categories.find((c) => c.id === tx.categoryId);
                const acc = accounts.find((a) => a.id === tx.accountId);

                return (
                  <div
                    key={tx.id}
                    className="p-3 bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 rounded-xl flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
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
                      <div className="truncate">
                        <p className="text-xs font-semibold text-zinc-200 truncate">{tx.description}</p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {cat?.name || 'Geral'} • <span className="text-zinc-500">{acc?.name || 'Conta'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`text-xs font-bold ${
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

      {/* Modals */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
      />
      <BillModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
      />
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />
      <PayBillModal
        isOpen={!!billToPay}
        onClose={() => setBillToPay(null)}
        bill={billToPay}
      />
    </div>
  );
}
