'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useFinance } from '@/context/FinanceContext';
import { Bill } from '@/lib/types';
import { MoneyInput } from '@/components/MoneyInput';
import { Calendar, DollarSign, Tag, User, Barcode, FileText, Repeat, Camera, Sparkles, CheckCircle2 } from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { parseBarcodeData, ParsedBarcodeResult } from '@/lib/barcodeUtils';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  billToEdit?: Bill | null;
}

export function BillModal({ isOpen, onClose, billToEdit }: BillModalProps) {
  const { addBill, editBill, categories } = useFinance();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState(0);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [barcode, setBarcode] = useState('');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');

  // Scanner de código de barras pela câmera
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [autoFillNotice, setAutoFillNotice] = useState<string | null>(null);

  const applyParsedBarcode = (result: ParsedBarcodeResult) => {
    if (result.barcode) {
      setBarcode(result.barcode);
    }
    if (result.amount && result.amount > 0) {
      setAmount(result.amount);
    }
    if (result.dueDate) {
      setDueDate(result.dueDate);
    }
    if (result.recipient) {
      setRecipient(result.recipient);
    }
    if (result.titleSuggestion && !title.trim()) {
      setTitle(result.titleSuggestion);
    }
    if (result.categoryKeyword) {
      const match = expenseCategories.find(
        (c) =>
          c.name.toLowerCase().includes(result.categoryKeyword!.toLowerCase()) ||
          c.id.toLowerCase().includes(result.categoryKeyword!.toLowerCase())
      );
      if (match) {
        setCategoryId(match.id);
      }
    }

    const filled: string[] = [];
    if (result.amount && result.amount > 0) filled.push('Valor');
    if (result.dueDate) filled.push('Vencimento');
    if (result.recipient) filled.push('Favorecido');
    if (result.titleSuggestion && !title.trim()) filled.push('Título');

    if (filled.length > 0) {
      setAutoFillNotice(`Preenchido: ${filled.join(', ')}`);
    } else {
      setAutoFillNotice('Código lido com sucesso!');
    }

    setTimeout(() => {
      setAutoFillNotice(null);
    }, 4500);
  };

  const handleBarcodeChange = (val: string) => {
    setBarcode(val);
    const digits = val.replace(/\D/g, '');
    if (digits.length === 44 || digits.length === 47 || digits.length === 48 || val.startsWith('000201')) {
      const parsed = parseBarcodeData(val);
      if (parsed.amount || parsed.dueDate || parsed.recipient) {
        if (parsed.amount && !amount) setAmount(parsed.amount);
        if (parsed.dueDate) setDueDate(parsed.dueDate);
        if (parsed.recipient && !recipient) setRecipient(parsed.recipient);
        if (parsed.titleSuggestion && !title.trim()) setTitle(parsed.titleSuggestion);
        if (parsed.categoryKeyword) {
          const match = expenseCategories.find(
            (c) =>
              c.name.toLowerCase().includes(parsed.categoryKeyword!.toLowerCase()) ||
              c.id.toLowerCase().includes(parsed.categoryKeyword!.toLowerCase())
          );
          if (match && !categoryId) setCategoryId(match.id);
        }
      }
    }
  };

  useEffect(() => {
    if (billToEdit) {
      setTitle(billToEdit.title);
      setAmount(billToEdit.amount);
      setDueDate(billToEdit.dueDate);
      setCategoryId(billToEdit.categoryId);
      setRecipient(billToEdit.recipient || '');
      setBarcode(billToEdit.barcode || '');
      setNotes(billToEdit.notes || '');
      setIsRecurring(!!billToEdit.isRecurring);
      setRecurrencePeriod(billToEdit.recurrencePeriod || 'monthly');
    } else {
      setTitle('');
      setAmount(0);
      setDueDate(new Date().toISOString().split('T')[0]);
      setRecipient('');
      setBarcode('');
      setNotes('');
      setIsRecurring(false);
      setRecurrencePeriod('monthly');
      const expenseCats = categories.filter((c) => c.type === 'expense' || c.type === 'both');
      if (expenseCats.length > 0) setCategoryId(expenseCats[0].id);
    }
  }, [billToEdit, categories, isOpen]);

  const expenseCategories = categories.filter((c) => c.type === 'expense' || c.type === 'both');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;
    if (!title.trim() || !categoryId || !dueDate) return;

    if (billToEdit) {
      editBill(billToEdit.id, {
        title,
        amount,
        dueDate,
        categoryId,
        recipient: recipient.trim() || undefined,
        barcode: barcode.trim() || undefined,
        notes: notes.trim() || undefined,
        isRecurring,
        recurrencePeriod: isRecurring ? recurrencePeriod : undefined,
      });
    } else {
      addBill({
        title,
        amount,
        dueDate,
        categoryId,
        recipient: recipient.trim() || undefined,
        barcode: barcode.trim() || undefined,
        notes: notes.trim() || undefined,
        isRecurring,
        recurrencePeriod: isRecurring ? recurrencePeriod : undefined,
      });
    }

    onClose();
  };

  return (
    <>
      <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={billToEdit ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
      subtitle={billToEdit ? 'Atualize as informações do boleto / conta' : 'Cadastre um boleto, fatura ou compromisso a pagar'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Título da Conta</label>
          <input
            type="text"
            placeholder="Ex: Aluguel, Conta de Luz, Fatura Cartão..."
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm"
          />
        </div>

        {/* Amount & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-zinc-400" /> Valor (R$)
            </label>
            <MoneyInput
              value={amount}
              onChange={setAmount}
              className="focus:border-amber-500"
              required
              autoFocus={!billToEdit}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Data de Vencimento
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Category & Beneficiary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-zinc-400" /> Categoria
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" /> Favorecido / Empresa (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Enel, Vivo, Banco Itaú..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-xs"
            />
          </div>
        </div>

        {/* Barcode */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5 text-zinc-400" /> Código de Barras / Linha Digitável (Opcional)
            </label>
            {autoFillNotice && (
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {autoFillNotice}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cole o código do boleto ou chave PIX aqui..."
              value={barcode}
              onChange={(e) => handleBarcodeChange(e.target.value)}
              className="flex-1 min-w-0 px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-xs font-mono"
            />
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-3.5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-500/50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
              title="Abrir câmera para escanear código de barras"
            >
              <Camera className="w-4 h-4" />
              <span>Escanear</span>
            </button>
          </div>
        </div>

        {/* Recurrence Toggle */}
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-amber-400" />
            <div>
              <p className="text-xs font-medium text-zinc-200">Conta Recorrente</p>
              <p className="text-[11px] text-zinc-400">Repete todo mês automaticamente</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="w-4 h-4 rounded text-amber-500 bg-zinc-900 border-zinc-700 focus:ring-amber-500 focus:ring-offset-zinc-900"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-zinc-400" /> Observações (Opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Detalhes sobre a fatura, desconto até o vencimento..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-xs resize-none"
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
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-950/40 transition-all"
          >
            {billToEdit ? 'Salvar Alterações' : 'Cadastrar Conta a Pagar'}
          </button>
        </div>
      </form>
    </Modal>

    <BarcodeScannerModal
      isOpen={isScannerOpen}
      onClose={() => setIsScannerOpen(false)}
      onScan={applyParsedBarcode}
    />
    </>
  );
}
