'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useFinance } from '@/context/FinanceContext';
import { Category, TransactionType } from '@/lib/types';
import { CategoryIcon, AVAILABLE_ICONS } from '../CategoryIcon';
import { Palette, Tag } from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: Category | null;
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#64748b', // slate
];

export function CategoryModal({ isOpen, onClose, categoryToEdit }: CategoryModalProps) {
  const { addCategory, editCategory } = useFinance();

  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType | 'both'>('expense');
  const [icon, setIcon] = useState('Tag');
  const [color, setColor] = useState('#f59e0b');

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setType(categoryToEdit.type);
      setIcon(categoryToEdit.icon);
      setColor(categoryToEdit.color);
    } else {
      setName('');
      setType('expense');
      setIcon('Tag');
      setColor('#f59e0b');
    }
  }, [categoryToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (categoryToEdit) {
      editCategory(categoryToEdit.id, {
        name,
        type,
        icon,
        color,
      });
    } else {
      addCategory({
        name,
        type,
        icon,
        color,
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={categoryToEdit ? 'Editar Categoria' : 'Nova Categoria'}
      subtitle={categoryToEdit ? 'Atualize as opções da categoria' : 'Crie uma categoria para organizar suas receitas e despesas'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Nome da Categoria</label>
          <input
            type="text"
            placeholder="Ex: Alimentação, Viagens, Streaming..."
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>

        {/* Applicable Type */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Aplica-se a:</label>
          <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                type === 'expense'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Despesas
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                type === 'income'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Receitas
            </button>
            <button
              type="button"
              onClick={() => setType('both')}
              className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                type === 'both'
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Ambos
            </button>
          </div>
        </div>

        {/* Color Palette */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-zinc-400" /> Cor
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110 opacity-80'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Icon Selection */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-zinc-400" /> Escolha o Ícone
          </label>
          <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2 bg-zinc-950 border border-zinc-800 rounded-xl">
            {AVAILABLE_ICONS.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => setIcon(iconName)}
                className={`p-2.5 rounded-lg flex items-center justify-center transition-all ${
                  icon === iconName
                    ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/50 scale-105'
                    : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                }`}
              >
                <CategoryIcon name={iconName} className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
            style={{ backgroundColor: `${color}20`, color: color }}
          >
            <CategoryIcon name={icon} className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-400">Prévia da categoria:</p>
            <p className="text-sm font-semibold text-zinc-100">{name || 'Nome da Categoria'}</p>
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
            {categoryToEdit ? 'Salvar Alterações' : 'Criar Categoria'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
