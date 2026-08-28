'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useFinance } from '@/context/FinanceContext';
import { Account, AccountType } from '@/lib/types';
import { Landmark, Coins, Wallet, DollarSign, Palette, Building2 } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountToEdit?: Account | null;
}

const PRESET_COLORS = [
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#3b82f6', // blue
  '#eab308', // yellow
  '#64748b', // slate
];

export function AccountModal({ isOpen, onClose, accountToEdit }: AccountModalProps) {
  const { addAccount, editAccount } = useFinance();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('banco');
  const [balance, setBalance] = useState('');
  const [institution, setInstitution] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState('#8b5cf6');

  useEffect(() => {
    if (accountToEdit) {
      setName(accountToEdit.name);
      setType(accountToEdit.type);
      setBalance(accountToEdit.balance.toString());
      setInstitution(accountToEdit.institution || '');
      setAccountNumber(accountToEdit.accountNumber || '');
      setColor(accountToEdit.color || '#8b5cf6');
    } else {
      setName('');
      setType('banco');
      setBalance('0');
      setInstitution('');
      setAccountNumber('');
      setColor('#8b5cf6');
    }
  }, [accountToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numBalance = parseFloat(balance.replace(',', '.'));
    if (isNaN(numBalance)) return;
    if (!name.trim()) return;

    const icon = type === 'dinheiro' ? 'Coins' : type === 'carteira' ? 'Wallet' : 'Landmark';

    if (accountToEdit) {
      editAccount(accountToEdit.id, {
        name,
        type,
        balance: numBalance,
        institution: institution.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        color,
        icon,
      });
    } else {
      addAccount({
        name,
        type,
        balance: numBalance,
        institution: institution.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        color,
        icon,
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={accountToEdit ? 'Editar Conta Financeira' : 'Nova Conta'}
      subtitle={accountToEdit ? 'Atualize as informações da conta' : 'Adicione uma conta bancária, dinheiro ou carteira'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account Type Selector */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Tipo de Conta</label>
          <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setType('banco')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[11px] font-semibold transition-all ${
                type === 'banco'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Landmark className="w-4 h-4" />
              Banco
            </button>
            <button
              type="button"
              onClick={() => setType('dinheiro')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[11px] font-semibold transition-all ${
                type === 'dinheiro'
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Coins className="w-4 h-4" />
              Dinheiro
            </button>
            <button
              type="button"
              onClick={() => setType('carteira')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[11px] font-semibold transition-all ${
                type === 'carteira'
                  ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Wallet className="w-4 h-4" />
              Carteira
            </button>
          </div>
        </div>

        {/* Account Name */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Nome da Conta</label>
          <input
            type="text"
            placeholder="Ex: Nubank Principal, Carteira de Bolso, Itaú..."
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>

        {/* Balance & Institution */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-zinc-400" /> Saldo Atual (R$)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              required
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-zinc-400" /> Instituição (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Nubank, Inter, XP..."
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>
        </div>

        {/* Account / Agency Number */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Número / Agência (Opcional)</label>
          <input
            type="text"
            placeholder="Ex: Ag 0001 • C/C 12345-6"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs font-mono"
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-zinc-400" /> Cor de Identificação
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110 opacity-80'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
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
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-950/40 transition-all"
          >
            {accountToEdit ? 'Salvar Alterações' : 'Criar Conta'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
