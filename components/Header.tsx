'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFinance } from '@/context/FinanceContext';
import { useSession, signOut } from '@/lib/auth-client';
import { ActiveTab, TransactionType } from '@/lib/types';
import {
  Bell,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ReceiptText,
  Menu,
  X,
  Sparkles,
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  LogOut,
  Loader2,
} from 'lucide-react';
import { TransactionModal } from './modals/TransactionModal';
import { BillModal } from './modals/BillModal';

interface HeaderProps {
  onOpenNotifications: () => void;
}

export function Header({ onOpenNotifications }: HeaderProps) {
  const {
    activeTab,
    setActiveTab,
    unreadNotificationsCount,
    overdueBillsCount,
    isDbConnected,
  } = useFinance();

  const router = useRouter();
  const { data: session } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [defaultTxType, setDefaultTxType] = useState<TransactionType>('expense');
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  const userName = session?.user?.name || (session?.user?.email ? session.user.email.split('@')[0] : 'Usuário');
  const userEmail = session?.user?.email || '';
  const userInitial = (userName ? userName[0] : 'U').toUpperCase();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      router.replace('/login');
      router.refresh();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      router.replace('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getPageTitle = (tab: ActiveTab) => {
    switch (tab) {
      case 'dashboard':
        return 'Painel Geral';
      case 'transactions':
        return 'Transações & Categorias';
      case 'bills':
        return 'Contas a Pagar';
      case 'accounts':
        return 'Contas & Carteiras';
      default:
        return 'FinControl';
    }
  };

  const handleOpenTx = (type: TransactionType) => {
    setDefaultTxType(type);
    setIsTxModalOpen(true);
  };

  return (
    <>
      <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <span className="text-xs text-zinc-400 font-medium hidden sm:inline-block">FinControl &bull;</span>
            <span className="text-sm sm:text-base font-bold text-zinc-100 ml-1.5">{getPageTitle(activeTab)}</span>
          </div>
        </div>

        {/* Right: Actions, Notifications, Profile */}
        <div className="flex items-center gap-3">
          {/* Neon DB Status Badge */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] font-medium text-zinc-300">
            <span
              className={`w-2 h-2 rounded-full ${
                isDbConnected
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-zinc-400">Neon DB:</span>
            <span className={isDbConnected ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
              {isDbConnected ? 'Conectado' : 'Conectando...'}
            </span>
          </div>

          {/* Quick Add Buttons on Desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => handleOpenTx('expense')}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" /> - Despesa
            </button>
            <button
              onClick={() => handleOpenTx('income')}
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> + Receita
            </button>
          </div>

          {/* Notification Bell with Badge */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-colors"
            title="Lembretes de Vencimento"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
            <div className="flex items-center gap-2">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={userName}
                  className="w-8 h-8 rounded-full object-cover border border-zinc-700 shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm ring-1 ring-white/10 shrink-0">
                  {userInitial}
                </div>
              )}
              <div className="hidden lg:block text-left max-w-[130px]">
                <p className="text-xs font-semibold text-zinc-200 truncate" title={userName}>
                  {userName}
                </p>
                <p className="text-[10px] text-zinc-400 truncate" title={userEmail}>
                  {userEmail || 'Conectado'}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Sair da conta"
              aria-label="Sair da conta"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-rose-400 bg-zinc-900/60 hover:bg-rose-500/10 border border-zinc-800 hover:border-rose-500/30 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline text-xs">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
          />

          <div className="relative w-64 bg-zinc-950 border-r border-zinc-800 p-4 flex flex-col justify-between h-full z-10 animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-zinc-100">FinControl</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-4 space-y-1">
                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                    activeTab === 'dashboard'
                      ? 'bg-indigo-600/15 text-indigo-400'
                      : 'text-zinc-400 hover:bg-zinc-900'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>

                <button
                  onClick={() => {
                    setActiveTab('transactions');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                    activeTab === 'transactions'
                      ? 'bg-indigo-600/15 text-indigo-400'
                      : 'text-zinc-400 hover:bg-zinc-900'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Transações
                </button>

                <button
                  onClick={() => {
                    setActiveTab('bills');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${
                    activeTab === 'bills'
                      ? 'bg-indigo-600/15 text-indigo-400'
                      : 'text-zinc-400 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ReceiptText className="w-4 h-4" />
                    Contas a Pagar
                  </div>
                  {overdueBillsCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                      {overdueBillsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setActiveTab('accounts');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                    activeTab === 'accounts'
                      ? 'bg-indigo-600/15 text-indigo-400'
                      : 'text-zinc-400 hover:bg-zinc-900'
                  }`}
                >
                  <Landmark className="w-4 h-4" />
                  Contas & Carteiras
                </button>
              </nav>
            </div>

            {/* Mobile Drawer Bottom: User Profile & Logout */}
            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <div className="flex items-center gap-3 px-1">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={userName}
                    className="w-9 h-9 rounded-full object-cover border border-zinc-700 shadow-sm"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm ring-1 ring-white/10 shrink-0">
                    {userInitial}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-zinc-100 truncate">{userName}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{userEmail || 'Conectado'}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                <span>Sair da conta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        defaultType={defaultTxType}
      />
      <BillModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
      />
    </>
  );
}
