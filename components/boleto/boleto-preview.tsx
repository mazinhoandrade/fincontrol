'use client';

import React, { useState } from 'react';
import { BoletoData } from '@/lib/boleto/parser';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CheckCircle2,
  Barcode,
  Calendar,
  Building2,
  DollarSign,
  Copy,
  Check,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
  QrCode,
  Tag,
} from 'lucide-react';

interface BoletoPreviewProps {
  data: BoletoData;
  onConfirm: (data: BoletoData) => void;
  onRescan: () => void;
  onCancel?: () => void;
}

export function BoletoPreview({ data, onConfirm, onRescan, onCancel }: BoletoPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!data.formattedCode && !data.code) return;
    navigator.clipboard.writeText(data.formattedCode || data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const typeLabels = {
    boleto_bancario: 'Boleto Bancário',
    concessionaria: 'Conta de Concessionária / Arrecadação',
    pix: 'QR Code Pix',
    generic: 'Código de Barras Genérico',
  };

  return (
    <div className="space-y-4">
      {/* Header status */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            {data.type === 'pix' ? <QrCode className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Código Detectado com Sucesso!</h3>
            <p className="text-[11px] text-zinc-400">Verifique os dados interpretados antes de confirmar</p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/20">
          {typeLabels[data.type] || 'Boleto'}
        </span>
      </div>

      {/* Validation warning if invalid */}
      {!data.isValid && data.errorMessage && (
        <div className="p-3 bg-amber-950/40 border border-amber-600/40 rounded-xl flex items-start gap-2 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold">Aviso de Leitura</p>
            <p className="text-[11px] text-amber-300/90">{data.errorMessage}</p>
          </div>
        </div>
      )}

      {/* Extracted Data Card */}
      <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-4 space-y-3.5 shadow-inner">
        {/* Código / Linha Digitável */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5 text-zinc-500" />
              Código:
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copiar
                </>
              )}
            </button>
          </div>
          <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-200 break-all select-all">
            {data.formattedCode || data.code}
          </div>
        </div>

        {/* Row: Valor & Vencimento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Valor */}
          <div className="p-3 bg-zinc-900/90 border border-zinc-800/80 rounded-xl">
            <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Valor:
            </span>
            {data.amount && data.amount > 0 ? (
              <p className="text-xl font-black text-emerald-400 font-mono tracking-tight">
                {formatCurrency(data.amount)}
              </p>
            ) : (
              <p className="text-xs text-zinc-500 italic mt-1">Valor não predefinido no código</p>
            )}
          </div>

          {/* Vencimento */}
          <div className="p-3 bg-zinc-900/90 border border-zinc-800/80 rounded-xl">
            <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Vencimento:
            </span>
            {data.dueDate ? (
              <p className="text-xl font-black text-zinc-100 font-mono tracking-tight">
                {formatDate(data.dueDate)}
              </p>
            ) : (
              <p className="text-xs text-zinc-500 italic mt-1">Sem data de vencimento fixa</p>
            )}
          </div>
        </div>

        {/* Row: Favorecido / Banco & Título Sugerido */}
        {(data.recipient || data.titleSuggestion) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-900">
            {data.recipient && (
              <div>
                <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-zinc-500" />
                  Favorecido / Banco:
                </span>
                <p className="text-xs font-semibold text-zinc-200 mt-0.5">{data.recipient}</p>
              </div>
            )}

            {data.titleSuggestion && (
              <div>
                <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-zinc-500" />
                  Sugestão de Título:
                </span>
                <p className="text-xs font-semibold text-zinc-200 mt-0.5">{data.titleSuggestion}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onRescan}
          className="px-4 py-2.5 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Escanear novamente
        </button>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancelar
            </button>
          )}

          <button
            type="button"
            onClick={() => onConfirm(data)}
            className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-950/50 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <span>Confirmar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
