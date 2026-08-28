'use client';

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { Bill } from '@/lib/types';
import { formatCurrency, formatDate, getDueDateStatus } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { BillModal } from './modals/BillModal';
import { PayBillModal } from './modals/PayBillModal';
import {
  ReceiptText,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  CreditCard,
  Trash2,
  Edit2,
  RotateCcw,
  Barcode,
  Repeat,
  Search,
  Filter,
} from 'lucide-react';

export function BillsView() {
  const {
    bills,
    deleteBill,
    unpayBill,
    categories,
    accounts,
    pendingBillsTotal,
    overdueBillsTotal,
    overdueBillsCount,
    upcomingBillsTotal,
    upcomingBillsCount,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'all' | 'overdue' | 'upcoming' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals state
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [billToEdit, setBillToEdit] = useState<Bill | null>(null);
  const [billToPay, setBillToPay] = useState<Bill | null>(null);

  // Filter bills
  const filteredBills = useMemo(() => {
    return bills
      .filter((bill) => {
        // Tab Filter
        if (activeTab === 'overdue') {
          if (bill.status === 'paid') return false;
          const statusInfo = getDueDateStatus(bill.dueDate, bill.status);
          if (!statusInfo.isOverdue) return false;
        } else if (activeTab === 'upcoming') {
          if (bill.status === 'paid') return false;
          const statusInfo = getDueDateStatus(bill.dueDate, bill.status);
          if (statusInfo.daysDiff < 0 || statusInfo.daysDiff > 15) return false;
        } else if (activeTab === 'paid') {
          if (bill.status !== 'paid') return false;
        }

        // Category Filter
        if (selectedCategory !== 'all' && bill.categoryId !== selectedCategory) return false;

        // Search Filter
        if (
          searchQuery &&
          !bill.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(bill.recipient && bill.recipient.toLowerCase().includes(searchQuery.toLowerCase())) &&
          !(bill.barcode && bill.barcode.includes(searchQuery))
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.status === 'paid' && b.status !== 'paid') return 1;
        if (a.status !== 'paid' && b.status === 'paid') return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [bills, activeTab, selectedCategory, searchQuery]);

  // Total paid
  const paidTotal = useMemo(() => {
    return bills
      .filter((b) => b.status === 'paid')
      .reduce((acc, b) => acc + b.amount, 0);
  }, [bills]);

  const handleEdit = (bill: Bill) => {
    setBillToEdit(bill);
    setIsBillModalOpen(true);
  };

  const handleCopyBarcode = (barcode?: string) => {
    if (!barcode) return;
    navigator.clipboard.writeText(barcode);
    alert('Código copiado para a área de transferência!');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
            Contas a Pagar & Boletos
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Gerencie faturas, vencimentos, boletos e pagamentos agendados
          </p>
        </div>

        <button
          onClick={() => {
            setBillToEdit(null);
            setIsBillModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-amber-950/40"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Conta a Pagar
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pendente */}
        <div
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-zinc-900 border-amber-500/50 ring-1 ring-amber-500/30'
              : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Total Pendente</span>
            <ReceiptText className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-black text-amber-400 mt-1.5">{formatCurrency(pendingBillsTotal)}</p>
          <span className="text-[11px] text-zinc-400">{bills.filter((b) => b.status !== 'paid').length} contas em aberto</span>
        </div>

        {/* Vencidas */}
        <div
          onClick={() => setActiveTab('overdue')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'overdue'
              ? 'bg-rose-950/30 border-rose-500/50 ring-1 ring-rose-500/30'
              : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-400 font-medium">Contas Vencidas</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl font-black text-rose-400 mt-1.5">{formatCurrency(overdueBillsTotal)}</p>
          <span className="text-[11px] text-rose-300/80">
            {overdueBillsCount} {overdueBillsCount === 1 ? 'conta atrasada' : 'contas atrasadas'}
          </span>
        </div>

        {/* Próximos Vencimentos */}
        <div
          onClick={() => setActiveTab('upcoming')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'upcoming'
              ? 'bg-zinc-900 border-blue-500/50 ring-1 ring-blue-500/30'
              : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-400 font-medium">Próx. 15 Dias</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-black text-blue-400 mt-1.5">{formatCurrency(upcomingBillsTotal)}</p>
          <span className="text-[11px] text-zinc-400">{upcomingBillsCount} contas a vencer</span>
        </div>

        {/* Pagas */}
        <div
          onClick={() => setActiveTab('paid')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'paid'
              ? 'bg-zinc-900 border-emerald-500/50 ring-1 ring-emerald-500/30'
              : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-medium">Já Pagas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400 mt-1.5">{formatCurrency(paidTotal)}</p>
          <span className="text-[11px] text-zinc-400">{bills.filter((b) => b.status === 'paid').length} liquidadas</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar conta por título, favorecido, código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">Todas as Categorias</option>
              {categories
                .filter((c) => c.type === 'expense' || c.type === 'both')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Filter Status Selector */}
          <div>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">Todas as Contas</option>
              <option value="overdue">🔴 Apenas Vencidas</option>
              <option value="upcoming">🟡 Próximos Vencimentos</option>
              <option value="paid">🟢 Apenas Pagas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bills Cards Grid / List */}
      <div className="space-y-3">
        {filteredBills.length === 0 ? (
          <div className="p-16 bg-zinc-900/60 border border-zinc-800 rounded-2xl text-center text-zinc-500 text-sm">
            <ReceiptText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>Nenhuma conta encontrada com os filtros selecionados.</p>
          </div>
        ) : (
          filteredBills.map((bill) => {
            const cat = categories.find((c) => c.id === bill.categoryId);
            const statusInfo = getDueDateStatus(bill.dueDate, bill.status);
            const paidAccount = bill.accountId ? accounts.find((a) => a.id === bill.accountId) : null;

            return (
              <div
                key={bill.id}
                className={`p-4 bg-zinc-900/90 border rounded-2xl transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  bill.status === 'paid'
                    ? 'border-zinc-800/60 opacity-80'
                    : statusInfo.isOverdue
                    ? 'border-rose-800/80 bg-rose-950/10'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Left details */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                    style={{
                      backgroundColor: `${cat?.color || '#f59e0b'}20`,
                      color: cat?.color || '#f59e0b',
                    }}
                  >
                    <CategoryIcon name={cat?.icon || 'ReceiptText'} className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-zinc-100">{bill.title}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.colorClass}`}
                      >
                        {statusInfo.label}
                      </span>
                      {bill.isRecurring && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                          <Repeat className="w-2.5 h-2.5 text-amber-400" /> Recorrente
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400 flex-wrap">
                      <span>
                        Categoria: <strong className="text-zinc-300 font-medium">{cat?.name || 'Geral'}</strong>
                      </span>
                      {bill.recipient && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span>
                            Favorecido: <strong className="text-zinc-300 font-medium">{bill.recipient}</strong>
                          </span>
                        </>
                      )}
                      {bill.paidAt && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="text-emerald-400">
                            Paga em {formatDate(bill.paidAt)} {paidAccount && `(${paidAccount.name})`}
                          </span>
                        </>
                      )}
                    </div>

                    {bill.barcode && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[11px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800 truncate max-w-xs sm:max-w-md">
                          {bill.barcode}
                        </span>
                        <button
                          onClick={() => handleCopyBarcode(bill.barcode)}
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-0.5 transition-colors shrink-0"
                        >
                          <Barcode className="w-3 h-3" /> Copiar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right price & actions */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800/60">
                  <div className="text-left md:text-right">
                    <p className="text-lg font-black text-zinc-100 font-mono">{formatCurrency(bill.amount)}</p>
                    <p className="text-[11px] text-zinc-400">Vencimento: {formatDate(bill.dueDate)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {bill.status !== 'paid' ? (
                      <button
                        onClick={() => setBillToPay(bill)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Marcar como Paga
                      </button>
                    ) : (
                      <button
                        onClick={() => unpayBill(bill.id)}
                        title="Desfazer pagamento"
                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        Desfazer
                      </button>
                    )}

                    <button
                      onClick={() => handleEdit(bill)}
                      title="Editar"
                      className="p-2 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-xl transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir conta "${bill.title}"?`)) {
                          deleteBill(bill.id);
                        }
                      }}
                      title="Excluir"
                      className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <BillModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        billToEdit={billToEdit}
      />
      <PayBillModal
        isOpen={!!billToPay}
        onClose={() => setBillToPay(null)}
        bill={billToPay}
      />
    </div>
  );
}
