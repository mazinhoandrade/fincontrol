'use client';

import React, { useState } from 'react';
import { FinanceProvider, useFinance } from '@/context/FinanceContext';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DashboardView } from '@/components/DashboardView';
import { TransactionsView } from '@/components/TransactionsView';
import { BillsView } from '@/components/BillsView';
import { AccountsView } from '@/components/AccountsView';
import { NotificationsDrawer } from '@/components/NotificationsDrawer';
import { PayBillModal } from '@/components/modals/PayBillModal';
import { Bill } from '@/lib/types';

function MainApp() {
  const { activeTab } = useFinance();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [billToPay, setBillToPay] = useState<Bill | null>(null);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'transactions':
        return <TransactionsView />;
      case 'bills':
        return <BillsView />;
      case 'accounts':
        return <AccountsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar onOpenNotifications={() => setIsNotificationsOpen(true)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenNotifications={() => setIsNotificationsOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          {renderActiveView()}
        </main>
      </div>

      {/* Notifications Drawer */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onPayBill={(bill) => setBillToPay(bill)}
      />

      {/* Quick Pay Modal triggered anywhere (e.g. from notifications) */}
      <PayBillModal
        isOpen={!!billToPay}
        onClose={() => setBillToPay(null)}
        bill={billToPay}
      />
    </div>
  );
}

export default function Home() {
  return (
    <FinanceProvider>
      <MainApp />
    </FinanceProvider>
  );
}
