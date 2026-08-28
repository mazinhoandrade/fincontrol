'use client';

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { formatCurrency } from '@/lib/utils';
import { CategoryIcon } from '../CategoryIcon';
import { PieChart, ArrowUpRight } from 'lucide-react';

export function CategoryChart() {
  const { transactions, categories, setActiveTab } = useFinance();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calculate expense amounts by category for current month or all time
  const categoryData = useMemo(() => {
    const expenseMap: Record<string, number> = {};
    let totalExpense = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    transactions.forEach((tx) => {
      if (tx.type !== 'expense') return;
      if (!tx.date) return;
      const [y, m] = tx.date.split('-').map(Number);
      if (y === currentYear && m - 1 === currentMonth) {
        expenseMap[tx.categoryId] = (expenseMap[tx.categoryId] || 0) + tx.amount;
        totalExpense += tx.amount;
      }
    });

    // If current month has no transactions, fallback to all expenses
    if (totalExpense === 0) {
      transactions.forEach((tx) => {
        if (tx.type !== 'expense') return;
        expenseMap[tx.categoryId] = (expenseMap[tx.categoryId] || 0) + tx.amount;
        totalExpense += tx.amount;
      });
    }

    const items = Object.entries(expenseMap)
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          id: catId,
          name: cat?.name || 'Outros',
          color: cat?.color || '#64748b',
          icon: cat?.icon || 'Tag',
          amount,
          percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return { items, totalExpense };
  }, [transactions, categories]);

  // Donut SVG Calculations
  const size = 200;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;
  const segments = categoryData.items.map((item) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativePercent / 100) * circumference);
    cumulativePercent += item.percentage;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-400" />
            Despesas por Categoria
          </h3>
          <p className="text-xs text-zinc-400">Distribuição dos gastos do mês</p>
        </div>
        <button
          onClick={() => setActiveTab('transactions')}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
        >
          Ver todas <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {categoryData.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-500 text-sm">
          <PieChart className="w-10 h-10 mb-2 opacity-40 stroke-1" />
          <p>Nenhuma despesa registrada ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Donut Chart */}
          <div className="md:col-span-5 flex justify-center items-center relative py-2">
            <div className="relative w-[180px] h-[180px] flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  className="stroke-zinc-800"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                {segments.map((seg, idx) => (
                  <circle
                    key={seg.id}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={hoveredIndex === idx ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                ))}
              </svg>
              {/* Center Content */}
              <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none px-2">
                <span className="text-[11px] font-medium text-zinc-400">Total</span>
                <span className="text-sm font-bold text-zinc-100 truncate max-w-[120px]">
                  {hoveredIndex !== null
                    ? formatCurrency(categoryData.items[hoveredIndex].amount)
                    : formatCurrency(categoryData.totalExpense)}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {hoveredIndex !== null
                    ? `${categoryData.items[hoveredIndex].percentage.toFixed(1)}%`
                    : `${categoryData.items.length} categorias`}
                </span>
              </div>
            </div>
          </div>

          {/* Category List Breakdown */}
          <div className="md:col-span-7 space-y-2.5">
            {categoryData.items.slice(0, 5).map((item, idx) => (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`p-2 rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer ${
                  hoveredIndex === idx ? 'bg-zinc-800/80 ring-1 ring-zinc-700' : 'hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                    style={{ backgroundColor: `${item.color}20`, color: item.color }}
                  >
                    <CategoryIcon name={item.icon} className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-zinc-200 truncate">{item.name}</p>
                    <div className="w-24 bg-zinc-800 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <p className="font-semibold text-zinc-100">{formatCurrency(item.amount)}</p>
                  <p className="text-[11px] text-zinc-400 font-mono">{item.percentage.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
