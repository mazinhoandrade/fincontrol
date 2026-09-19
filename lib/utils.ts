import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(valueInCents: number): string {
  const safeVal = Number.isFinite(valueInCents) ? valueInCents : 0;
  const value = safeVal / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatCentsToInput(cents: number): string {
  if (cents === 0) return '0,00';
  const isNeg = cents < 0;
  const abs = Math.abs(cents);
  const val = abs / 100;
  const formatted = val.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNeg ? `-${formatted}` : formatted;
}

export function parseInputToCents(value: string, allowNegative: boolean = false): number {
  if (!value) return 0;
  const isNeg = allowNegative && value.includes('-');
  const digits = value.replace(/\D/g, '');
  if (!digits) return 0;
  const cents = parseInt(digits, 10);
  return isNeg ? -cents : cents;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;
  return `${day}/${month}/${year}`;
}

export function getDaysDifference(dueDateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [year, month, day] = dueDateString.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function getDueDateStatus(dueDateString: string, status: string): {
  label: string;
  colorClass: string;
  isOverdue: boolean;
  isToday: boolean;
  daysDiff: number;
} {
  if (status === 'paid') {
    return {
      label: 'Paga',
      colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      isOverdue: false,
      isToday: false,
      daysDiff: 0,
    };
  }

  const daysDiff = getDaysDifference(dueDateString);

  if (daysDiff < 0) {
    const days = Math.abs(daysDiff);
    return {
      label: `Venceu há ${days} ${days === 1 ? 'dia' : 'dias'}`,
      colorClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      isOverdue: true,
      isToday: false,
      daysDiff,
    };
  }

  if (daysDiff === 0) {
    return {
      label: 'Vence hoje!',
      colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse',
      isOverdue: false,
      isToday: true,
      daysDiff,
    };
  }

  if (daysDiff === 1) {
    return {
      label: 'Vence amanhã',
      colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      isOverdue: false,
      isToday: false,
      daysDiff,
    };
  }

  if (daysDiff <= 7) {
    return {
      label: `Vence em ${daysDiff} dias`,
      colorClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      isOverdue: false,
      isToday: false,
      daysDiff,
    };
  }

  return {
    label: `Vence em ${formatDate(dueDateString)}`,
    colorClass: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    isOverdue: false,
    isToday: false,
    daysDiff,
  };
}

export function getCurrentMonthFormatted(): string {
  const date = new Date();
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
