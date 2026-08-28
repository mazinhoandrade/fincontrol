'use client';

import React, { useState } from 'react';
import { Modal } from './Modal';
import { useFinance } from '@/context/FinanceContext';
import { formatCurrency } from '@/lib/utils';
import { ArrowRightLeft, DollarSign, FileText, AlertCircle } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TransferModal({ isOpen, onClose }: TransferModalProps) {
  const { accounts, transferBetweenAccounts } = useFinance();

  const [fromId, setFromId] = useState(accounts[0]?.id || '');
  const [toId, setToId] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('Transferência entre contas');

  const fromAccount = accounts.find((a) => a.id === fromId);
  const toAccount = accounts.find((a) => a.id === toId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) return;
    if (fromId === toId) return;

    transferBetweenAccounts(fromId, toId, numAmount, notes.trim());
    setAmount('');
    onClose();
  };

  const isSameAccount = fromId === toId;
  const numAmount = parseFloat(amount.replace(',', '.')) || 0;
  const hasInsufficientFunds = fromAccount && numAmount > fromAccount.balance;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transferência entre Contas"
      subtitle="Mova saldo de uma conta para outra instantaneamente"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* From and To Selector */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Origem (De onde sai o dinheiro):</label>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} • Saldo: {formatCurrency(a.balance)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center -my-1">
            <div className="p-1.5 bg-zinc-800 rounded-full text-zinc-400">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Destino (Para onde vai o dinheiro):</label>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} • Saldo: {formatCurrency(a.balance)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isSameAccount && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>A conta de origem e destino devem ser diferentes.</span>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Valor da Transferência (R$)</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
              <DollarSign className="w-4 h-4" />
            </div>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-sm font-semibold"
            />
          </div>
          {hasInsufficientFunds && (
            <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> O valor é maior que o saldo disponível na conta de origem.
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-zinc-400" /> Descrição
          </label>
          <input
            type="text"
            placeholder="Ex: Saque de dinheiro, Aporte na carteira..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs"
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
            disabled={isSameAccount}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 shadow-lg shadow-cyan-950/40 transition-all flex items-center gap-1.5"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transferir
          </button>
        </div>
      </form>
    </Modal>
  );
}
