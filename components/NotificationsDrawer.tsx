'use client';

import React from 'react';
import { useFinance } from '@/context/FinanceContext';
import { Bell, AlertTriangle, Clock, Calendar, Check, CheckCheck, X, CreditCard } from 'lucide-react';
import { NotificationItem, Bill } from '@/lib/types';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPayBill: (bill: Bill) => void;
}

export function NotificationsDrawer({
  isOpen,
  onClose,
  onPayBill,
}: NotificationsDrawerProps) {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    bills,
    setActiveTab,
  } = useFinance();

  if (!isOpen) return null;

  const handlePayClick = (billId?: string) => {
    if (!billId) return;
    const bill = bills.find((b) => b.id === billId);
    if (bill) {
      onPayBill(bill);
      onClose();
    }
  };

  const getNotifIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'due_today':
        return <Clock className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'due_soon':
        return <Calendar className="w-4 h-4 text-blue-400 shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-400 shrink-0" />;
    }
  };

  const getBgClass = (type: NotificationItem['type'], read: boolean) => {
    if (read) return 'bg-zinc-900/60 border-zinc-800/60 opacity-75';
    switch (type) {
      case 'overdue':
        return 'bg-rose-950/20 border-rose-900/40';
      case 'due_today':
        return 'bg-amber-950/20 border-amber-900/40';
      case 'due_soon':
        return 'bg-blue-950/20 border-blue-900/40';
      default:
        return 'bg-zinc-800/40 border-zinc-700/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/90 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Notificações & Lembretes
                {unreadNotificationsCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] bg-rose-500 text-white font-bold rounded-full">
                    {unreadNotificationsCount}
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400">Alertas de contas e vencimentos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        {notifications.length > 0 && (
          <div className="px-4 py-2.5 bg-zinc-950/60 border-b border-zinc-800/60 flex items-center justify-between text-xs">
            <span className="text-zinc-400">
              {notifications.length} {notifications.length === 1 ? 'lembrete ativo' : 'lembretes ativos'}
            </span>
            {unreadNotificationsCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Marcar lidas
              </button>
            )}
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16 text-zinc-500">
              <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="font-semibold text-zinc-300 text-sm">Tudo em dia!</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                Você não possui nenhuma conta vencida ou com vencimento nos próximos dias.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-xl border transition-all ${getBgClass(
                  notif.type,
                  notif.read
                )}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    {getNotifIcon(notif.type)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-zinc-100">{notif.title}</h4>
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{notif.message}</p>
                    </div>
                  </div>
                </div>

                {/* Notification Actions */}
                <div className="mt-3 pt-2.5 border-t border-zinc-800/50 flex items-center justify-between gap-2">
                  {notif.billId && (
                    <button
                      onClick={() => handlePayClick(notif.billId)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-sm"
                    >
                      <CreditCard className="w-3 h-3" /> Pagar Agora
                    </button>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    {!notif.read && (
                      <button
                        onClick={() => markNotificationAsRead(notif.id)}
                        className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        Marcar como lida
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/80 text-center">
          <button
            onClick={() => {
              setActiveTab('bills');
              onClose();
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Gerenciar todas as contas a pagar &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
