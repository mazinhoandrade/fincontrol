'use client';

import React, { useState } from 'react';
import { Modal } from './Modal';
import { useFinance } from '@/context/FinanceContext';
import { Bill } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CheckCircle2, Landmark, Calendar, AlertCircle } from 'lucide-react';

interface PayBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
}

export function PayBillModal({ isOpen, onClose, bill }: PayBillModalProps) {
  const { payBill, accounts } = useFinance();
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  if (!bill) return null;

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const willBeNegative = selectedAccount && (selectedAccount.balance - bill.amount < 0);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return;
    payBill(bill.id, selectedAccountId, payDate);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmar Pagamento de Conta"
      subtitle="O valor será debitado do saldo da conta selecionada"
      maxWidth="md"
    >
      <form onSubmit={handlePay} className="space-y-4">
        {/* Bill Summary Card */}
        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-400">Conta:</span>
            <span className="text-sm font-semibold text-zinc-100">{bill.title}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-400">Valor a pagar:</span>
            <span className="text-base font-bold text-rose-400">{formatCurrency(bill.amount)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-400">Vencimento original:</span>
            <span className="text-xs text-zinc-300 font-mono">{formatDate(bill.dueDate)}</span>
          </div>
          {bill.recipient && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400">Favorecido:</span>
              <span className="text-xs text-zinc-300">{bill.recipient}</span>
            </div>
          )}
        </div>

        {/* Account Selector */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5 text-zinc-400" /> Selecione a Conta para Débito
          </label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            required
            className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} (Saldo: {formatCurrency(acc.balance)})
              </option>
            ))}
          </select>

          {willBeNegative && (
            <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Atenção: O saldo desta conta ficará negativo após o pagamento.</span>
            </div>
          )}
        </div>

        {/* Payment Date */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Data do Pagamento
          </label>
          <input
            type="date"
            required
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-2.5 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirmar Pagamento
          </button>
        </div>
      </form>
    </Modal>
  );
}
