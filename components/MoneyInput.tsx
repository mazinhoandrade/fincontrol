'use client';

import React, { useRef, useEffect } from 'react';
import { cn, formatCentsToInput, parseInputToCents } from '@/lib/utils';

interface MoneyInputProps {
  id?: string;
  name?: string;
  value: number; // In integer cents (e.g. 1050 for R$ 10,50)
  onChange: (cents: number) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  allowNegative?: boolean;
}

export function MoneyInput({
  id,
  name,
  value,
  onChange,
  placeholder = '0,00',
  className,
  required = false,
  disabled = false,
  autoFocus = false,
  allowNegative = false,
}: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Formatted string representation for the input value
  const displayValue = formatCentsToInput(value);

  const setCursorToEnd = () => {
    if (inputRef.current) {
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  };

  useEffect(() => {
    if (inputRef.current && document.activeElement === inputRef.current) {
      setCursorToEnd();
    }
  }, [displayValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cents = parseInputToCents(rawVal, allowNegative);
    onChange(cents);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (allowNegative && (e.key === '-' || e.key === '+')) {
      e.preventDefault();
      onChange(e.key === '-' ? -Math.abs(value) : Math.abs(value));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (!pasted) return;

    let cents = 0;
    // Check if pasted value contains decimal indicator (comma or dot)
    if (pasted.includes(',') || (pasted.includes('.') && /\.\d{1,2}$/.test(pasted))) {
      const clean = pasted.replace(/[^\d.,-]/g, '');
      const isNeg = allowNegative && clean.startsWith('-');
      const separator = clean.includes(',') ? ',' : '.';
      const parts = clean.split(separator);
      const whole = parts[0].replace(/\D/g, '');
      const dec = (parts[1] || '').replace(/\D/g, '').padEnd(2, '0').slice(0, 2);
      cents = parseInt(whole + dec, 10) || 0;
      if (isNeg) cents = -cents;
    } else {
      const isNeg = allowNegative && pasted.startsWith('-');
      const digits = pasted.replace(/\D/g, '');
      cents = (parseInt(digits, 10) || 0) * 100;
      if (isNeg) cents = -cents;
    }

    onChange(cents);
  };

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 font-semibold text-xs select-none">
        R$
      </div>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onClick={setCursorToEnd}
        onFocus={setCursorToEnd}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          'w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-sm font-semibold transition-colors',
          className
        )}
      />
    </div>
  );
}
