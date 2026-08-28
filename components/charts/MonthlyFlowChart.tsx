'use client';

import React, { useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

export function MonthlyFlowChart() {
  const { transactions } = useFinance();

  // Compute stats for the last 6 months
  const monthlyData = useMemo(() => {
    const result: {
      monthLabel: string;
      yearMonth: string;
      income: number;
      expense: number;
    }[] = [];

    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const monthStr = String(m + 1).padStart(2, '0');
      const yearMonth = `${y}-${monthStr}`;

      const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

      let income = 0;
      let expense = 0;

      transactions.forEach((tx) => {
        if (!tx.date) return;
        if (tx.date.startsWith(yearMonth)) {
          if (tx.type === 'income') income += tx.amount;
          if (tx.type === 'expense') expense += tx.amount;
        }
      });

      result.push({
        monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        yearMonth,
        income,
        expense,
      });
    }

    return result;
  }, [transactions]);

  // Find max value to normalize bar heights
  const maxVal = useMemo(() => {
    let max = 1000;
    monthlyData.forEach((d) => {
      if (d.income > max) max = d.income;
      if (d.expense > max) max = d.expense;
    });
    return max * 1.15; // padding
  }, [monthlyData]);

  const currentMonthData = monthlyData[monthlyData.length - 1];
  const netSavings = currentMonthData.income - currentMonthData.expense;

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            Fluxo Financeiro Mensal
          </h3>
          <p className="text-xs text-zinc-400">Comparativo de receitas e despesas</p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block shadow-sm"></span>
            <span className="text-zinc-300">Receitas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500 inline-block shadow-sm"></span>
            <span className="text-zinc-300">Despesas</span>
          </div>
        </div>
      </div>

      {/* Bars Chart Area */}
      <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-zinc-800/80">
        {monthlyData.map((item) => {
          const incomeHeight = Math.max(6, Math.min(100, (item.income / maxVal) * 100));
          const expenseHeight = Math.max(6, Math.min(100, (item.expense / maxVal) * 100));

          return (
            <div key={item.yearMonth} className="flex-1 flex flex-col items-center h-full justify-end group relative">
              {/* Tooltip */}
              <div className="absolute -top-14 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-20 bg-zinc-950 border border-zinc-700 shadow-xl text-zinc-100 text-[11px] p-2 rounded-lg whitespace-nowrap flex flex-col gap-0.5">
                <span className="font-bold text-zinc-200">{item.monthLabel}</span>
                <span className="text-emerald-400">Rec: {formatCurrency(item.income)}</span>
                <span className="text-rose-400">Desp: {formatCurrency(item.expense)}</span>
              </div>

              {/* Bars container */}
              <div className="w-full flex justify-center items-end gap-1.5 h-full">
                {/* Income Bar */}
                <div
                  className="w-3.5 sm:w-5 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md transition-all duration-500 hover:brightness-110 shadow-sm shadow-emerald-950"
                  style={{ height: `${incomeHeight}%` }}
                />
                {/* Expense Bar */}
                <div
                  className="w-3.5 sm:w-5 bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-md transition-all duration-500 hover:brightness-110 shadow-sm shadow-rose-950"
                  style={{ height: `${expenseHeight}%` }}
                />
              </div>

              {/* Month Label */}
              <span className="text-[11px] text-zinc-400 font-medium mt-2 group-hover:text-zinc-200 transition-colors">
                {item.monthLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="mt-4 pt-3 flex items-center justify-between text-xs text-zinc-400">
        <span>Balanço deste mês:</span>
        <span
          className={`font-semibold flex items-center gap-1 ${
            netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {netSavings >= 0 ? (
            <>
              <TrendingUp className="w-3.5 h-3.5" /> +{formatCurrency(netSavings)}
            </>
          ) : (
            <>
              <TrendingDown className="w-3.5 h-3.5" /> {formatCurrency(netSavings)}
            </>
          )}
        </span>
      </div>
    </div>
  );
}
