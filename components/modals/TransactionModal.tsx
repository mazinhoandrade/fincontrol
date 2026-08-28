'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useFinance } from '@/context/FinanceContext';
import { Transaction, TransactionType } from '@/lib/types';
import { ArrowDownLeft, ArrowUpRight, Calendar, DollarSign, Tag, Landmark, FileText } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
  defaultType?: TransactionType;
}

export function TransactionModal({
  isOpen,
  onClose,
  transactionToEdit,
  defaultType = 'expense',
}: TransactionModalProps) {
  const { addTransaction, editTransaction, categories, accounts } = useFinance();

  const [type, setType] = useState<TransactionType>(defaultType);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setDescription(transactionToEdit.description);
      setAmount(transactionToEdit.amount.toString());
      setCategoryId(transactionToEdit.categoryId);
      setAccountId(transactionToEdit.accountId);
      setDate(transactionToEdit.date);
      setNotes(transactionToEdit.notes || '');
    } else {
      setType(defaultType);
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      // Set defaults for categories and accounts
      const validCats = categories.filter((c) => c.type === defaultType || c.type === 'both');
      if (validCats.length > 0) setCategoryId(validCats[0].id);
      if (accounts.length > 0) setAccountId(accounts[0].id);
    }
  }, [transactionToEdit, defaultType, categories, accounts, isOpen]);

  // Filter categories by selected transaction type
  const filteredCategories = categories.filter(
    (c) => c.type === type || c.type === 'both'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) return;
    if (!description.trim() || !categoryId || !accountId) return;

    if (transactionToEdit) {
      editTransaction(transactionToEdit.id, {
        description,
        amount: numAmount,
        type,
        categoryId,
        accountId,
        date,
        notes: notes.trim() || undefined,
      });
    } else {
      addTransaction({
        description,
        amount: numAmount,
        type,
        categoryId,
        accountId,
        date,
        notes: notes.trim() || undefined,
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transactionToEdit ? 'Editar Transação' : 'Nova Transação'}
      subtitle={transactionToEdit ? 'Altere os dados do lançamento' : 'Registre uma receita ou despesa'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Selector (Receita / Despesa) */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setType('expense');
              const valid = categories.find((c) => c.type === 'expense' || c.type === 'both');
              if (valid) setCategoryId(valid.id);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              type === 'expense'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-rose-500" />
            Despesa
          </button>
          <button
            type="button"
            onClick={() => {
              setType('income');
              const valid = categories.find((c) => c.type === 'income' || c.type === 'both');
              if (valid) setCategoryId(valid.id);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              type === 'income'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            Receita
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Valor (R$)</label>
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
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Descrição</label>
          <input
            type="text"
            placeholder="Ex: Supermercado, Salário, Combustível..."
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>

        {/* Category & Account */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-zinc-400" /> Categoria
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-zinc-400" /> Conta
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Data
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-zinc-400" /> Observações (Opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Detalhes adicionais..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs resize-none"
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
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-all ${
              type === 'income'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30'
            }`}
          >
            {transactionToEdit ? 'Salvar Alterações' : type === 'income' ? 'Adicionar Receita' : 'Adicionar Despesa'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
