'use client';

import React, { useState } from 'react';
import { parseBoleto, BoletoData } from '@/lib/boleto/parser';
import { cleanDigits, validateBoletoCode } from '@/lib/boleto/validators';
import { Barcode, Clipboard, CheckCircle2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

interface BoletoInputProps {
  onBoletoReady: (data: BoletoData) => void;
}

export function BoletoInput({ onBoletoReady }: BoletoInputProps) {
  const [inputVal, setInputVal] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePasteClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputVal(text);
          processCode(text);
        }
      }
    } catch {
      setErrorMsg('Não foi possível acessar a área de transferência. Cole usando Ctrl+V.');
    }
  };

  const processCode = (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) {
      setErrorMsg('Por favor, informe ou cole o código do boleto.');
      return;
    }

    const validation = validateBoletoCode(trimmed);
    const parsed = parseBoleto(trimmed);

    if (validation.isValid || parsed.amount || parsed.dueDate) {
      setErrorMsg(null);
      onBoletoReady(parsed);
    } else {
      setErrorMsg(validation.message || 'Código inválido. Verifique os dígitos e tente novamente.');
    }
  };

  const handleChange = (val: string) => {
    setInputVal(val);
    setErrorMsg(null);

    const digits = cleanDigits(val);
    // Auto-processa quando atinge tamanho exato de linha digitável ou código de barras
    if (digits.length === 44 || digits.length === 47 || digits.length === 48 || val.startsWith('000201')) {
      const parsed = parseBoleto(val);
      if (parsed.isValid || parsed.amount || parsed.dueDate) {
        onBoletoReady(parsed);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processCode(inputVal);
  };

  const cleanLen = cleanDigits(inputVal).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Barcode className="w-4 h-4 text-amber-400" />
            Digite ou cole a Linha Digitável / Código de Barras
          </label>
          {cleanLen > 0 && (
            <span className="text-[11px] font-mono text-zinc-400">
              {cleanLen} {cleanLen === 1 ? 'dígito' : 'dígitos'}
            </span>
          )}
        </div>

        <div className="relative">
          <textarea
            rows={3}
            value={inputVal}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Ex: 23793.38128 60083.013528 56000.633040 1 84340000013642 ou código de 44 dígitos..."
            className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 font-mono text-xs focus:outline-none focus:border-amber-500 transition-colors resize-none pr-24"
            autoFocus
          />

          <button
            type="button"
            onClick={handlePasteClipboard}
            className="absolute right-2.5 top-2.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
            title="Colar da área de transferência"
          >
            <Clipboard className="w-3.5 h-3.5 text-amber-400" />
            Colar
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-rose-400 text-xs mt-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-xs text-zinc-400 space-y-1">
        <p className="font-semibold text-zinc-300 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Formatos aceitos:
        </p>
        <p className="text-[11px] text-zinc-400">
          • <strong>Boleto Bancário:</strong> Linha digitável (47 dígitos) ou código de barras (44 dígitos)
        </p>
        <p className="text-[11px] text-zinc-400">
          • <strong>Concessionárias:</strong> Água, luz, telefone, IPTU, gás (44 ou 48 dígitos)
        </p>
        <p className="text-[11px] text-zinc-400">
          • <strong>Pix Copia e Cola / QR Code:</strong> Começa com <code>000201...</code>
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-950/40 transition-all cursor-pointer active:scale-95"
        >
          <span>Interpretar Boleto</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
