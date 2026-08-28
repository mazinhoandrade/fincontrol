'use client';

import React from 'react';
import { useFinance } from '@/context/FinanceContext';
import { ActiveTab } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ReceiptText,
  Landmark,
  Tags,
  Bell,
  Sparkles,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  onOpenNotifications: () => void;
}

export function Sidebar({ onOpenNotifications }: SidebarProps) {
  const {
    activeTab,
    setActiveTab,
    overdueBillsCount,
    unreadNotificationsCount,
    totalBalance,
    resetToDemoData,
  } = useFinance();

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'transactions',
      label: 'Transações',
      icon: <ArrowLeftRight className="w-5 h-5" />,
    },
    {
      id: 'bills',
      label: 'Contas a Pagar',
      icon: <ReceiptText className="w-5 h-5" />,
      badge: overdueBillsCount > 0 ? overdueBillsCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'accounts',
      label: 'Contas & Carteiras',
      icon: <Landmark className="w-5 h-5" />,
    },
  ];

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between p-4 shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-950/60">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black text-zinc-100 tracking-tight">FinControl</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.2 rounded font-bold">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Gestão Financeira Pessoal</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-indigo-400' : 'text-zinc-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      item.badgeColor || 'bg-indigo-600 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Notifications button shortcut */}
          <button
            onClick={onOpenNotifications}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 transition-all"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-zinc-400" />
              <span>Notificações</span>
            </div>
            {unreadNotificationsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Bottom Balance Card & Utilities */}
      <div className="space-y-3 pt-4 border-t border-zinc-800/80">
        {/* Quick balance card */}
        <div className="p-3.5 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <span>Saldo Total</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-base font-black text-zinc-100 font-mono mt-1">{formatCurrency(totalBalance)}</p>
        </div>

        {/* Demo reset */}
        <button
          onClick={() => {
            if (confirm('Deseja restaurar todos os dados para a demonstração inicial?')) {
              resetToDemoData();
            }
          }}
          className="w-full py-2 px-3 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurar Dados Demo
        </button>
      </div>
    </aside>
  );
}
